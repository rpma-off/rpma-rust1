use std::sync::Arc;
use crate::db::Database;
use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::domains::calendar::CalendarFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn calendar_facade_exposes_calendar_service() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    let _svc = facade.calendar_service();
}

#[tokio::test]
async fn validate_date_range_rejects_whitespace_dates() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    let err = facade.validate_date_range("   ", "2024-12-31").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
