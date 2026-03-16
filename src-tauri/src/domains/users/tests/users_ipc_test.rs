//! IPC contract tests for user management commands.
//!
//! User creation (`create_user`) and listing (`get_users`) are Admin-only
//! in the IPC layer.  Tests verify:
//!   1. Unauthenticated call → `AppError::Authentication`
//!   2. Technician/Viewer trying to manage users → `AppError::Authorization`
//!   3. Admin can create users via `auth_service.create_account`
//!   4. bootstrap_first_admin propagates the admin role to the sessions table

use crate::shared::context::session_resolver::resolve_request_context;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;
use crate::test_utils::{build_test_app_state, make_test_session};

// ── auth failure ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_create_user_unauthenticated_returns_authentication_error() {
    let state = build_test_app_state().await;
    // No session seeded

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authentication(_) => {}
        other => panic!("Expected Authentication, got: {:?}", other),
    }
}

// ── RBAC rejection ────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_create_user_technician_rejected_returns_authorization_error() {
    let state = build_test_app_state().await;
    state
        .session_store
        .set(make_test_session(UserRole::Technician));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authorization(_) => {}
        other => panic!("Expected Authorization, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_create_user_viewer_rejected_returns_authorization_error() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Viewer));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authorization(_) => {}
        other => panic!("Expected Authorization, got: {:?}", other),
    }
}

// ── happy path ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_create_user_admin_role_succeeds() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, Some(UserRole::Admin), &None)
        .expect("Admin should pass Admin gate");

    // Create a new user through auth_service (the path the IPC handler uses).
    let result = state.auth_service.create_account(
        "newuser@example.com",
        "newuser",
        "New",
        "User",
        UserRole::Technician,
        "SecurePass123!",
    );

    assert!(result.is_ok(), "Admin create_account should succeed: {:?}", result);
    let account = result.unwrap();
    assert!(!account.id.is_empty(), "user id must not be empty");
    assert_eq!(account.email, "newuser@example.com");
    let _ = ctx;
}

#[tokio::test]
async fn test_create_user_invalid_email_returns_error() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, Some(UserRole::Admin), &None)
        .expect("Admin should pass");

    let result = state.auth_service.create_account(
        "not-an-email",
        "baduser",
        "Bad",
        "User",
        UserRole::Technician,
        "SecurePass123!",
    );

    assert!(result.is_err(), "invalid email should be rejected");
    let _ = ctx;
}

#[tokio::test]
async fn test_create_user_weak_password_returns_error() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, Some(UserRole::Admin), &None)
        .expect("Admin should pass");

    let result = state.auth_service.create_account(
        "weakpass@example.com",
        "weakuser",
        "Weak",
        "Pass",
        UserRole::Technician,
        "123", // Too short / too weak
    );

    assert!(result.is_err(), "weak password should be rejected");
    let _ = ctx;
}

// ── bootstrap role propagation ────────────────────────────────────────────────

/// Regression test: after bootstrap_first_admin the `sessions` table must reflect
/// the new admin role so that restore_session (called on app restart) returns the
/// correct role instead of the stale viewer.
#[tokio::test]
async fn test_bootstrap_first_admin_updates_sessions_table_role() {
    let state = build_test_app_state().await;

    // Create a viewer account (all new accounts start as viewer by design)
    let account = state
        .auth_service
        .create_account(
            "bootstrap_test@example.com",
            "bootstrap_test",
            "Bootstrap",
            "Test",
            UserRole::Viewer,
            "StrongPass123!",
        )
        .expect("create_account should succeed");

    // Authenticate to insert a row into the sessions table
    state
        .auth_service
        .authenticate("bootstrap_test@example.com", "StrongPass123!", None)
        .expect("authenticate should succeed");

    // Promote to admin — this is the operation under test
    state
        .user_service
        .bootstrap_first_admin(&account.id)
        .await
        .expect("bootstrap_first_admin should succeed");

    // Verify that the sessions table was updated atomically alongside users
    let conn = state.db.get_connection().expect("get connection");
    let role_in_sessions: String = conn
        .query_row(
            "SELECT role FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            rusqlite::params![account.id],
            |row| row.get(0),
        )
        .expect("sessions row must exist");

    assert_eq!(
        role_in_sessions, "admin",
        "sessions.role must be 'admin' after bootstrap so restore_session returns the correct role"
    );
}

/// Regression test: bootstrap_first_admin on a DB that already has an admin must fail.
/// Guards against double-promotion.
#[tokio::test]
async fn test_bootstrap_first_admin_blocked_when_admin_exists() {
    let state = build_test_app_state().await;

    // First bootstrap — should succeed
    let first = state
        .auth_service
        .create_account(
            "first_admin@example.com",
            "first_admin",
            "First",
            "Admin",
            UserRole::Viewer,
            "StrongPass123!",
        )
        .expect("create first account");

    state
        .user_service
        .bootstrap_first_admin(&first.id)
        .await
        .expect("first bootstrap should succeed");

    // Second bootstrap attempt — must be rejected
    let second = state
        .auth_service
        .create_account(
            "second_user@example.com",
            "second_user",
            "Second",
            "User",
            UserRole::Viewer,
            "StrongPass123!",
        )
        .expect("create second account");

    let result = state.user_service.bootstrap_first_admin(&second.id).await;
    assert!(
        result.is_err(),
        "bootstrap must be blocked when an admin already exists"
    );
}
