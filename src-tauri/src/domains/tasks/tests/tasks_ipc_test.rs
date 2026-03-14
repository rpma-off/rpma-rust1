//! IPC contract tests for task commands.
//!
//! Validates the three failure modes that the `task_crud` IPC command must
//! handle correctly:
//!   1. Unauthenticated call → `AppError::Authentication`
//!   2. Insufficient role → `AppError::Authorization`
//!   3. Malformed input → `AppError::Validation`
//!
//! Tests exercise the application layer directly (one level below the Tauri
//! command handler) using a real in-memory SQLite database seeded with a
//! fake `UserSession` via `session_store`.

use crate::domains::tasks::domain::models::task::CreateTaskRequest;
use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::context::session_resolver::resolve_request_context;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;
use crate::test_utils::{build_test_app_state, make_test_session, TestDataFactory};

// ── helpers ──────────────────────────────────────────────────────────────────

fn valid_create_request() -> CreateTaskRequest {
    TestDataFactory::create_test_task(None)
}

fn empty_vehicle_plate_request() -> CreateTaskRequest {
    CreateTaskRequest {
        vehicle_plate: "".to_string(),
        ..TestDataFactory::create_test_task(None)
    }
}

fn empty_ppf_zones_request() -> CreateTaskRequest {
    CreateTaskRequest {
        ppf_zones: vec![],
        ..TestDataFactory::create_test_task(None)
    }
}

// ── happy path ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_task_create_happy_path_returns_task_with_id() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, None, &None)
        .expect("context should resolve for admin");

    let result = state
        .task_service
        .create_task_async(valid_create_request(), &ctx.auth.user_id)
        .await;

    assert!(result.is_ok(), "create_task_async failed: {:?}", result);
    let task = result.unwrap();
    assert!(!task.id.is_empty(), "task id should not be empty");
    assert!(!task.task_number.is_empty(), "task number should be generated");
}

#[tokio::test]
async fn test_task_get_authenticated_returns_none_for_unknown_id() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Technician));

    let ctx = resolve_request_context(&state, None, &None).expect("context resolve");

    let result = state
        .task_service
        .get_task_async("non-existent-id-xyz")
        .await;

    assert!(result.is_ok(), "get_task_async should not error on missing id");
    assert!(result.unwrap().is_none(), "unknown id should return None");
    let _ = ctx; // context was resolved correctly
}

// ── auth failure ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_task_create_unauthenticated_returns_authentication_error() {
    let state = build_test_app_state().await;
    // No session seeded → session_store is empty

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authentication(_) => {}
        other => panic!("Expected Authentication error, got: {:?}", other),
    }
}

// ── RBAC rejection ────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_task_create_viewer_cannot_perform_create_operation() {
    // The IPC handler calls `check_task_permission!(&ctx.auth.role, "create")`
    // which delegates to AuthMiddleware::can_perform_task_operation.
    // Verify that Viewer is denied.
    let can = AuthMiddleware::can_perform_task_operation(&UserRole::Viewer, "create");
    assert!(!can, "Viewer must not be able to create tasks");
}

#[tokio::test]
async fn test_task_create_technician_can_perform_create_operation() {
    let can = AuthMiddleware::can_perform_task_operation(&UserRole::Technician, "create");
    assert!(can, "Technician must be able to create tasks");
}

#[tokio::test]
async fn test_task_admin_only_command_rejects_viewer_session() {
    // Admin-gated commands use resolve_request_context with Some(UserRole::Admin).
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Viewer));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authorization(_) => {}
        other => panic!("Expected Authorization error, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_task_admin_only_command_rejects_technician_session() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Technician));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authorization(_) => {}
        other => panic!("Expected Authorization error, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_task_admin_session_passes_admin_role_gate() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_ok(), "Admin should pass Admin-gated resolve");
}

// ── validation rejection ──────────────────────────────────────────────────────

#[tokio::test]
async fn test_task_create_empty_vehicle_plate_returns_validation_error() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, None, &None).expect("context resolve");

    let result = state
        .task_service
        .create_task_async(empty_vehicle_plate_request(), &ctx.auth.user_id)
        .await;

    assert!(result.is_err(), "empty vehicle_plate should be rejected");
    match result.unwrap_err() {
        AppError::Validation(_) => {}
        other => panic!("Expected Validation error, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_task_create_empty_ppf_zones_returns_validation_error() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, None, &None).expect("context resolve");

    let result = state
        .task_service
        .create_task_async(empty_ppf_zones_request(), &ctx.auth.user_id)
        .await;

    assert!(result.is_err(), "empty ppf_zones should be rejected");
    match result.unwrap_err() {
        AppError::Validation(_) => {}
        other => panic!("Expected Validation error, got: {:?}", other),
    }
}
