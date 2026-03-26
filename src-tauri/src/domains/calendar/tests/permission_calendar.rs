use crate::db::Database;
use crate::domains::calendar::calendar_handler::{
    CalendarEventRepository, CalendarFacade, CalendarService,
};
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn calendar_facade_exposes_calendar_service() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db.clone()));
    let event_repository = Arc::new(CalendarEventRepository::new(db.clone()));
    let facade = CalendarFacade::new_without_rate_limiter(service, event_repository);
    let _svc = facade.calendar_service();
}

#[tokio::test]
async fn validate_date_range_rejects_whitespace_dates() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db.clone()));
    let event_repository = Arc::new(CalendarEventRepository::new(db.clone()));
    let facade = CalendarFacade::new_without_rate_limiter(service, event_repository);
    let err = facade.validate_date_range("   ", "2024-12-31").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
