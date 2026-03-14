//! IPC contract tests for user management commands.
//!
//! User creation (`create_user`) and listing (`get_users`) are Admin-only
//! in the IPC layer.  Tests verify:
//!   1. Unauthenticated call → `AppError::Authentication`
//!   2. Technician/Viewer trying to manage users → `AppError::Authorization`
//!   3. Admin can create users via `auth_service.create_account`

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
