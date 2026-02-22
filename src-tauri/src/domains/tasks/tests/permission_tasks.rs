use crate::db::Database;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::TasksFacade;
use std::sync::Arc;

#[tokio::test]
async fn parse_status_accepts_valid_status() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);

    let result = facade.parse_status("pending");
    assert!(result.is_ok());
}

#[tokio::test]
async fn parse_status_rejects_invalid_status() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);

    let result = facade.parse_status("nonexistent_status");
    assert!(result.is_err());
}

#[tokio::test]
async fn validate_task_id_rejects_empty_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);

    let result = facade.validate_task_id("");
    assert!(result.is_err());
}

#[tokio::test]
async fn validate_note_rejects_empty_note() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);

    let result = facade.validate_note("");
    assert!(result.is_err());
}
