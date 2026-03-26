use crate::db::Database;
use crate::domains::calendar::calendar_handler::{
    CalendarEventRepository, CalendarFacade, CalendarService,
};
use std::sync::Arc;

#[tokio::test]
async fn validate_date_range_accepts_same_start_and_end() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db.clone()));
    let event_repository = Arc::new(CalendarEventRepository::new(db.clone()));
    let facade = CalendarFacade::new_without_rate_limiter(service, event_repository);
    let result = facade.validate_date_range("2024-06-15", "2024-06-15");
    assert!(result.is_ok());
}

#[tokio::test]
async fn calendar_facade_debug_output_contains_type_name() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db.clone()));
    let event_repository = Arc::new(CalendarEventRepository::new(db.clone()));
    let facade = CalendarFacade::new_without_rate_limiter(service, event_repository);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("CalendarFacade"));
}
