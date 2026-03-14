//! IPC contract tests for intervention commands.
//!
//! Validates the three failure modes that the `intervention_start` IPC command
//! must handle:
//!   1. Unauthenticated call → `AppError::Authentication`
//!   2. Insufficient role → `AppError::Authorization`
//!   3. Malformed/empty input → `AppError::Validation`
//!
//! Tests operate one level below the Tauri handler, using a real in-memory
//! SQLite DB and a seeded `SessionStore`.

use crate::domains::interventions::InterventionsFacade;
use crate::shared::context::session_resolver::resolve_request_context;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;
use crate::test_utils::{build_test_app_state, make_test_session};
use std::sync::Arc;

// ── auth failure ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_intervention_start_unauthenticated_returns_authentication_error() {
    let state = build_test_app_state().await;
    // No session set → resolver must reject

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authentication(_) => {}
        other => panic!("Expected Authentication, got: {:?}", other),
    }
}

// ── RBAC rejection ────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_intervention_start_admin_only_gate_rejects_viewer() {
    // Intervention commands requiring Admin role.
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
async fn test_intervention_start_authenticated_technician_passes_basic_gate() {
    // Interventions are accessible to Technician role (no Admin requirement).
    let state = build_test_app_state().await;
    state
        .session_store
        .set(make_test_session(UserRole::Technician));

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_ok(), "Technician should pass basic auth gate");
}

// ── validation rejection ──────────────────────────────────────────────────────

#[tokio::test]
async fn test_intervention_validate_id_empty_returns_validation_error() {
    // InterventionsFacade::validate_intervention_id is the same gate used
    // inside the IPC handler when looking up an intervention.
    let db = Arc::new(
        crate::db::Database::new_in_memory()
            .await
            .expect("in-memory db"),
    );
    let service = Arc::new(
        crate::domains::interventions::infrastructure::intervention::InterventionService::new(
            db,
        ),
    );
    let facade = InterventionsFacade::new(service);

    let result = facade.validate_intervention_id("");
    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Validation(_) => {}
        other => panic!("Expected Validation, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_intervention_validate_id_whitespace_returns_validation_error() {
    let db = Arc::new(
        crate::db::Database::new_in_memory()
            .await
            .expect("in-memory db"),
    );
    let service = Arc::new(
        crate::domains::interventions::infrastructure::intervention::InterventionService::new(
            db,
        ),
    );
    let facade = InterventionsFacade::new(service);

    let result = facade.validate_intervention_id("   ");
    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Validation(_) => {}
        other => panic!("Expected Validation, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_intervention_validate_task_id_empty_returns_validation_error() {
    let db = Arc::new(
        crate::db::Database::new_in_memory()
            .await
            .expect("in-memory db"),
    );
    let service = Arc::new(
        crate::domains::interventions::infrastructure::intervention::InterventionService::new(
            db,
        ),
    );
    let facade = InterventionsFacade::new(service);

    let result = facade.validate_task_id("");
    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Validation(_) => {}
        other => panic!("Expected Validation, got: {:?}", other),
    }
}

// ── happy path (facade validation) ───────────────────────────────────────────

#[tokio::test]
async fn test_intervention_validate_task_id_valid_passes() {
    let db = Arc::new(
        crate::db::Database::new_in_memory()
            .await
            .expect("in-memory db"),
    );
    let service = Arc::new(
        crate::domains::interventions::infrastructure::intervention::InterventionService::new(
            db,
        ),
    );
    let facade = InterventionsFacade::new(service);

    assert!(facade.validate_task_id("task-abc-123").is_ok());
}

#[tokio::test]
async fn test_intervention_start_with_full_state_session_resolves_context() {
    // Verify that with a valid session the auth gate passes for intervention access.
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, None, &None);

    assert!(ctx.is_ok(), "Admin session should resolve context");
    assert_eq!(ctx.unwrap().auth.user_id, "test-user-01");
}
