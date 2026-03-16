use crate::db::Database;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::TasksFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

// ------------------------------------------------------------------
// TaskCommandService input-validation boundary
//
// These tests guard the validation logic called by send_message() and
// report_issue() in task_command_service.rs.  They exercise the static
// helpers on TasksFacade so that the IPC seam stays honest without
// needing a running notification stack.
// ------------------------------------------------------------------

#[test]
fn test_validate_message_type_rejects_unknown() {
    let err = TasksFacade::validate_message_type(Some("carrier_pigeon")).unwrap_err();
    assert!(
        matches!(err, AppError::Validation(_)),
        "unknown message type must be a validation error"
    );
}

#[test]
fn test_validate_message_type_accepts_known_variants() {
    for mt in &["email", "sms", "in_app", "EMAIL", "SMS"] {
        assert!(
            TasksFacade::validate_message_type(Some(mt)).is_ok(),
            "expected {mt} to be accepted"
        );
    }
}

#[test]
fn test_validate_message_type_defaults_to_in_app_when_none() {
    let result = TasksFacade::validate_message_type(None).unwrap();
    assert_eq!(result, "in_app");
}

#[test]
fn test_validate_severity_rejects_unknown() {
    let err = TasksFacade::validate_severity(Some("catastrophic")).unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[test]
fn test_validate_issue_fields_rejects_empty_description() {
    // Regression: send_message validation gap — empty body must be caught
    // before hitting the notification service (avoids noisy DB writes).
    let err = TasksFacade::validate_issue_fields("mechanical", "").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[test]
fn test_validate_issue_fields_rejects_empty_issue_type() {
    let err = TasksFacade::validate_issue_fields("", "Engine seized").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_task_id_rejects_empty() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let err = facade.validate_task_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(ref msg) if msg == "task_id is required"));
}

#[tokio::test]
async fn validate_note_rejects_empty() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let err = facade.validate_note("").unwrap_err();
    assert!(matches!(err, AppError::Validation(ref msg) if msg == "Task note cannot be empty"));
}

#[tokio::test]
async fn validate_note_rejects_too_long() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let long_note = "x".repeat(5001);
    let err = facade.validate_note(&long_note).unwrap_err();
    assert!(matches!(
        err,
        AppError::Validation(ref msg)
            if msg == "Task note exceeds maximum length of 5000 characters"
    ));
}
