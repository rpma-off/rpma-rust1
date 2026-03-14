//! IPC contract tests for auth commands.
//!
//! Validates the three failure modes for auth-related IPC commands:
//!   1. Unauthenticated call (no session) → `AppError::Authentication`
//!   2. Expired or cleared session → `AppError::Authentication`
//!   3. Insufficient role for role-gated commands → `AppError::Authorization`
//!
//! Also tests the `auth_login` happy path via the `AuthService::authenticate` method
//! that the IPC handler delegates to.

use crate::domains::auth::infrastructure::auth::AuthService;
use crate::shared::context::session_resolver::resolve_request_context;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::ipc::errors::AppError;
use crate::test_utils::{build_test_app_state, make_test_session};

// ── helpers ───────────────────────────────────────────────────────────────────

fn expired_session() -> UserSession {
    UserSession {
        id: "expired-session-1".to_string(),
        user_id: "expired-user".to_string(),
        username: "expireduser".to_string(),
        email: "expired@example.com".to_string(),
        role: UserRole::Technician,
        token: "expired-token".to_string(),
        // Expiry in the past.
        expires_at: "2000-01-01T00:00:00Z".to_string(),
        last_activity: "2000-01-01T00:00:00Z".to_string(),
        created_at: "2000-01-01T00:00:00Z".to_string(),
    }
}

// ── happy path — login ────────────────────────────────────────────────────────

#[tokio::test]
async fn test_auth_login_valid_credentials_returns_session_token() {
    let state = build_test_app_state().await;

    // Register a test user through AuthService (same path as auth_create_account IPC).
    state
        .auth_service
        .create_account(
            "logintest@example.com",
            "logintest",
            "Login",
            "Test",
            UserRole::Technician,
            "SecurePass123!",
        )
        .expect("create account");

    let result = state
        .auth_service
        .authenticate("logintest@example.com", "SecurePass123!", None);

    assert!(result.is_ok(), "authenticate should succeed: {:?}", result);
    let session = result.unwrap();
    assert!(!session.token.is_empty(), "token should not be empty");
    assert_eq!(session.role, UserRole::Technician);
}

// ── auth failure — bad credentials ───────────────────────────────────────────

#[tokio::test]
async fn test_auth_login_wrong_password_returns_error() {
    let state = build_test_app_state().await;

    state
        .auth_service
        .create_account(
            "badpass@example.com",
            "badpassuser",
            "Bad",
            "Pass",
            UserRole::Technician,
            "CorrectPass123!",
        )
        .expect("create account");

    let result = state
        .auth_service
        .authenticate("badpass@example.com", "WrongPass999!", None);

    assert!(result.is_err(), "wrong password should be rejected");
}

#[tokio::test]
async fn test_auth_login_unknown_email_returns_error() {
    let state = build_test_app_state().await;

    let result = state
        .auth_service
        .authenticate("nobody@example.com", "AnyPass123!", None);

    assert!(result.is_err(), "unknown email should be rejected");
}

// ── auth failure — no session ─────────────────────────────────────────────────

#[tokio::test]
async fn test_resolve_context_no_session_returns_authentication_error() {
    let state = build_test_app_state().await;
    // session_store is empty

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authentication(_) => {}
        other => panic!("Expected Authentication, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_resolve_context_expired_session_returns_authentication_error() {
    let state = build_test_app_state().await;
    state.session_store.set(expired_session());

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authentication(_) => {}
        other => panic!("Expected Authentication for expired session, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_resolve_context_cleared_session_returns_authentication_error() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));
    state.session_store.clear();

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authentication(_) => {}
        other => panic!("Expected Authentication after clear, got: {:?}", other),
    }
}

// ── RBAC rejection ────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_resolve_context_admin_required_with_viewer_returns_authorization_error() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Viewer));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authorization(_) => {}
        other => panic!("Expected Authorization, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_resolve_context_admin_required_with_technician_returns_authorization_error() {
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
async fn test_resolve_context_admin_session_passes_admin_gate() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_ok(), "Admin should pass Admin gate");
}

#[tokio::test]
async fn test_resolve_context_supervisor_passes_supervisor_gate() {
    let state = build_test_app_state().await;
    state
        .session_store
        .set(make_test_session(UserRole::Supervisor));

    // Supervisor-level gate
    let result = resolve_request_context(&state, Some(UserRole::Supervisor), &None);

    assert!(result.is_ok(), "Supervisor should pass Supervisor gate");
}
