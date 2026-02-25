//! IPC contract tests for Tauri commands.
//!
//! Validates the IPC error handling contract:
//!   - Correct `AppError` serialization
//!   - Error code mapping for frontend consumption
//!   - Sanitization prevents internal detail leakage
//!   - Client vs server error classification
//!
//! These tests run without the Tauri runtime – they verify
//! data structures and error handling contracts only.

use rpma_ppf_intervention::shared::ipc::errors::AppError;

// ── AppError serialization contract ─────────────────────────────────

#[test]
fn app_error_serializes_to_json_correctly() {
    let err = AppError::Validation("Field X is required".to_string());
    let json = serde_json::to_value(&err).unwrap();

    // The enum serializes as { "Validation": "..." }
    assert!(json.get("Validation").is_some());
    assert_eq!(json["Validation"], "Field X is required");
}

#[test]
fn app_error_code_matches_expected_contract() {
    // Exhaustive mapping verified against frontend error handler
    let cases: Vec<(AppError, &str)> = vec![
        (AppError::Authentication("x".into()), "AUTH_INVALID"),
        (AppError::Authorization("x".into()), "AUTH_FORBIDDEN"),
        (AppError::Validation("x".into()), "VALIDATION_ERROR"),
        (AppError::Database("x".into()), "DATABASE_ERROR"),
        (AppError::NotFound("x".into()), "NOT_FOUND"),
        (AppError::Internal("x".into()), "INTERNAL_ERROR"),
        (AppError::Network("x".into()), "NETWORK_ERROR"),
        (AppError::Io("x".into()), "IO_ERROR"),
        (AppError::Configuration("x".into()), "CONFIG_ERROR"),
        (AppError::RateLimit("x".into()), "RATE_LIMIT"),
        (AppError::Sync("x".into()), "SYNC_ERROR"),
        (
            AppError::TaskInvalidTransition("x".into()),
            "TASK_INVALID_TRANSITION",
        ),
        (
            AppError::TaskDuplicateNumber("x".into()),
            "TASK_DUPLICATE_NUMBER",
        ),
        (
            AppError::TaskAssignmentConflict("x".into()),
            "TASK_ASSIGNMENT_CONFLICT",
        ),
        (
            AppError::InterventionAlreadyActive("x".into()),
            "INTERVENTION_ALREADY_ACTIVE",
        ),
        (
            AppError::InterventionInvalidState("x".into()),
            "INTERVENTION_INVALID_STATE",
        ),
        (
            AppError::InterventionStepNotFound("x".into()),
            "INTERVENTION_STEP_NOT_FOUND",
        ),
        (
            AppError::InterventionValidationFailed("x".into()),
            "INTERVENTION_VALIDATION_FAILED",
        ),
        (
            AppError::InterventionConcurrentModification("x".into()),
            "INTERVENTION_CONCURRENT_MODIFICATION",
        ),
        (
            AppError::InterventionTimeout("x".into()),
            "INTERVENTION_TIMEOUT",
        ),
        (
            AppError::InterventionStepOutOfOrder("x".into()),
            "INTERVENTION_STEP_OUT_OF_ORDER",
        ),
        (AppError::NotImplemented("x".into()), "NOT_IMPLEMENTED"),
    ];

    for (error, expected_code) in cases {
        assert_eq!(
            error.code(),
            expected_code,
            "AppError::{:?} should map to code '{}'",
            error,
            expected_code
        );
    }
}

// ── HTTP status code contract ───────────────────────────────────────

#[test]
fn auth_errors_map_to_correct_http_status() {
    assert_eq!(AppError::Authentication("x".into()).http_status(), 401);
    assert_eq!(AppError::Authorization("x".into()).http_status(), 403);
}

#[test]
fn validation_errors_map_to_400() {
    assert_eq!(AppError::Validation("x".into()).http_status(), 400);
}

#[test]
fn not_found_maps_to_404() {
    assert_eq!(AppError::NotFound("x".into()).http_status(), 404);
}

#[test]
fn server_errors_map_to_500() {
    assert_eq!(AppError::Database("x".into()).http_status(), 500);
    assert_eq!(AppError::Internal("x".into()).http_status(), 500);
    assert_eq!(AppError::Network("x".into()).http_status(), 500);
    assert_eq!(AppError::Io("x".into()).http_status(), 500);
}

#[test]
fn task_conflict_errors_map_to_409() {
    assert_eq!(
        AppError::TaskInvalidTransition("x".into()).http_status(),
        409
    );
    assert_eq!(AppError::TaskDuplicateNumber("x".into()).http_status(), 409);
    assert_eq!(
        AppError::TaskAssignmentConflict("x".into()).http_status(),
        409
    );
}

// ── Client vs server error classification ───────────────────────────

#[test]
fn client_errors_are_classified_correctly() {
    let client_errors = vec![
        AppError::Authentication("x".into()),
        AppError::Authorization("x".into()),
        AppError::Validation("x".into()),
        AppError::NotFound("x".into()),
        AppError::RateLimit("x".into()),
        AppError::TaskInvalidTransition("x".into()),
        AppError::InterventionAlreadyActive("x".into()),
    ];

    for err in client_errors {
        assert!(err.is_client_error(), "{:?} should be a client error", err);
        assert!(
            !err.is_server_error(),
            "{:?} should not be a server error",
            err
        );
    }
}

#[test]
fn server_errors_are_classified_correctly() {
    let server_errors = vec![
        AppError::Database("x".into()),
        AppError::Internal("x".into()),
        AppError::Network("x".into()),
        AppError::Io("x".into()),
        AppError::Configuration("x".into()),
        AppError::Sync("x".into()),
        AppError::NotImplemented("x".into()),
    ];

    for err in server_errors {
        assert!(err.is_server_error(), "{:?} should be a server error", err);
        assert!(
            !err.is_client_error(),
            "{:?} should not be a client error",
            err
        );
    }
}

// ── Sanitization contract ───────────────────────────────────────────

#[test]
fn server_errors_are_sanitized_for_frontend() {
    let sensitive = AppError::Database("SELECT * FROM users WHERE id = 42".to_string());
    let sanitized = sensitive.sanitize_for_frontend();

    match sanitized {
        AppError::Database(msg) => {
            assert!(
                !msg.contains("SELECT"),
                "Database error leaked SQL: {}",
                msg
            );
        }
        _ => panic!("Expected Database variant after sanitization"),
    }
}

#[test]
fn internal_error_sanitization_hides_stack_trace() {
    let internal = AppError::Internal("panic at src/services/auth.rs:42".to_string());
    let sanitized = internal.sanitize_for_frontend();

    match sanitized {
        AppError::Internal(msg) => {
            assert!(
                !msg.contains("panic"),
                "Internal error leaked details: {}",
                msg
            );
            assert!(
                !msg.contains("auth.rs"),
                "Internal error leaked file path: {}",
                msg
            );
        }
        _ => panic!("Expected Internal variant"),
    }
}

#[test]
fn io_error_sanitization_hides_file_path() {
    let io_err = AppError::Io("/home/user/.config/rpma/db.sqlite: permission denied".to_string());
    let sanitized = io_err.sanitize_for_frontend();

    match sanitized {
        AppError::Io(msg) => {
            assert!(
                !msg.contains("/home"),
                "I/O error leaked file path: {}",
                msg
            );
        }
        _ => panic!("Expected Io variant"),
    }
}

#[test]
fn network_error_sanitization_hides_ip() {
    let net_err = AppError::Network("Connection to 192.168.1.100:5432 refused".to_string());
    let sanitized = net_err.sanitize_for_frontend();

    match sanitized {
        AppError::Network(msg) => {
            assert!(!msg.contains("192.168"), "Network error leaked IP: {}", msg);
        }
        _ => panic!("Expected Network variant"),
    }
}

#[test]
fn client_errors_pass_through_sanitization() {
    let validation = AppError::Validation("Title is required".to_string());
    let sanitized = validation.sanitize_for_frontend();

    match sanitized {
        AppError::Validation(msg) => assert_eq!(msg, "Title is required"),
        _ => panic!("Expected Validation variant"),
    }
}

#[test]
fn not_found_passes_through_sanitization() {
    let not_found = AppError::NotFound("Task T-001 not found".to_string());
    let sanitized = not_found.sanitize_for_frontend();

    match sanitized {
        AppError::NotFound(msg) => assert_eq!(msg, "Task T-001 not found"),
        _ => panic!("Expected NotFound variant"),
    }
}

// ── String conversion contract ──────────────────────────────────────

#[test]
fn app_error_converts_to_string_with_prefix() {
    let err = AppError::Validation("Email is invalid".to_string());
    let s: String = err.into();
    assert!(s.contains("Validation error"));
    assert!(s.contains("Email is invalid"));
}

#[test]
fn app_error_from_string_creates_internal() {
    let err: AppError = "unexpected failure".to_string().into();
    match err {
        AppError::Internal(msg) => assert_eq!(msg, "unexpected failure"),
        _ => panic!("Expected Internal variant from String"),
    }
}

#[test]
fn app_error_from_str_creates_internal() {
    let err: AppError = "unexpected failure".into();
    match err {
        AppError::Internal(msg) => assert_eq!(msg, "unexpected failure"),
        _ => panic!("Expected Internal variant from &str"),
    }
}
