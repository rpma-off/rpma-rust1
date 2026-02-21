use std::sync::Arc;
use crate::db::Database;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::TasksFacade;

#[tokio::test]
async fn tasks_facade_debug_output() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("TasksFacade"));
}

#[tokio::test]
async fn tasks_facade_service_is_shared_reference() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let task_svc = Arc::new(TaskService::new(db.clone()));
    let import_svc = Arc::new(TaskImportService::new(db));
    let facade = TasksFacade::new(task_svc, import_svc);
    let svc1 = facade.task_service();
    let svc2 = facade.task_service();
    assert!(Arc::ptr_eq(svc1, svc2));
}
