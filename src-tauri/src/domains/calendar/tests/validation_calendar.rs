use crate::db::Database;
use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::domains::calendar::CalendarFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn validate_date_range_rejects_empty_start_date() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    let err = facade.validate_date_range("", "2024-12-31").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_date_range_rejects_empty_end_date() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    let err = facade.validate_date_range("2024-01-01", "").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_date_range_rejects_reversed_range() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    let err = facade
        .validate_date_range("2024-12-31", "2024-01-01")
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
