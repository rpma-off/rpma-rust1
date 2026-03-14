//! IPC contract tests for quote commands.
//!
//! Validates the three failure modes for quote-related IPC commands:
//!   1. Unauthenticated call → `AppError::Authentication`
//!   2. Insufficient role (e.g., Technician for Admin-only actions) → `AppError::Authorization`
//!   3. Malformed input → validation error
//!
//! `quote_mark_accepted` is Admin-only — its RBAC gate is tested directly via
//! `resolve_request_context` with a role requirement.

use crate::domains::quotes::domain::models::quote::CreateQuoteRequest;
use crate::shared::context::session_resolver::resolve_request_context;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;
use crate::test_utils::{build_test_app_state, make_test_session};

// ── helpers ───────────────────────────────────────────────────────────────────

fn valid_create_request() -> CreateQuoteRequest {
    CreateQuoteRequest {
        client_id: "client-test-001".to_string(),
        task_id: None,
        valid_until: None,
        notes: Some("Test quote".to_string()),
        terms: None,
        vehicle_plate: Some("ABC-123".to_string()),
        vehicle_make: Some("Toyota".to_string()),
        vehicle_model: Some("Corolla".to_string()),
        vehicle_year: Some("2022".to_string()),
        vehicle_vin: None,
        items: vec![],
    }
}

// ── auth failure ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_quote_create_unauthenticated_returns_authentication_error() {
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
async fn test_quote_mark_accepted_technician_rejected_returns_authorization_error() {
    // quote_mark_accepted is Admin-only in the IPC handler.
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
async fn test_quote_mark_accepted_viewer_rejected_returns_authorization_error() {
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
async fn test_quote_mark_accepted_admin_passes_rbac_gate() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_ok(), "Admin should pass Admin-gated resolve");
}

// ── validation rejection ──────────────────────────────────────────────────────

#[tokio::test]
async fn test_quote_create_empty_client_id_fails_validation() {
    // CreateQuoteRequest::validate() is called inside QuoteService::create_quote.
    let req = CreateQuoteRequest {
        client_id: "".to_string(),
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
    };

    let validation = req.validate();
    assert!(validation.is_err(), "empty client_id should fail validate()");
    assert!(
        validation.unwrap_err().contains("Client ID"),
        "error should mention Client ID"
    );
}

#[tokio::test]
async fn test_quote_create_whitespace_client_id_fails_validation() {
    let req = CreateQuoteRequest {
        client_id: "   ".to_string(),
        ..valid_create_request()
    };

    let validation = req.validate();
    assert!(
        validation.is_err(),
        "whitespace-only client_id should fail validate()"
    );
}

// ── happy path ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_quote_create_valid_request_passes_domain_validation() {
    // Domain-level validation passes for a well-formed request.
    let req = valid_create_request();
    assert!(req.validate().is_ok(), "valid request should pass validate()");
}

#[tokio::test]
async fn test_quote_create_authenticated_admin_can_resolve_context() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let ctx = resolve_request_context(&state, None, &None);

    assert!(ctx.is_ok(), "Admin should resolve context successfully");
}
