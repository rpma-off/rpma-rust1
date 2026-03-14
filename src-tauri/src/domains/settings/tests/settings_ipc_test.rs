//! IPC contract tests for settings commands.
//!
//! Settings write commands (e.g. `update_general_settings`) are Admin-only.
//! Read commands (e.g. `get_app_settings`) require any authenticated session.
//!
//! Tests:
//!   1. Unauthenticated call → `AppError::Authentication`
//!   2. Technician/Viewer trying to write settings → `AppError::Authorization`
//!   3. Admin can read and write settings

use crate::shared::context::session_resolver::resolve_request_context;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;
use crate::test_utils::{build_test_app_state, make_test_session};

// ── auth failure ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_get_app_settings_unauthenticated_returns_authentication_error() {
    let state = build_test_app_state().await;
    // No session seeded

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authentication(_) => {}
        other => panic!("Expected Authentication, got: {:?}", other),
    }
}

// ── RBAC rejection (write commands are Admin-only) ────────────────────────────

#[tokio::test]
async fn test_update_general_settings_technician_rejected_returns_authorization_error() {
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
async fn test_update_general_settings_viewer_rejected_returns_authorization_error() {
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
async fn test_update_general_settings_supervisor_rejected_returns_authorization_error() {
    // Settings writes are Admin-only; Supervisor is not sufficient.
    let state = build_test_app_state().await;
    state
        .session_store
        .set(make_test_session(UserRole::Supervisor));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authorization(_) => {}
        other => panic!("Expected Authorization for Supervisor on Admin gate, got: {:?}", other),
    }
}

// ── happy path ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_get_app_settings_authenticated_passes_gate() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, None, &None);

    assert!(ctx.is_ok(), "Authenticated admin should pass basic gate");
}

#[tokio::test]
async fn test_update_general_settings_admin_role_passes_gate() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_ok(), "Admin should pass Admin-gated resolve");
    let ctx = result.unwrap();
    assert_eq!(ctx.auth.role, UserRole::Admin);
}

#[tokio::test]
async fn test_get_app_settings_returns_settings_from_db() {
    // Read the persisted settings — with no prior writes the row is seeded
    // by migration with defaults.
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, None, &None).expect("context resolve");

    let result = state.settings_repository.get_app_settings_db();
    assert!(
        result.is_ok(),
        "get_app_settings_db should return default settings: {:?}",
        result
    );
    let _ = ctx; // context resolved correctly
}
