use std::sync::Arc;
use crate::db::Database;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::TasksFacade;

#[tokio::test]
async fn tasks_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn validate_task_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    assert!(facade.validate_task_id("task-001").is_ok());
}
