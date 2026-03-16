//! Domain invariant tests.
//!
//! Verifies that business rules, validation constraints, and state-machine
//! transitions are correctly enforced end-to-end through the application
//! service layer.
//!
//! Run with:
//! ```
//! cd src-tauri && cargo test --test domain_invariants -- --nocapture
//! ```
//!
//! # Invariant categories
//!
//! | Marker | Meaning |
//! |--------|---------|
//! | DOMAIN | Pure business rule, may or may not touch DB |
//! | APPLICATION | Orchestration / cross-cutting rule |
//! | PERSISTENCE | Verified against the in-memory SQLite DB |

mod harness;

// ── Task invariants ──────────────────────────────────────────────────────────

mod task_invariants {
    use rpma_ppf_intervention::shared::ipc::errors::AppError;
    use rpma_ppf_intervention::shared::services::cross_domain::{CreateTaskRequest, TaskStatus};

    use crate::harness::{app::TestApp, fixtures};

    // ── helpers ──────────────────────────────────────────────────────────────

    fn valid_task(plate: &str) -> CreateTaskRequest {
        fixtures::task_fixture(plate)
    }

    // ── DOMAIN: creation validation ──────────────────────────────────────────

    /// VALID CASE — fully populated request succeeds.
    #[tokio::test]
    async fn test_create_task_valid_request_succeeds() {
        let app = TestApp::new().await;
        let result = app
            .state
            .task_service
            .create_task_async(valid_task("INV-001"), "test-user")
            .await;

        assert!(result.is_ok(), "expected Ok, got: {:?}", result);
        let task = result.unwrap();
        assert_eq!(task.vehicle_plate.as_deref(), Some("INV-001"));
    }

    /// INVALID CASE — empty `vehicle_plate` must return `Validation`.
    #[tokio::test]
    async fn test_create_task_empty_vehicle_plate_returns_validation_error() {
        let app = TestApp::new().await;
        let mut req = valid_task("INV-PLATE");
        req.vehicle_plate = "".to_string();

        let err = app
            .state
            .task_service
            .create_task_async(req, "test-user")
            .await
            .unwrap_err();

        assert!(
            matches!(err, AppError::Validation(_)),
            "expected Validation, got: {:?}",
            err
        );
    }

    /// EDGE CASE — whitespace-only `vehicle_plate` is also invalid.
    #[tokio::test]
    async fn test_create_task_whitespace_vehicle_plate_returns_validation_error() {
        let app = TestApp::new().await;
        let mut req = valid_task("INV-PLATE2");
        req.vehicle_plate = "   ".to_string();

        let err = app
            .state
            .task_service
            .create_task_async(req, "test-user")
            .await
            .unwrap_err();

        assert!(
            matches!(err, AppError::Validation(_)),
            "expected Validation, got: {:?}",
            err
        );
    }

    /// INVALID CASE — empty `vehicle_model` must return `Validation`.
    #[tokio::test]
    async fn test_create_task_empty_vehicle_model_returns_validation_error() {
        let app = TestApp::new().await;
        let mut req = valid_task("INV-MODEL");
        req.vehicle_model = "".to_string();

        let err = app
            .state
            .task_service
            .create_task_async(req, "test-user")
            .await
            .unwrap_err();

        assert!(
            matches!(err, AppError::Validation(_)),
            "expected Validation, got: {:?}",
            err
        );
    }

    /// EDGE CASE — empty `ppf_zones` list must return `Validation`.
    #[tokio::test]
    async fn test_create_task_empty_ppf_zones_returns_validation_error() {
        let app = TestApp::new().await;
        let mut req = valid_task("INV-ZONES");
        req.ppf_zones = vec![];

        let err = app
            .state
            .task_service
            .create_task_async(req, "test-user")
            .await
            .unwrap_err();

        assert!(
            matches!(err, AppError::Validation(_)),
            "expected Validation, got: {:?}",
            err
        );
    }

    // ── DOMAIN: status-machine transitions ───────────────────────────────────

    /// VALID CASE — `Pending → InProgress` is an allowed transition.
    #[tokio::test]
    async fn test_status_transition_pending_to_in_progress_succeeds() {
        let app = TestApp::new().await;
        let now = chrono::Utc::now().timestamp_millis();
        app.db
            .execute(
                "INSERT OR IGNORE INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8)",
                rusqlite::params![
                    "test-user-Admin",
                    "test-admin@rpma.test",
                    "test-admin",
                    "test-password-hash",
                    "Test Admin",
                    "admin",
                    now,
                    now
                ],
            )
            .expect("seed actor user for status transition history");
        let task = app
            .state
            .task_service
            .create_task_async(valid_task("SM-001"), "test-user")
            .await
            .expect("task creation must succeed");

        let result = app.state.task_service.transition_status(
            &task.id,
            "in_progress",
            None,
            "test-user-Admin",
        );

        assert!(
            result.is_ok(),
            "Pending→InProgress must be allowed; got: {:?}",
            result
        );
        let updated = result.unwrap();
        assert_eq!(updated.status, TaskStatus::InProgress);

        let changed_by: String = app
            .db
            .query_single_value(
                "SELECT changed_by FROM task_history WHERE task_id = ?1 ORDER BY changed_at DESC LIMIT 1",
                [task.id.as_str()],
            )
            .expect("status transition should persist actor in task_history");
        assert_eq!(changed_by, "test-user-Admin");
    }

    /// INVALID CASE — `Completed → InProgress` violates the state machine.
    #[tokio::test]
    async fn test_status_transition_completed_to_in_progress_fails() {
        let app = TestApp::new().await;
        let task = app
            .state
            .task_service
            .create_task_async(valid_task("SM-002"), "test-user")
            .await
            .expect("task creation must succeed");

        app.state
            .task_service
            .transition_status(&task.id, "in_progress", None, "test-user-Admin")
            .expect("Pending→InProgress must succeed");
        app.state
            .task_service
            .transition_status(&task.id, "completed", None, "test-user-Admin")
            .expect("InProgress→Completed must succeed");

        let err = app
            .state
            .task_service
            .transition_status(&task.id, "in_progress", None, "test-user-Admin")
            .unwrap_err();

        assert!(
            matches!(err, AppError::TaskInvalidTransition(_)),
            "expected TaskInvalidTransition, got: {:?}",
            err
        );
    }

    /// EDGE CASE — transitioning to the same status must be rejected.
    #[tokio::test]
    async fn test_status_transition_to_same_status_fails() {
        let app = TestApp::new().await;
        let task = app
            .state
            .task_service
            .create_task_async(valid_task("SM-003"), "test-user")
            .await
            .expect("task creation must succeed");

        let err = app
            .state
            .task_service
            .transition_status(&task.id, "pending", None, "test-user-Admin")
            .unwrap_err();

        assert!(
            matches!(
                err,
                AppError::TaskInvalidTransition(_) | AppError::Validation(_)
            ),
            "expected TaskInvalidTransition or Validation for same-status, got: {:?}",
            err
        );
    }

    /// PERSISTENCE — `Completed → Archived` is the only exit from Completed.
    #[tokio::test]
    async fn test_status_transition_completed_to_archived_succeeds() {
        let app = TestApp::new().await;
        let task = app
            .state
            .task_service
            .create_task_async(valid_task("SM-004"), "test-user")
            .await
            .expect("task creation must succeed");

        app.state
            .task_service
            .transition_status(&task.id, "in_progress", None, "test-user-Admin")
            .expect("Pending→InProgress");
        app.state
            .task_service
            .transition_status(&task.id, "completed", None, "test-user-Admin")
            .expect("InProgress→Completed");

        let archived = app
            .state
            .task_service
            .transition_status(&task.id, "archived", None, "test-user-Admin")
            .expect("Completed→Archived must be allowed");

        assert_eq!(archived.status, TaskStatus::Archived);
    }

    /// PERSISTENCE — `Archived` is a terminal state; no outgoing transitions.
    #[tokio::test]
    async fn test_status_transition_from_archived_is_forbidden() {
        let app = TestApp::new().await;
        let task = app
            .state
            .task_service
            .create_task_async(valid_task("SM-005"), "test-user")
            .await
            .expect("task creation must succeed");

        app.state
            .task_service
            .transition_status(&task.id, "in_progress", None, "test-user-Admin")
            .expect("Pending→InProgress");
        app.state
            .task_service
            .transition_status(&task.id, "completed", None, "test-user-Admin")
            .expect("InProgress→Completed");
        app.state
            .task_service
            .transition_status(&task.id, "archived", None, "test-user-Admin")
            .expect("Completed→Archived");

        let err = app
            .state
            .task_service
            .transition_status(&task.id, "pending", None, "test-user-Admin")
            .unwrap_err();

        assert!(
            matches!(err, AppError::TaskInvalidTransition(_)),
            "expected TaskInvalidTransition from Archived, got: {:?}",
            err
        );
    }

    /// PERSISTENCE — `Cancelled` is terminal; no outgoing transitions.
    #[tokio::test]
    async fn test_status_transition_from_cancelled_is_forbidden() {
        let app = TestApp::new().await;
        let task = app
            .state
            .task_service
            .create_task_async(valid_task("SM-006"), "test-user")
            .await
            .expect("task creation must succeed");

        app.state
            .task_service
            .transition_status(&task.id, "cancelled", None, "test-user-Admin")
            .expect("Pending→Cancelled must be allowed");

        let err = app
            .state
            .task_service
            .transition_status(&task.id, "pending", None, "test-user-Admin")
            .unwrap_err();

        assert!(
            matches!(err, AppError::TaskInvalidTransition(_)),
            "expected TaskInvalidTransition from Cancelled, got: {:?}",
            err
        );
    }

    /// PERSISTENCE — failed creation leaves the DB row count unchanged.
    #[tokio::test]
    async fn test_create_task_failure_leaves_db_unchanged() {
        let app = TestApp::new().await;

        let count_before: i64 = app
            .db
            .query_single_value("SELECT COUNT(*) FROM tasks", [])
            .expect("count tasks");

        let mut req = valid_task("DB-NOOP");
        req.vehicle_plate = "".to_string(); // force validation failure

        let _ = app
            .state
            .task_service
            .create_task_async(req, "test-user")
            .await;

        let count_after: i64 = app
            .db
            .query_single_value("SELECT COUNT(*) FROM tasks", [])
            .expect("count tasks after failed attempt");

        assert_eq!(
            count_before, count_after,
            "failed task creation must not write any row"
        );
    }

    /// PERSISTENCE — soft-deleted task is no longer retrievable.
    #[tokio::test]
    async fn test_soft_deleted_task_is_not_retrievable() {
        let app = TestApp::new().await;

        let task = app
            .state
            .task_service
            .create_task_async(valid_task("DEL-001"), "test-user")
            .await
            .expect("task creation must succeed");

        app.state
            .task_service
            .delete_task_async(&task.id, "test-user")
            .await
            .expect("soft-delete must succeed");

        let found = app
            .state
            .task_service
            .get_task_async(&task.id)
            .await
            .expect("query must not fail");

        assert!(
            found.is_none(),
            "soft-deleted task must not be returned by get_task_async"
        );
    }
}

// ── Quote invariants ─────────────────────────────────────────────────────────

mod quote_invariants {
    use rpma_ppf_intervention::shared::services::cross_domain::{
        CreateClientRequest, CreateQuoteItemRequest, CreateQuoteRequest, CustomerType,
        QuoteItemKind, QuoteStatus, UpdateQuoteRequest, UserRole,
    };

    use crate::harness::app::TestApp;

    // ── helpers ──────────────────────────────────────────────────────────────

    async fn create_client(app: &TestApp) -> String {
        let req = CreateClientRequest {
            name: "Quote Test Client".to_string(),
            email: Some("quote-test@rpma.test".to_string()),
            phone: None,
            customer_type: CustomerType::Individual,
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
        app.state
            .client_service
            .create_client(req, "test-user")
            .await
            .expect("client creation must succeed for quote tests")
            .id
    }

    fn valid_quote_req(client_id: &str) -> CreateQuoteRequest {
        CreateQuoteRequest {
            client_id: client_id.to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![],
        }
    }

    fn labour_item() -> CreateQuoteItemRequest {
        CreateQuoteItemRequest {
            kind: QuoteItemKind::Labor,
            label: "PPF Installation".to_string(),
            description: None,
            qty: 1.0,
            unit_price: 50000, // 500.00 in cents
            tax_rate: None,
            material_id: None,
            position: None,
        }
    }

    // ── DOMAIN: creation validation ──────────────────────────────────────────

    /// VALID CASE — quote with valid client ID creates as Draft.
    #[tokio::test]
    async fn test_create_quote_valid_client_id_creates_draft() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;

        let result = app.state.quote_service.create_quote(
            valid_quote_req(&client_id),
            "test-user",
            &UserRole::Admin,
        );

        assert!(result.is_ok(), "expected Ok, got: {:?}", result);
        assert_eq!(result.unwrap().status, QuoteStatus::Draft);
    }

    /// INVALID CASE — empty `client_id` must be rejected.
    #[tokio::test]
    async fn test_create_quote_empty_client_id_returns_error() {
        let app = TestApp::new().await;

        let err = app
            .state
            .quote_service
            .create_quote(valid_quote_req(""), "test-user", &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("client"),
            "expected client_id validation error, got: {}",
            err
        );
    }

    /// EDGE CASE — whitespace-only `client_id` is also invalid.
    #[tokio::test]
    async fn test_create_quote_whitespace_client_id_returns_error() {
        let app = TestApp::new().await;

        let err = app
            .state
            .quote_service
            .create_quote(valid_quote_req("   "), "test-user", &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("client"),
            "expected client_id validation error, got: {}",
            err
        );
    }

    // ── DOMAIN: item validation ──────────────────────────────────────────────

    /// INVALID CASE — item with empty label must be rejected.
    #[tokio::test]
    async fn test_add_item_empty_label_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation must succeed");

        let mut bad_item = labour_item();
        bad_item.label = "".to_string();

        let err = app
            .state
            .quote_service
            .add_item(&quote.id, bad_item, &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("label"),
            "expected label validation error, got: {}",
            err
        );
    }

    /// EDGE CASE — item with zero quantity must be rejected.
    #[tokio::test]
    async fn test_add_item_zero_qty_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation must succeed");

        let mut bad_item = labour_item();
        bad_item.qty = 0.0;

        let err = app
            .state
            .quote_service
            .add_item(&quote.id, bad_item, &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("quantity") || err.to_lowercase().contains("qty"),
            "expected quantity validation error, got: {}",
            err
        );
    }

    /// EDGE CASE — item with negative quantity must be rejected.
    #[tokio::test]
    async fn test_add_item_negative_qty_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation must succeed");

        let mut bad_item = labour_item();
        bad_item.qty = -1.0;

        let err = app
            .state
            .quote_service
            .add_item(&quote.id, bad_item, &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("quantity") || err.to_lowercase().contains("qty"),
            "expected negative quantity error, got: {}",
            err
        );
    }

    // ── DOMAIN: send transitions ─────────────────────────────────────────────

    /// VALID CASE — Draft quote with items and non-zero total can be sent.
    #[tokio::test]
    async fn test_mark_sent_draft_with_items_succeeds() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");
        app.state
            .quote_service
            .add_item(&quote.id, labour_item(), &UserRole::Admin)
            .expect("add item");

        let result = app
            .state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin);

        assert!(result.is_ok(), "expected Ok, got: {:?}", result);
        assert_eq!(result.unwrap().status, QuoteStatus::Sent);
    }

    /// INVALID CASE — Draft quote with no items cannot be sent.
    #[tokio::test]
    async fn test_mark_sent_draft_with_no_items_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");

        let err = app
            .state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .unwrap_err();

        // Must complain about missing items or zero total
        assert!(
            err.to_lowercase().contains("item")
                || err.to_lowercase().contains("ligne")
                || err.to_lowercase().contains("total"),
            "expected empty-quote error, got: {}",
            err
        );
    }

    /// EDGE CASE — already-Sent quote cannot be sent again.
    #[tokio::test]
    async fn test_mark_sent_already_sent_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");
        app.state
            .quote_service
            .add_item(&quote.id, labour_item(), &UserRole::Admin)
            .expect("add item");
        app.state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .expect("first mark_sent");

        let err = app
            .state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("sent") || err.to_lowercase().contains("draft"),
            "expected duplicate-send error, got: {}",
            err
        );
    }

    // ── DOMAIN: accept / reject ──────────────────────────────────────────────

    /// VALID CASE — Sent quote can be accepted.
    #[tokio::test]
    async fn test_mark_accepted_sent_quote_succeeds() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");
        app.state
            .quote_service
            .add_item(&quote.id, labour_item(), &UserRole::Admin)
            .expect("add item");
        app.state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .expect("mark_sent");

        let result =
            app.state
                .quote_service
                .mark_accepted(&quote.id, "test-user", &UserRole::Admin);

        assert!(result.is_ok(), "expected Ok, got: {:?}", result);
        assert_eq!(result.unwrap().quote.status, QuoteStatus::Accepted);
    }

    /// INVALID CASE — Draft quote cannot be accepted (must be Sent first).
    #[tokio::test]
    async fn test_mark_accepted_draft_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");

        let err = app
            .state
            .quote_service
            .mark_accepted(&quote.id, "test-user", &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("sent") || err.to_lowercase().contains("envoyé"),
            "expected 'must be sent' error, got: {}",
            err
        );
    }

    /// VALID CASE — Sent quote can be rejected.
    #[tokio::test]
    async fn test_mark_rejected_sent_quote_succeeds() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");
        app.state
            .quote_service
            .add_item(&quote.id, labour_item(), &UserRole::Admin)
            .expect("add item");
        app.state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .expect("mark_sent");

        let result =
            app.state
                .quote_service
                .mark_rejected(&quote.id, "test-user", &UserRole::Admin);

        assert!(result.is_ok(), "expected Ok, got: {:?}", result);
        assert_eq!(result.unwrap().status, QuoteStatus::Rejected);
    }

    /// INVALID CASE — Draft quote cannot be rejected (only Sent).
    #[tokio::test]
    async fn test_mark_rejected_draft_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");

        let err = app
            .state
            .quote_service
            .mark_rejected(&quote.id, "test-user", &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("envoyé") || err.to_lowercase().contains("sent"),
            "expected 'must be sent' error, got: {}",
            err
        );
    }

    // ── DOMAIN: edit / delete (Draft-only rule) ──────────────────────────────

    /// VALID CASE — Draft quote can be updated.
    #[tokio::test]
    async fn test_update_draft_quote_succeeds() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");

        let update = UpdateQuoteRequest {
            valid_until: None,
            description: None,
            notes: Some("Updated notes".to_string()),
            terms: None,
            discount_type: None,
            discount_value: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
        };

        let result = app
            .state
            .quote_service
            .update_quote(&quote.id, update, &UserRole::Admin);
        assert!(result.is_ok(), "Draft update must succeed: {:?}", result);
    }

    /// INVALID CASE — Sent quote cannot be updated.
    #[tokio::test]
    async fn test_update_sent_quote_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");
        app.state
            .quote_service
            .add_item(&quote.id, labour_item(), &UserRole::Admin)
            .expect("add item");
        app.state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .expect("mark_sent");

        let update = UpdateQuoteRequest {
            valid_until: None,
            description: None,
            notes: Some("Trying to update".to_string()),
            terms: None,
            discount_type: None,
            discount_value: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
        };

        let err = app
            .state
            .quote_service
            .update_quote(&quote.id, update, &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("draft"),
            "expected draft-only error, got: {}",
            err
        );
    }

    /// VALID CASE — Draft quote can be deleted.
    #[tokio::test]
    async fn test_delete_draft_quote_succeeds() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");

        let result = app
            .state
            .quote_service
            .delete_quote(&quote.id, &UserRole::Admin);
        assert!(result.is_ok(), "Draft delete must succeed: {:?}", result);
    }

    /// INVALID CASE — Sent quote cannot be deleted.
    #[tokio::test]
    async fn test_delete_sent_quote_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");
        app.state
            .quote_service
            .add_item(&quote.id, labour_item(), &UserRole::Admin)
            .expect("add item");
        app.state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .expect("mark_sent");

        let err = app
            .state
            .quote_service
            .delete_quote(&quote.id, &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("draft"),
            "expected draft-only delete error, got: {}",
            err
        );
    }

    // ── DOMAIN: convert to task ──────────────────────────────────────────────

    /// INVALID CASE — only Accepted quotes can be converted.
    #[tokio::test]
    async fn test_convert_draft_quote_to_task_returns_error() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");

        let err = app
            .state
            .quote_service
            .convert_to_task(&quote.id, "fake-task-id", "TSK-999", &UserRole::Admin)
            .unwrap_err();

        assert!(
            err.to_lowercase().contains("accept") || err.to_lowercase().contains("accepté"),
            "expected accepted-only conversion error, got: {}",
            err
        );
    }

    /// VALID CASE — Accepted quote can be converted to a task.
    #[tokio::test]
    async fn test_convert_accepted_quote_to_task_succeeds() {
        use crate::harness::fixtures;
        use rpma_ppf_intervention::shared::services::cross_domain::QuoteStatus;

        let app = TestApp::new().await;
        let client_id = create_client(&app).await;

        // Create a real task so the quotes.task_id FK constraint is satisfied.
        let task = app
            .state
            .task_service
            .create_task_async(fixtures::task_fixture("CVT-001"), "test-user")
            .await
            .expect("task creation for conversion");

        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");
        app.state
            .quote_service
            .add_item(&quote.id, labour_item(), &UserRole::Admin)
            .expect("add item");
        app.state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .expect("mark_sent");
        app.state
            .quote_service
            .mark_accepted(&quote.id, "test-user", &UserRole::Admin)
            .expect("mark_accepted");

        let result = app.state.quote_service.convert_to_task(
            &quote.id,
            &task.id,
            &task.task_number,
            &UserRole::Admin,
        );

        assert!(
            result.is_ok(),
            "Accepted→Converted must succeed: {:?}",
            result
        );
        assert_eq!(result.unwrap().quote.status, QuoteStatus::Converted);
    }

    /// PERSISTENCE — failed deletion leaves the DB row count unchanged.
    #[tokio::test]
    async fn test_delete_non_draft_quote_leaves_db_unchanged() {
        let app = TestApp::new().await;
        let client_id = create_client(&app).await;
        let quote = app
            .state
            .quote_service
            .create_quote(valid_quote_req(&client_id), "test-user", &UserRole::Admin)
            .expect("quote creation");
        app.state
            .quote_service
            .add_item(&quote.id, labour_item(), &UserRole::Admin)
            .expect("add item");
        app.state
            .quote_service
            .mark_sent(&quote.id, &UserRole::Admin)
            .expect("mark_sent");

        let count_before: i64 = app
            .db
            .query_single_value("SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL", [])
            .expect("count quotes");

        let _ = app
            .state
            .quote_service
            .delete_quote(&quote.id, &UserRole::Admin);

        let count_after: i64 = app
            .db
            .query_single_value("SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL", [])
            .expect("count quotes after");

        assert_eq!(
            count_before, count_after,
            "failed delete must not modify DB"
        );
    }
}

// ── Inventory invariants ─────────────────────────────────────────────────────

mod inventory_invariants {
    use rpma_ppf_intervention::shared::services::cross_domain::{
        CreateMaterialRequest, MaterialType, UnitOfMeasure, UpdateStockRequest, UserRole,
    };

    use crate::harness::app::TestApp;

    // ── helpers ──────────────────────────────────────────────────────────────

    /// Seed a real user and return their ID (required for material FK constraints).
    fn seed_technician(app: &TestApp, suffix: &str) -> String {
        use rpma_ppf_intervention::shared::services::cross_domain::UserRole;

        app.state
            .auth_service
            .create_account(
                &format!("inv-tech-{}@rpma.test", suffix),
                &format!("inv-tech-{}", suffix),
                "Inv",
                "Tech",
                UserRole::Technician,
                "Password123!",
            )
            .expect("seed technician for material FK")
            .id
    }

    /// Create a material via the service and return its ID.
    async fn create_material(app: &TestApp, initial_stock: f64, user_id: &str) -> String {
        let req = CreateMaterialRequest {
            sku: format!("SKU-{}", uuid::Uuid::new_v4()),
            name: "Test PPF Film".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Roll,
            current_stock: Some(initial_stock),
            minimum_stock: None,
            maximum_stock: None,
            reorder_point: None,
            unit_cost: None,
            currency: None,
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            storage_location: None,
            warehouse_id: None,
            is_active: None,
            is_discontinued: None,
        };

        app.state
            .material_service
            .create_material(req, Some(user_id.to_string()))
            .expect("material creation must succeed")
            .id
    }

    // ── DOMAIN: stock-change validation through the service ──────────────────

    /// VALID CASE — positive stock delta succeeds and returns updated material.
    #[tokio::test]
    async fn test_update_stock_positive_delta_succeeds() {
        let app = TestApp::new().await;
        let uid = seed_technician(&app, "pos");
        let material_id = create_material(&app, 10.0, &uid).await;

        let req = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: 5.0,
            reason: "stock in".to_string(),
            recorded_by: Some(uid.clone()),
        };

        let result = app
            .state
            .inventory_service
            .update_stock(req, &UserRole::Admin);
        assert!(result.is_ok(), "positive delta must succeed: {:?}", result);

        let updated = result.unwrap();
        assert_eq!(updated.current_stock, 15.0);
    }

    /// VALID CASE — exact reduction to zero is allowed (boundary).
    #[tokio::test]
    async fn test_update_stock_reduce_to_zero_succeeds() {
        let app = TestApp::new().await;
        let uid = seed_technician(&app, "zer");
        let material_id = create_material(&app, 10.0, &uid).await;

        let req = UpdateStockRequest {
            material_id,
            quantity_change: -10.0,
            reason: "full consumption".to_string(),
            recorded_by: Some(uid.clone()),
        };

        let result = app
            .state
            .inventory_service
            .update_stock(req, &UserRole::Admin);
        assert!(
            result.is_ok(),
            "reduction to zero must be allowed: {:?}",
            result
        );
        assert_eq!(result.unwrap().current_stock, 0.0);
    }

    /// INVALID CASE — delta that would push stock below zero is rejected.
    #[tokio::test]
    async fn test_update_stock_negative_exceeding_current_returns_error() {
        let app = TestApp::new().await;
        let uid = seed_technician(&app, "neg");
        let material_id = create_material(&app, 5.0, &uid).await;

        let req = UpdateStockRequest {
            material_id,
            quantity_change: -10.0, // would result in stock = -5
            reason: "test".to_string(),
            recorded_by: None,
        };

        let result = app
            .state
            .inventory_service
            .update_stock(req, &UserRole::Admin);
        assert!(result.is_err(), "negative-stock delta must be rejected");

        let err_msg = format!("{:?}", result.unwrap_err());
        assert!(
            err_msg.to_lowercase().contains("negative")
                || err_msg.to_lowercase().contains("stock")
                || err_msg.to_lowercase().contains("validation"),
            "expected negative-stock error, got: {}",
            err_msg
        );
    }

    /// EDGE CASE — zero stock, any negative delta is forbidden.
    #[tokio::test]
    async fn test_update_stock_zero_stock_negative_delta_returns_error() {
        let app = TestApp::new().await;
        let uid = seed_technician(&app, "zn");
        let material_id = create_material(&app, 0.0, &uid).await;

        let req = UpdateStockRequest {
            material_id,
            quantity_change: -0.001,
            reason: "test".to_string(),
            recorded_by: None,
        };

        let result = app
            .state
            .inventory_service
            .update_stock(req, &UserRole::Admin);
        assert!(
            result.is_err(),
            "negative delta on zero stock must be rejected"
        );
    }

    /// PERSISTENCE — failed stock update leaves the DB stock value unchanged.
    #[tokio::test]
    async fn test_update_stock_failure_leaves_db_unchanged() {
        let app = TestApp::new().await;
        let uid = seed_technician(&app, "fail");
        let material_id = create_material(&app, 3.0, &uid).await;

        let stock_before: f64 = app
            .db
            .query_single_value(
                &format!("SELECT current_stock FROM materials WHERE id = '{material_id}'"),
                [],
            )
            .expect("query stock before");

        let req = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: -100.0, // impossible delta
            reason: "test".to_string(),
            recorded_by: None,
        };
        let _ = app
            .state
            .inventory_service
            .update_stock(req, &UserRole::Admin);

        let stock_after: f64 = app
            .db
            .query_single_value(
                &format!("SELECT current_stock FROM materials WHERE id = '{material_id}'"),
                [],
            )
            .expect("query stock after");

        assert_eq!(
            stock_before, stock_after,
            "failed stock update must not modify DB"
        );
    }

    /// PERSISTENCE — updating stock on a non-existent material returns NotFound.
    #[tokio::test]
    async fn test_update_stock_unknown_material_id_returns_not_found() {
        let app = TestApp::new().await;

        let req = UpdateStockRequest {
            material_id: "00000000-0000-0000-0000-000000000000".to_string(),
            quantity_change: 1.0,
            reason: "test".to_string(),
            recorded_by: None,
        };

        let result = app
            .state
            .inventory_service
            .update_stock(req, &UserRole::Admin);
        assert!(result.is_err(), "unknown material must return an error");

        let err_msg = format!("{:?}", result.unwrap_err());
        assert!(
            err_msg.to_lowercase().contains("not found")
                || err_msg.to_lowercase().contains("notfound"),
            "expected NotFound error, got: {}",
            err_msg
        );
    }
}

// ── User invariants ──────────────────────────────────────────────────────────

mod user_invariants {
    use rpma_ppf_intervention::shared::contracts::auth::UserRole;
    use rpma_ppf_intervention::shared::ipc::errors::AppError;

    use crate::harness::app::TestApp;

    // ── APPLICATION: ban / unban guard ───────────────────────────────────────

    /// Helper: seed a user via AuthService and return their user ID.
    async fn seed_user(app: &TestApp, username: &str) -> String {
        app.state
            .auth_service
            .create_account(
                &format!("{}@rpma.test", username),
                username,
                "Test",
                "User",
                UserRole::Technician,
                "Password123!",
            )
            .expect("seed user")
            .id
    }

    /// INVALID CASE — banning an already-banned user returns `Validation`.
    #[tokio::test]
    async fn test_ban_already_banned_user_returns_validation_error() {
        let app = TestApp::new().await;
        let user_id = seed_user(&app, "bantest1").await;

        // First ban succeeds.
        app.state
            .user_service
            .ban_user(&user_id, "admin")
            .await
            .expect("first ban must succeed");

        // Second ban on same user must be rejected.
        let err = app
            .state
            .user_service
            .ban_user(&user_id, "admin")
            .await
            .unwrap_err();

        assert!(
            matches!(err, AppError::Validation(_)),
            "expected Validation for double-ban, got: {:?}",
            err
        );
    }

    /// EDGE CASE — banning a non-existent user returns a database/not-found error.
    #[tokio::test]
    async fn test_ban_nonexistent_user_returns_error() {
        let app = TestApp::new().await;

        let err = app
            .state
            .user_service
            .ban_user("00000000-0000-0000-0000-000000000000", "admin")
            .await
            .unwrap_err();

        assert!(
            matches!(err, AppError::Database(_) | AppError::NotFound(_)),
            "expected Database or NotFound for missing user, got: {:?}",
            err
        );
    }

    // ── APPLICATION: role-change guard ───────────────────────────────────────

    /// VALID CASE — Admin can change another user's role.
    #[tokio::test]
    async fn test_change_role_valid_succeeds() {
        let app = TestApp::new().await;
        let user_id = seed_user(&app, "roletest1").await;

        let result = app
            .state
            .user_service
            .change_role(&user_id, UserRole::Supervisor, "admin")
            .await;

        assert!(
            result.is_ok(),
            "valid role change must succeed: {:?}",
            result
        );
    }

    /// EDGE CASE — changing role of non-existent user returns an error.
    #[tokio::test]
    async fn test_change_role_nonexistent_user_returns_error() {
        let app = TestApp::new().await;

        let err = app
            .state
            .user_service
            .change_role(
                "00000000-0000-0000-0000-000000000000",
                UserRole::Viewer,
                "admin",
            )
            .await
            .unwrap_err();

        assert!(
            matches!(err, AppError::Database(_) | AppError::NotFound(_)),
            "expected Database or NotFound for missing user, got: {:?}",
            err
        );
    }
}
