use std::sync::Arc;
use crate::db::Database;
use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::domains::calendar::CalendarFacade;

#[tokio::test]
async fn calendar_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn validate_date_range_accepts_valid_range() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(CalendarService::new(db));
    let facade = CalendarFacade::new(service);
    let result = facade.validate_date_range("2024-01-01", "2024-12-31");
    assert!(result.is_ok());
}
