use crate::db::Database;
use crate::domains::calendar::calendar_handler::{CalendarFacade, CalendarService};
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn validate_date_range_rejects_empty_start_date() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db.clone()));
    let facade = CalendarFacade::new(service, db.clone());
    let err = facade.validate_date_range("", "2024-12-31").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_date_range_rejects_empty_end_date() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db.clone()));
    let facade = CalendarFacade::new(service, db.clone());
    let err = facade.validate_date_range("2024-01-01", "").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_date_range_rejects_reversed_range() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db.clone()));
    let facade = CalendarFacade::new(service, db.clone());
    let err = facade
        .validate_date_range("2024-12-31", "2024-01-01")
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn schedule_task_rejects_empty_task_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = CalendarService::new(db);
    let err = service
        .schedule_task(
            "".to_string(),
            "2024-06-01".to_string(),
            None,
            None,
            "user1",
        )
        .await
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(ref msg) if msg == "task_id is required"));
}

#[tokio::test]
async fn schedule_task_rejects_empty_new_date() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = CalendarService::new(db);
    let err = service
        .schedule_task("task-1".to_string(), "".to_string(), None, None, "user1")
        .await
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(ref msg) if msg == "new_date is required"));
}

#[tokio::test]
async fn schedule_task_rejects_invalid_date_format() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = CalendarService::new(db);
    let err = service
        .schedule_task(
            "task-1".to_string(),
            "06/01/2024".to_string(), // wrong format
            None,
            None,
            "user1",
        )
        .await
        .unwrap_err();
    assert!(matches!(
        err,
        AppError::Validation(ref msg) if msg == "new_date must be in YYYY-MM-DD format"
    ));
}

#[tokio::test]
async fn check_conflicts_rejects_empty_task_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = CalendarService::new(db);
    let err = service
        .check_conflicts("".to_string(), "2024-06-01".to_string(), None, None)
        .await
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(ref msg) if msg == "task_id is required"));
}

#[tokio::test]
async fn check_conflicts_rejects_empty_date() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = CalendarService::new(db);
    let err = service
        .check_conflicts("task-1".to_string(), "".to_string(), None, None)
        .await
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(ref msg) if msg == "new_date is required"));
}
