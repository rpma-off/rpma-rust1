//! Tests for client CRUD operations.
//!
//! Covers service-layer behavior, auth enforcement, and database isolation.
//!
//! Run with: `cargo test --test client_commands_test -- --nocapture`

#[path = "../harness/mod.rs"]
mod harness;

use harness::app::TestApp;
use harness::fixtures;
use rpma_ppf_intervention::domains::clients::domain::models::{CreateClientRequest, CustomerType};
use rpma_ppf_intervention::shared::auth_middleware::AuthMiddleware;
use rpma_ppf_intervention::shared::context::session_resolver::resolve_request_context;
use rpma_ppf_intervention::shared::contracts::auth::UserRole;
use rpma_ppf_intervention::shared::ipc::errors::AppError;
use rusqlite::params;

// ── 1. Service-layer tests ────────────────────────────────────────────────────

#[tokio::test]
async fn test_create_client_valid_request_succeeds() {
    let app = TestApp::new().await;
    let req = fixtures::client_fixture("Alice Corp");

    let result = app.state.client_service.create_client(req, "test-user").await;

    assert!(result.is_ok(), "valid create should succeed: {:?}", result.err());
    let client = result.unwrap();
    assert_eq!(client.name, "Alice Corp");
    assert_eq!(client.email.as_deref(), Some("alice-corp@test.rpma"));
    assert_eq!(client.created_by.as_deref(), Some("test-user"));
    assert!(client.deleted_at.is_none(), "new client should not be soft-deleted");
}

#[tokio::test]
async fn test_create_client_duplicate_email_returns_conflict() {
    let app = TestApp::new().await;
    let shared_email = "duplicate@test.rpma";

    let req1 = CreateClientRequest {
        name: "First Client".to_string(),
        email: Some(shared_email.to_string()),
        customer_type: CustomerType::Individual,
        phone: None,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: None,
        contact_person: None,
        notes: None,
        tags: None,
    };
    let req2 = CreateClientRequest {
        name: "Second Client".to_string(),
        ..req1.clone()
    };

    let first = app.state.client_service.create_client(req1, "user-1").await;
    assert!(first.is_ok(), "first client must be created successfully");

    let second = app.state.client_service.create_client(req2, "user-2").await;
    assert!(second.is_err(), "duplicate email should be rejected");
    let err = second.unwrap_err();
    assert!(
        err.to_lowercase().contains("already exists"),
        "error must mention duplicate: {err}"
    );
}

#[tokio::test]
async fn test_create_client_business_type_missing_company_name_returns_validation_error() {
    let app = TestApp::new().await;

    let req = CreateClientRequest {
        name: "Acme Inc".to_string(),
        email: Some("acme@test.rpma".to_string()),
        customer_type: CustomerType::Business,
        company_name: None, // required for Business — intentionally omitted
        contact_person: Some("Jane Smith".to_string()),
        phone: None,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        notes: None,
        tags: None,
    };

    let result = app.state.client_service.create_client(req, "user-1").await;

    assert!(result.is_err(), "missing company_name for Business must fail");
    let err = result.unwrap_err();
    assert!(
        err.to_lowercase().contains("company name"),
        "error should mention company name: {err}"
    );
}

/// Documents current service behavior: the ClientService does not block
/// soft-deletion when active tasks exist.  The guard lives in
/// `ClientValidationService::validate_client_deletion` but is not wired
/// into the service delete path.  If that changes, this test will catch
/// the regression.
#[tokio::test]
async fn test_soft_delete_client_with_active_tasks_succeeds_in_service() {
    let app = TestApp::new().await;
    let admin_id = "admin-user";

    let client = app
        .state
        .client_service
        .create_client(fixtures::client_fixture("Client With Tasks"), admin_id)
        .await
        .expect("client creation must succeed");

    // Create a Pending task associated with this client.
    let mut task_req = fixtures::task_fixture("ACTIVE-001");
    task_req.client_id = Some(client.id.clone());
    app.state
        .task_service
        .create_task_async(task_req, admin_id)
        .await
        .expect("task creation must succeed");

    // Soft-delete should succeed because the service has no active-task guard.
    let delete_result = app
        .state
        .client_service
        .delete_client(&client.id, admin_id)
        .await;

    assert!(
        delete_result.is_ok(),
        "service-layer deletion with active tasks should succeed (no guard): {:?}",
        delete_result.err()
    );

    // Confirm the client is no longer visible through the service.
    let found = app
        .state
        .client_service
        .get_client(&client.id)
        .await
        .expect("get_client must not return an error");
    assert!(found.is_none(), "soft-deleted client should not be returned by get_client");
}

#[tokio::test]
async fn test_restore_deleted_client_succeeds() {
    let app = TestApp::new().await;
    let admin_id = "admin-user";

    // 1. Create and soft-delete a client.
    let client = app
        .state
        .client_service
        .create_client(fixtures::client_fixture("Restore Me"), admin_id)
        .await
        .expect("client creation must succeed");

    app.state
        .client_service
        .delete_client(&client.id, admin_id)
        .await
        .expect("soft-delete must succeed");

    // 2. Confirm deletion is visible through the service.
    let after_delete = app
        .state
        .client_service
        .get_client(&client.id)
        .await
        .expect("get_client must not error");
    assert!(after_delete.is_none(), "client should be invisible after soft-delete");

    // 3. Restore: clear deleted_at directly in the DB (mirrors the trash-domain restore path).
    app.db
        .execute(
            "UPDATE clients SET deleted_at = NULL, deleted_by = NULL WHERE id = ?",
            params![client.id],
        )
        .expect("restore UPDATE must succeed");

    // 4. Client must be visible again through the service.
    let after_restore = app
        .state
        .client_service
        .get_client(&client.id)
        .await
        .expect("get_client must not error after restore");
    assert!(after_restore.is_some(), "restored client must be returned by get_client");
    assert_eq!(after_restore.unwrap().name, "Restore Me");
}

#[tokio::test]
async fn test_search_clients_fts_returns_matching_results() {
    let app = TestApp::new().await;
    let admin_id = "search-user";

    // Seed two clients with distinct names.
    app.state
        .client_service
        .create_client(fixtures::client_fixture("Zephyr Motors"), admin_id)
        .await
        .expect("first client must be created");
    app.state
        .client_service
        .create_client(fixtures::client_fixture("Apex Detailing"), admin_id)
        .await
        .expect("second client must be created");

    // Search by a unique prefix present only in the first client's name.
    let results = app
        .state
        .client_service
        .search_clients("Zephyr", 1, 10)
        .await
        .expect("search must not error");

    assert_eq!(results.len(), 1, "search should return exactly one match");
    assert_eq!(
        results[0].name, "Zephyr Motors",
        "returned client should be the one matching the search term"
    );

    // Ensure a search for the second client's prefix does not leak unrelated entries.
    let apex_results = app
        .state
        .client_service
        .search_clients("Apex", 1, 10)
        .await
        .expect("search must not error");

    assert!(
        apex_results.iter().all(|c| c.name.contains("Apex")),
        "only Apex clients should appear in Apex search results"
    );
}

// ── 2. Auth tests ─────────────────────────────────────────────────────────────

/// Without an active session in the store, the session resolver must return
/// `AppError::Authentication`.  This mirrors what IPC handlers experience when
/// the frontend invokes a command before logging in.
#[tokio::test]
async fn test_client_crud_no_session_returns_auth_error() {
    let app = TestApp::new().await;
    // Explicitly ensure the session store is empty.
    app.clear_session();

    let result = resolve_request_context(&app.state, None, &None);

    assert!(result.is_err(), "missing session must produce an error");
    assert!(
        matches!(result.unwrap_err(), AppError::Authentication(_)),
        "error must be Authentication, not another variant"
    );
}

/// ADR-007: Viewers are read-only.  The auth middleware must deny `create`,
/// `update`, and `delete` operations for the Viewer role.
#[test]
fn test_viewer_cannot_create_client() {
    assert!(
        !AuthMiddleware::can_perform_client_operation(&UserRole::Viewer, "create"),
        "Viewer must not be allowed to create clients"
    );
}

#[test]
fn test_viewer_cannot_update_client() {
    assert!(
        !AuthMiddleware::can_perform_client_operation(&UserRole::Viewer, "update"),
        "Viewer must not be allowed to update clients"
    );
}

#[test]
fn test_viewer_cannot_delete_client() {
    assert!(
        !AuthMiddleware::can_perform_client_operation(&UserRole::Viewer, "delete"),
        "Viewer must not be allowed to delete clients"
    );
}

#[test]
fn test_viewer_can_read_clients() {
    assert!(
        AuthMiddleware::can_perform_client_operation(&UserRole::Viewer, "read"),
        "Viewer must be allowed to read clients"
    );
}

// ── 3. Database isolation assertion ──────────────────────────────────────────

/// A create that fails validation must leave the `clients` table completely
/// unchanged — no partial rows, no side-effects.
#[tokio::test]
async fn test_failed_create_does_not_persist_partial_client() {
    let app = TestApp::new().await;

    // Count rows before the failed attempt.
    let before: i64 = app
        .db
        .query_single_value("SELECT COUNT(*) FROM clients", [])
        .expect("count query must succeed");

    // Attempt to create a client with an empty name (guaranteed validation failure).
    let bad_req = CreateClientRequest {
        name: "".to_string(), // invalid — name is required
        email: Some("nopersist@test.rpma".to_string()),
        customer_type: CustomerType::Individual,
        phone: None,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: None,
        contact_person: None,
        notes: None,
        tags: None,
    };

    let result = app.state.client_service.create_client(bad_req, "user-1").await;
    assert!(result.is_err(), "invalid create must return an error");

    // Row count must remain identical.
    let after: i64 = app
        .db
        .query_single_value("SELECT COUNT(*) FROM clients", [])
        .expect("count query must succeed");

    assert_eq!(
        before, after,
        "failed create must not persist any rows (before={before}, after={after})"
    );
}
