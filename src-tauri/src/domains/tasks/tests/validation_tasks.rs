use std::sync::Arc;
use crate::db::Database;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::TasksFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn validate_task_id_rejects_empty() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let err = facade.validate_task_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_note_rejects_empty() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let err = facade.validate_note("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_note_rejects_too_long() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let long_note = "x".repeat(5001);
    let err = facade.validate_note(&long_note).unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
