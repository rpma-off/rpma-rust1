use crate::commands::AppError;
use crate::db::{Database, FromSqlRow};
use crate::models::calendar::*;
use rusqlite::params;
use std::sync::Arc;

pub struct CalendarService {
    db: Arc<Database>,
}

impl CalendarService {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub async fn get_tasks(
        &self,
        date_range: CalendarDateRange,
        technician_ids: Option<Vec<String>>,
        statuses: Option<Vec<String>>,
    ) -> Result<Vec<CalendarTask>, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut sql =
            String::from("SELECT * FROM calendar_tasks WHERE scheduled_date BETWEEN ?1 AND ?2");

        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![
            Box::new(date_range.start_date.clone()),
            Box::new(date_range.end_date.clone()),
        ];

        // Add technician filter
        if let Some(tech_ids) = &technician_ids {
            if !tech_ids.is_empty() {
                let placeholders = tech_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                sql.push_str(&format!(" AND technician_id IN ({})", placeholders));
                for id in tech_ids {
                    params.push(Box::new(id.clone()));
                }
            }
        }

        // Add status filter
        if let Some(statuses) = &statuses {
            if !statuses.is_empty() {
                let placeholders = statuses.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                sql.push_str(&format!(" AND status IN ({})", placeholders));
                for status in statuses {
                    params.push(Box::new(status.clone()));
                }
            }
        }

        sql.push_str(" ORDER BY scheduled_date, start_time");

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let tasks = stmt
            .query_map(rusqlite::params_from_iter(params), |row| {
                Ok(CalendarTask {
                    id: row.get(0)?,
                    task_number: row.get(1)?,
                    title: row.get(2)?,
                    status: row
                        .get::<_, String>(3)?
                        .parse::<crate::models::task::TaskStatus>()
                        .unwrap_or(crate::models::task::TaskStatus::Draft),
                    priority: row
                        .get::<_, String>(4)?
                        .parse::<crate::models::task::TaskPriority>()
                        .unwrap_or(crate::models::task::TaskPriority::Medium),
                    scheduled_date: row.get(5)?,
                    start_time: row.get(6)?,
                    end_time: row.get(7)?,
                    vehicle_plate: row.get(8)?,
                    vehicle_model: row.get(9)?,
                    technician_id: row.get(10)?,
                    technician_name: row.get(11)?,
                    client_id: row.get(12)?,
                    client_name: row.get(13)?,
                    estimated_duration: row.get(14)?,
                    actual_duration: row.get(15)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(tasks)
    }

    pub async fn check_conflicts(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
    ) -> Result<ConflictDetection, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(e.to_string()))?;

        // Get technician for this task
        let technician_id: Option<String> = conn
            .query_row(
                "SELECT technician_id FROM tasks WHERE id = ?1",
                [&task_id],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        if technician_id.is_none() {
            return Ok(ConflictDetection {
                has_conflict: false,
                conflict_type: None,
                conflicting_tasks: vec![],
                message: None,
            });
        }

        let tech_id = technician_id.unwrap();

        // Find overlapping tasks for same technician
        let mut sql = String::from(
            "SELECT * FROM calendar_tasks 
             WHERE technician_id = ?1 
             AND scheduled_date = ?2 
             AND id != ?3
             AND status NOT IN ('completed', 'cancelled')",
        );

        // Canonical overlap: two intervals [A_start, A_end) and [B_start, B_end) overlap
        // iff A_start < B_end AND A_end > B_start.
        // Here new=[?4,?5) and existing=[start_time,end_time).
        // Also match events with NULL end_time that start within the new range.
        if new_start.is_some() && new_end.is_some() {
            sql.push_str(
                " AND (
                    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < ?5 AND end_time > ?4)
                    OR (start_time IS NOT NULL AND end_time IS NULL AND start_time >= ?4 AND start_time < ?5)
                )",
            );
        }

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let conflicts: Vec<CalendarTask> = if let (Some(start), Some(end)) = (&new_start, &new_end)
        {
            stmt.query_map([&tech_id, &new_date, &task_id, start, end], |row| {
                CalendarTask::from_row(row)
            })?
            .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([&tech_id, &new_date, &task_id], |row| {
                CalendarTask::from_row(row)
            })?
            .collect::<Result<Vec<_>, _>>()?
        };

        let has_conflict = !conflicts.is_empty();

        // Build detailed conflict message listing which events overlap
        let message = if has_conflict {
            let details: Vec<String> = conflicts
                .iter()
                .map(|c| {
                    let time_range = match (&c.start_time, &c.end_time) {
                        (Some(s), Some(e)) => format!("{}-{}", s, e),
                        (Some(s), None) => format!("{}-?", s),
                        _ => "all day".to_string(),
                    };
                    format!("'{}' ({})", c.title, time_range)
                })
                .collect();
            Some(format!(
                "Technician has {} conflicting task(s) on {}: {}",
                conflicts.len(),
                new_date,
                details.join(", ")
            ))
        } else {
            None
        };

        Ok(ConflictDetection {
            has_conflict,
            conflict_type: if has_conflict {
                Some("time_overlap".to_string())
            } else {
                None
            },
            conflicting_tasks: conflicts,
            message,
        })
    }

    /// Schedule a task: updates both tasks.scheduled_date and calendar_events
    /// within a single transaction for consistency.
    pub async fn schedule_task(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
    ) -> Result<(), AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let task_id_clone = task_id.clone();
        let new_date_clone = new_date.clone();
        let new_start_clone = new_start.clone();
        let new_end_clone = new_end.clone();
        let user_id_owned = user_id.to_string();

        self.db
            .with_transaction(move |tx| {
                // 1. Update tasks.scheduled_date, start_time, end_time
                tx.execute(
                    "UPDATE tasks SET scheduled_date = ?1, start_time = ?2, end_time = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?6",
                    params![new_date_clone, new_start_clone, new_end_clone, now, user_id_owned, task_id_clone],
                )
                .map_err(|e| format!("Failed to update task schedule: {}", e))?;

                // 2. Update or insert calendar_events linked to this task
                let existing_event_id: Option<String> = tx
                    .query_row(
                        "SELECT id FROM calendar_events WHERE task_id = ?1 AND deleted_at IS NULL",
                        params![task_id],
                        |row| row.get(0),
                    )
                    .ok();

                let start_datetime = match &new_start {
                    Some(t) => format!("{}T{}:00", new_date, t),
                    None => format!("{}T00:00:00", new_date),
                };
                let end_datetime = match &new_end {
                    Some(t) => format!("{}T{}:00", new_date, t),
                    None => format!("{}T23:59:59", new_date),
                };

                if let Some(event_id) = existing_event_id {
                    // Update existing calendar event
                    tx.execute(
                        "UPDATE calendar_events SET start_datetime = ?1, end_datetime = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?5",
                        params![start_datetime, end_datetime, now, user_id, event_id],
                    )
                    .map_err(|e| format!("Failed to update calendar event: {}", e))?;
                } else {
                    // Create new calendar event for this task
                    let event_id = uuid::Uuid::new_v4().to_string();
                    let task_title: String = tx
                        .query_row(
                            "SELECT COALESCE(title, task_number) FROM tasks WHERE id = ?1",
                            params![task_id],
                            |row| row.get(0),
                        )
                        .unwrap_or_else(|_| format!("Task {}", task_id));
                    let technician_id: Option<String> = tx
                        .query_row(
                            "SELECT technician_id FROM tasks WHERE id = ?1",
                            params![task_id],
                            |row| row.get(0),
                        )
                        .ok();

                    tx.execute(
                        r#"INSERT INTO calendar_events
                            (id, title, start_datetime, end_datetime, all_day, timezone,
                             event_type, task_id, technician_id, is_recurring, is_virtual,
                             participants, reminders, status, tags, synced,
                             created_at, updated_at, created_by, updated_by)
                           VALUES (?1, ?2, ?3, ?4, 0, 'UTC', 'task', ?5, ?6, 0, 0,
                                   '[]', '[]', 'confirmed', '[]', 0, ?7, ?7, ?8, ?8)"#,
                        params![
                            event_id,
                            task_title,
                            start_datetime,
                            end_datetime,
                            task_id,
                            technician_id,
                            now,
                            user_id
                        ],
                    )
                    .map_err(|e| format!("Failed to create calendar event: {}", e))?;
                }

                Ok(())
            })
            .map_err(|e| AppError::Database(e))
    }

    /// Schedule a task with conflict check: checks for conflicts first, then
    /// updates both tasks and calendar_events in a single transaction.
    pub async fn schedule_task_with_conflict_check(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
    ) -> Result<ConflictDetection, AppError> {
        // Check for conflicts first
        let conflicts = self
            .check_conflicts(task_id.clone(), new_date.clone(), new_start.clone(), new_end.clone())
            .await?;

        if conflicts.has_conflict {
            return Ok(conflicts);
        }

        // No conflicts: proceed with scheduling
        self.schedule_task(task_id, new_date, new_start, new_end, user_id)
            .await?;

        Ok(ConflictDetection {
            has_conflict: false,
            conflict_type: None,
            conflicting_tasks: vec![],
            message: None,
        })
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::TestDatabase;

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
        let now = chrono::Utc::now().timestamp_millis();
        let task_number = format!("TASK-{}", &id[..4]);
        db.execute(
            r#"INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model,
                ppf_zones, scheduled_date, start_time, end_time, technician_id, status,
                priority, created_at, updated_at)
               VALUES (?1, ?2, ?3, 'ABC123', 'Test Model', '["front"]', ?4, ?5, ?6, ?7, ?8, 'medium', ?9, ?9)"#,
            params![id, task_number, format!("Task {}", id), date, start, end, tech_id, status, now],
        )
        .expect("Failed to insert test task");
    }

    // --- Overlapping vs Adjacent Events ---

    #[tokio::test]
    async fn test_overlap_detected_when_times_overlap() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        // Existing task: 09:00-11:00
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        // New task: 10:00-12:00 (overlaps)
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("12:00".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(result.has_conflict, "Should detect overlap");
        assert_eq!(result.conflicting_tasks.len(), 1);
        assert_eq!(result.conflicting_tasks[0].id, "task-existing");
        assert!(result.message.unwrap().contains("Task task-existing"));
    }

    #[tokio::test]
    async fn test_no_conflict_for_adjacent_events() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        // Existing task: 09:00-10:00
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("10:00"), "pending");
        // New task: 10:00-11:00 (adjacent, not overlapping)
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("11:00".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(!result.has_conflict, "Adjacent events should NOT conflict");
        assert!(result.conflicting_tasks.is_empty());
    }

    #[tokio::test]
    async fn test_overlap_when_new_contains_existing() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        // Existing task: 10:00-11:00
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("10:00"), Some("11:00"), "pending");
        // New task: 09:00-12:00 (fully contains existing)
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("12:00".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(result.has_conflict, "Should detect when new fully contains existing");
    }

    #[tokio::test]
    async fn test_overlap_when_existing_contains_new() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        // Existing task: 09:00-12:00
        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("12:00"), "pending");
        // New task: 10:00-11:00 (fully inside existing)
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("10:00".to_string()), Some("11:00".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(result.has_conflict, "Should detect when existing fully contains new");
    }

    // --- Multi-technician Isolation ---

    #[tokio::test]
    async fn test_no_conflict_across_different_technicians() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        // tech1 task: 09:00-11:00
        insert_test_task(&db, "task-tech1", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        // tech2 task (same time): should NOT conflict
        insert_test_task(&db, "task-tech2", "tech2", "2025-06-15", None, None, "pending");

        let result = service
            .check_conflicts("task-tech2".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("11:00".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(!result.has_conflict, "Different technicians should NOT conflict");
    }

    #[tokio::test]
    async fn test_conflict_same_technician_different_tasks() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        // Two tasks for the same technician overlapping
        insert_test_task(&db, "task-a", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-b", "tech1", "2025-06-15", Some("10:00"), Some("12:00"), "pending");
        insert_test_task(&db, "task-c", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .check_conflicts("task-c".to_string(), "2025-06-15".to_string(), Some("10:30".to_string()), Some("11:30".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(result.has_conflict, "Same technician should conflict with overlapping tasks");
        assert_eq!(result.conflicting_tasks.len(), 2, "Should find both overlapping tasks");
    }

    // --- Completed/Cancelled tasks should not conflict ---

    #[tokio::test]
    async fn test_no_conflict_with_completed_task() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        insert_test_task(&db, "task-done", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "completed");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("11:00".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(!result.has_conflict, "Completed tasks should not cause conflicts");
    }

    #[tokio::test]
    async fn test_no_conflict_with_cancelled_task() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        insert_test_task(&db, "task-cancel", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "cancelled");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .check_conflicts("task-new".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("11:00".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(!result.has_conflict, "Cancelled tasks should not cause conflicts");
    }

    // --- Date-only conflict detection (no times) ---

    #[tokio::test]
    async fn test_date_only_conflict_detection() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        // Without time params, any task on the same date for the same tech is a conflict
        let result = service
            .check_conflicts("task-new".to_string(), "2025-06-15".to_string(), None, None)
            .await
            .expect("check_conflicts failed");

        assert!(result.has_conflict, "Date-only check should flag same-date tasks");
    }

    // --- No technician assigned ---

    #[tokio::test]
    async fn test_no_conflict_when_no_technician() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        // Task with no technician
        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            r#"INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model,
                ppf_zones, scheduled_date, status, priority, created_at, updated_at)
               VALUES ('task-no-tech', 'TASK-0001', 'Unassigned', 'XYZ', 'Model', '["front"]', '2025-06-15', 'pending', 'medium', ?1, ?1)"#,
            params![now],
        ).expect("insert failed");

        let result = service
            .check_conflicts("task-no-tech".to_string(), "2025-06-15".to_string(), Some("09:00".to_string()), Some("11:00".to_string()))
            .await
            .expect("check_conflicts failed");

        assert!(!result.has_conflict, "Task with no technician should never conflict");
    }

    // --- schedule_task transactional consistency ---

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

        service
            .schedule_task(
                "task-sched".to_string(),
                "2025-06-20".to_string(),
                Some("14:00".to_string()),
                Some("16:00".to_string()),
                "test_user",
            )
            .await
            .expect("schedule_task failed");

        // Verify task was updated
        let conn = db.get_connection().unwrap();
        let (sched_date, start_time, end_time): (String, Option<String>, Option<String>) = conn
            .query_row(
                "SELECT scheduled_date, start_time, end_time FROM tasks WHERE id = 'task-sched'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        assert_eq!(sched_date, "2025-06-20");
        assert_eq!(start_time, Some("14:00".to_string()));
        assert_eq!(end_time, Some("16:00".to_string()));

        // Verify calendar event was created
        let event_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM calendar_events WHERE task_id = 'task-sched' AND deleted_at IS NULL",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(event_count, 1, "Calendar event should be created");

        let (evt_start, evt_end): (String, String) = conn
            .query_row(
                "SELECT start_datetime, end_datetime FROM calendar_events WHERE task_id = 'task-sched' AND deleted_at IS NULL",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(evt_start, "2025-06-20T14:00:00");
        assert_eq!(evt_end, "2025-06-20T16:00:00");
    }

    #[tokio::test]
    async fn test_schedule_task_updates_existing_calendar_event() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            r#"INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model,
                ppf_zones, scheduled_date, status, priority, created_at, updated_at)
               VALUES ('task-sched2', 'TASK-0002', 'Schedule Update', 'XYZ', 'Model', '["front"]', '2025-06-01', 'pending', 'medium', ?1, ?1)"#,
            params![now],
        ).expect("insert failed");

        // Create an existing calendar event for this task
        db.execute(
            r#"INSERT INTO calendar_events
                (id, title, start_datetime, end_datetime, all_day, timezone, event_type, task_id,
                 is_recurring, is_virtual, participants, reminders, status, tags, synced, created_at, updated_at)
               VALUES ('evt-1', 'Schedule Update', '2025-06-01T09:00:00', '2025-06-01T10:00:00', 0, 'UTC', 'task', 'task-sched2',
                       0, 0, '[]', '[]', 'confirmed', '[]', 0, ?1, ?1)"#,
            params![now],
        ).expect("insert event failed");

        // Reschedule
        service
            .schedule_task(
                "task-sched2".to_string(),
                "2025-07-01".to_string(),
                Some("15:00".to_string()),
                Some("17:00".to_string()),
                "test_user",
            )
            .await
            .expect("schedule_task failed");

        // Verify calendar event was updated (not a new one created)
        let conn = db.get_connection().unwrap();
        let event_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM calendar_events WHERE task_id = 'task-sched2' AND deleted_at IS NULL",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(event_count, 1, "Should update existing, not create new");

        let (evt_start, evt_end): (String, String) = conn
            .query_row(
                "SELECT start_datetime, end_datetime FROM calendar_events WHERE task_id = 'task-sched2' AND deleted_at IS NULL",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(evt_start, "2025-07-01T15:00:00");
        assert_eq!(evt_end, "2025-07-01T17:00:00");
    }

    // --- schedule_task_with_conflict_check ---

    #[tokio::test]
    async fn test_schedule_task_with_conflict_check_blocks_on_conflict() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("11:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .schedule_task_with_conflict_check(
                "task-new".to_string(),
                "2025-06-15".to_string(),
                Some("10:00".to_string()),
                Some("12:00".to_string()),
                "test_user",
            )
            .await
            .expect("schedule_task_with_conflict_check failed");

        assert!(result.has_conflict, "Should block scheduling on conflict");

        // Verify task was NOT updated
        let conn = db.get_connection().unwrap();
        let sched_date: Option<String> = conn
            .query_row(
                "SELECT scheduled_date FROM tasks WHERE id = 'task-new'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(sched_date, Some("2025-06-15".to_string()));
    }

    #[tokio::test]
    async fn test_schedule_task_with_conflict_check_succeeds_without_conflict() {
        let (db, _test_db) = setup_test_db();
        let service = CalendarService::new(db.clone());

        insert_test_task(&db, "task-existing", "tech1", "2025-06-15", Some("09:00"), Some("10:00"), "pending");
        insert_test_task(&db, "task-new", "tech1", "2025-06-15", None, None, "pending");

        let result = service
            .schedule_task_with_conflict_check(
                "task-new".to_string(),
                "2025-06-15".to_string(),
                Some("10:00".to_string()),
                Some("12:00".to_string()),
                "test_user",
            )
            .await
            .expect("schedule_task_with_conflict_check failed");

        assert!(!result.has_conflict, "Adjacent events should allow scheduling");
    }
}
