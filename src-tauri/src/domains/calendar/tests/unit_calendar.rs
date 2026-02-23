use crate::db::Database;
use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::domains::calendar::CalendarFacade;
use std::sync::Arc;

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

/// Verify that CalendarTaskStatus parses every string variant that the tasks
/// domain's TaskStatus uses. This guards against drift when new task statuses
/// are added without updating the calendar mirror.
#[test]
fn calendar_task_status_covers_all_task_status_variants() {
    use crate::domains::calendar::domain::models::calendar::CalendarTaskStatus;
    use std::str::FromStr;

    let task_status_values = [
        "draft",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "on_hold",
        "pending",
        "invalid",
        "archived",
        "failed",
        "overdue",
        "assigned",
        "paused",
    ];

    for value in &task_status_values {
        assert!(
            CalendarTaskStatus::from_str(value).is_ok(),
            "CalendarTaskStatus is missing variant for task status '{value}'"
        );
    }
}

/// Verify that CalendarTaskPriority parses every string variant that the tasks
/// domain's TaskPriority uses.
#[test]
fn calendar_task_priority_covers_all_task_priority_variants() {
    use crate::domains::calendar::domain::models::calendar::CalendarTaskPriority;
    use std::str::FromStr;

    let task_priority_values = ["low", "medium", "high", "urgent"];

    for value in &task_priority_values {
        assert!(
            CalendarTaskPriority::from_str(value).is_ok(),
            "CalendarTaskPriority is missing variant for task priority '{value}'"
        );
    }
}
