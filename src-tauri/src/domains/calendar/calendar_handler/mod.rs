//! Calendar domain — repository, service, facade, IPC request DTOs, and Tauri commands.

use crate::domains::calendar::models::*;
use serde::Deserialize;

pub mod event_repository;
pub mod facade;
pub mod ipc;
pub mod repository;
pub mod service;

pub use event_repository::*;
pub use facade::*;
pub use ipc::*;
pub use repository::*;
pub use service::*;

// ── Request DTOs (application layer) ─────────────────────────────────────────

/// Get calendar tasks request.
#[derive(Deserialize, Debug)]
pub struct GetCalendarTasksRequest {
    pub date_range: CalendarDateRange,
    pub technician_ids: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Check conflicts request.
#[derive(Deserialize, Debug)]
pub struct CheckConflictsRequest {
    pub task_id: String,
    pub new_date: String,
    pub new_start: Option<String>,
    pub new_end: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Schedule task request.
#[derive(Deserialize, Debug)]
pub struct ScheduleTaskRequest {
    pub task_id: String,
    pub new_date: String,
    pub new_start: Option<String>,
    pub new_end: Option<String>,
    pub force: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Get event by ID request.
#[derive(Deserialize, Debug)]
pub struct GetEventByIdRequest {
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Create event request.
#[derive(Deserialize, Debug)]
pub struct CreateEventRequest {
    pub event_data: CreateEventInput,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Update event request.
#[derive(Deserialize, Debug)]
pub struct UpdateEventRequest {
    pub id: String,
    pub event_data: UpdateEventInput,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Delete event request.
#[derive(Deserialize, Debug)]
pub struct DeleteEventRequest {
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Get events for technician request.
#[derive(Deserialize, Debug)]
pub struct GetEventsForTechnicianRequest {
    pub technician_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Get events for task request.
#[derive(Deserialize, Debug)]
pub struct GetEventsForTaskRequest {
    pub task_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

// ── Inline tests (migrated from infrastructure/calendar.rs) ──────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::test_utils::TestDatabase;
    use rusqlite::params;
    use std::sync::Arc;

    fn setup_test_db() -> (Arc<Database>, TestDatabase) {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let db = test_db.db();
        (db, test_db)
    }

    fn insert_test_task(
        db: &Database,
        id: &str,
        tech_id: &str,
        date: &str,
        start: Option<&str>,
        end: Option<&str>,
        status: &str,
    ) {
        let now = 1_735_689_600_000_i64;
        db.execute(
            r#"INSERT OR IGNORE INTO users
               (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, 'technician', 1, ?6, ?6)"#,
            params![
                tech_id,
                format!("{}@example.com", tech_id),
                tech_id,
                "test_password_hash",
                format!("Technician {}", tech_id),
                now
            ],
        )
        .expect("Failed to insert test technician");

        let task_number = format!("TASK-{}", id);
        db.execute(
            r#"INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model,
                ppf_zones, scheduled_date, start_time, end_time, technician_id, status,
                priority, created_at, updated_at)
               VALUES (?1, ?2, ?3, 'ABC123', 'Test Model', '["front"]', ?4, ?5, ?6, ?7, ?8, 'medium', ?9, ?9)"#,
            params![id, task_number, format!("Task {}", id), date, start, end, tech_id, status, now],
        )
        .expect("Failed to insert test task");
    }

    #[tokio::test]
    async fn test_overlap_detected_when_times_overlap() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("12:00".to_string())).await.expect("check_conflicts failed");
        assert!(result.has_conflict, "Should detect overlap");
        assert_eq!(result.conflicting_tasks.len(), 1);
        assert_eq!(result.conflicting_tasks[0].id, "task-existing");
        assert!(result.message.unwrap().contains("Task task-existing"));
    }

    #[tokio::test]
    async fn test_no_conflict_for_adjacent_events() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("10:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("11:00".to_string())).await.expect("check_conflicts failed");
        assert!(!result.has_conflict, "Adjacent events should NOT conflict");
        assert!(result.conflicting_tasks.is_empty());
    }

    #[tokio::test]
    async fn test_overlap_when_new_contains_existing() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("10:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("12:00".to_string())).await.expect("check_conflicts failed");
        assert!(result.has_conflict, "Should detect when new fully contains existing");
    }

    #[tokio::test]
    async fn test_overlap_when_existing_contains_new() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("12:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("11:00".to_string())).await.expect("check_conflicts failed");
        assert!(result.has_conflict, "Should detect when existing fully contains new");
    }

    #[tokio::test]
    async fn test_no_conflict_across_different_technicians() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-tech1", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-tech2", "tech2", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-tech2".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("11:00".to_string())).await.expect("check_conflicts failed");
        assert!(!result.has_conflict, "Different technicians should NOT conflict");
    }

    #[tokio::test]
    async fn test_conflict_same_technician_different_tasks() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-a", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-b", "tech1", "2025-06-15", Some("10:00"), Some("12:00"), "pending");
        insert_test_task(&db, "task-c", "tech1", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-c".to_string(), "2025-06-15".to_string(), Some("10:30".to_string()), Some("11:30".to_string())).await.expect("check_conflicts failed");
        assert!(result.has_conflict, "Same technician should conflict");
        assert_eq!(result.conflicting_tasks.len(), 2, "Should find both overlapping tasks");
    }

    #[tokio::test]
    async fn test_no_conflict_with_completed_task() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-done", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "completed");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("11:00".to_string())).await.expect("check_conflicts failed");
        assert!(!result.has_conflict, "Completed tasks should not cause conflicts");
    }

    #[tokio::test]
    async fn test_no_conflict_with_cancelled_task() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-cancel", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "cancelled");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("11:00".to_string())).await.expect("check_conflicts failed");
        assert!(!result.has_conflict, "Cancelled tasks should not cause conflicts");
    }

    #[tokio::test]
    async fn test_date_only_conflict_detection() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");
        let result = service.check_conflicts("task-new".to_string(), "2025-06-15".to_string(), None, None).await.expect("check_conflicts failed");
        assert!(result.has_conflict, "Date-only check should flag same-date tasks");
    }

    #[tokio::test]
    async fn test_no_conflict_when_no_technician() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            r#"INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model,
                ppf_zones, scheduled_date, status, priority, created_at, updated_at)
               VALUES ('task-no-tech', 'TASK-0001', 'Unassigned', 'XYZ', 'Model', '["front"]', '2025-06-15', 'pending', 'medium', ?1, ?1)"#,
            params![now],
        ).expect("insert failed");
        let result = service.check_conflicts("task-no-tech".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("11:00".to_string())).await.expect("check_conflicts failed");
        assert!(!result.has_conflict, "Task with no technician should never conflict");
    }

    #[tokio::test]
    async fn test_schedule_task_updates_both_task_and_event() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            r#"INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model,
                ppf_zones, scheduled_date, status, priority, created_at, updated_at)
               VALUES ('task-sched', 'TASK-0001', 'Schedule Test', 'XYZ', 'Model', '["front"]', '2025-06-01', 'pending', 'medium', ?1, ?1)"#,
            params![now],
        ).expect("insert failed");
        service.schedule_task("task-sched".to_string(), "2025-06-20".to_string(), Some("14:00".to_string()), Some("16:00".to_string()), "test_user").await.expect("schedule_task failed");
        let conn = db.get_connection().unwrap();
        let (sched_date, start_time, end_time): (String, Option<String>, Option<String>) = conn.query_row("SELECT scheduled_date, start_time, end_time FROM tasks WHERE id = 'task-sched'", [], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))).unwrap();
        assert_eq!(sched_date, "2025-06-20");
        assert_eq!(start_time, Some("14:00".to_string()));
        assert_eq!(end_time, Some("16:00".to_string()));
        let event_count: i64 = conn.query_row("SELECT COUNT(*) FROM calendar_events WHERE task_id = 'task-sched' AND deleted_at IS NULL", [], |row| row.get(0)).unwrap();
        assert_eq!(event_count, 1, "Calendar event should be created");
    }

    #[tokio::test]
    async fn test_schedule_task_with_conflict_check_blocks_on_conflict() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");
        let result = service.schedule_task_with_conflict_check("task-new".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("12:00".to_string()), "test_user").await.expect("failed");
        assert!(result.has_conflict, "Should block scheduling on conflict");
    }

    #[tokio::test]
    async fn test_schedule_task_with_options_force_skips_conflicts() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-force", "tech1", "2025-06-14", None, None, "pending");
        let result = service.schedule_task_with_options("task-force".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("12:00".to_string()), "test_user", true).await.expect("failed");
        assert!(!result.has_conflict, "Force mode should always report no conflict");
    }

    #[tokio::test]
    async fn test_schedule_task_with_options_no_force_detects_conflict() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-no-force", "tech1", "2025-06-14", None, None, "pending");
        let result = service.schedule_task_with_options("task-no-force".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("12:00".to_string()), "test_user", false).await.expect("failed");
        assert!(result.has_conflict, "Non-force mode should detect conflict");
    }
}
