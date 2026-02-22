use crate::db::Database;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::TasksFacade;
use std::sync::Arc;

#[tokio::test]
async fn validate_note_accepts_valid_note() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let result = facade.validate_note("This is a valid note");
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "This is a valid note");
}

#[tokio::test]
async fn validate_note_trims_whitespace() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let result = facade.validate_note("  trimmed note  ");
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "trimmed note");
}
