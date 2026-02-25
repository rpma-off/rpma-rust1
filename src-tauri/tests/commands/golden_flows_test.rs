//! Golden Flow integration tests.
//!
//! These tests verify end-to-end "happy path" scenarios that mirror
//! the critical user journeys, focusing on the AppError contract
//! that underpins all IPC communication.

use rpma_ppf_intervention::shared::ipc::errors::AppError;

// ── Golden Flow 1: Auth error lifecycle ─────────────────────────────

#[test]
fn golden_auth_error_has_correct_code_and_status() {
    let err = AppError::Authentication("Invalid credentials".to_string());

    assert_eq!(err.code(), "AUTH_INVALID");
    assert_eq!(err.http_status(), 401);
    assert!(err.is_client_error());
    assert!(!err.is_server_error());
}

#[test]
fn golden_authorization_error_has_correct_code_and_status() {
    let err = AppError::Authorization("Insufficient permissions".to_string());

    assert_eq!(err.code(), "AUTH_FORBIDDEN");
    assert_eq!(err.http_status(), 403);
    assert!(err.is_client_error());
}

// ── Golden Flow 2: Task error codes ─────────────────────────────────

#[test]
fn golden_task_invalid_transition_error() {
    let err = AppError::TaskInvalidTransition("Cannot move from Draft to Completed".to_string());

    assert_eq!(err.code(), "TASK_INVALID_TRANSITION");
    assert_eq!(err.http_status(), 409);
    assert!(err.is_client_error());
}

// ── Golden Flow 3: Intervention error codes ─────────────────────────

#[test]
fn golden_intervention_already_active_error() {
    let err =
        AppError::InterventionAlreadyActive("Intervention INT-001 is already active".to_string());

    assert_eq!(err.code(), "INTERVENTION_ALREADY_ACTIVE");
    assert_eq!(err.http_status(), 400);
    assert!(err.is_client_error());
}

#[test]
fn golden_intervention_step_out_of_order_error() {
    let err = AppError::InterventionStepOutOfOrder(
        "Step 3 cannot be completed before Step 2".to_string(),
    );

    assert_eq!(err.code(), "INTERVENTION_STEP_OUT_OF_ORDER");
    assert!(err.is_client_error());
}

// ── Golden Flow 4: Sanitization golden path ─────────────────────────

#[test]
fn golden_server_errors_never_leak_internals() {
    let cases = vec![
        AppError::Database("SQLITE_BUSY: database is locked".to_string()),
        AppError::Internal("panic at src/services/auth.rs:42".to_string()),
        AppError::Io("/etc/rpma/config.toml: permission denied".to_string()),
        AppError::Network("Connection to 10.0.0.1:5432 refused".to_string()),
    ];

    for err in cases {
        let code = err.code().to_string();
        let sanitized = err.sanitize_for_frontend();
        let msg = sanitized.to_string();

        assert!(
            !msg.contains("SQLITE")
                && !msg.contains("panic")
                && !msg.contains("/etc")
                && !msg.contains("10.0.0"),
            "Error code {} leaked internals: {}",
            code,
            msg,
        );
    }
}
