use std::sync::Arc;
use crate::db::Database;
use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::domains::calendar::CalendarFacade;

#[tokio::test]
async fn validate_date_range_accepts_same_start_and_end() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    let result = facade.validate_date_range("2024-06-15", "2024-06-15");
    assert!(result.is_ok());
}

#[tokio::test]
async fn calendar_facade_debug_output_contains_type_name() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("CalendarFacade"));
}
