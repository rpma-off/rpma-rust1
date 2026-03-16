//! CalendarRepository — tasks and scheduling database operations.

use super::*;
use crate::commands::AppError;
use crate::db::Database;
use crate::domains::calendar::models::*;
use crate::domains::tasks::domain::models::task::TaskStatus;
use std::sync::Arc;

/// Repository for calendar-related database operations (tasks + scheduling).
pub struct CalendarRepository {
    db: Arc<Database>,
}

impl CalendarRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Fetch calendar tasks filtered by date range, technicians, and statuses.
    pub fn get_tasks(
        &self,
        date_range: &CalendarDateRange,
        technician_ids: Option<&[String]>,
        statuses: Option<&[String]>,
    ) -> Result<Vec<CalendarTask>, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut sql =
            String::from("SELECT * FROM calendar_tasks WHERE scheduled_date BETWEEN ?1 AND ?2");
        let mut dyn_params: Vec<Box<dyn rusqlite::ToSql>> = vec![
            Box::new(date_range.start_date.clone()),
            Box::new(date_range.end_date.clone()),
        ];

        if let Some(tech_ids) = technician_ids {
            if !tech_ids.is_empty() {
                let placeholders = crate::shared::utils::sql::in_clause_placeholders(tech_ids);
                sql.push_str(&format!(" AND technician_id IN ({})", placeholders));
                for id in tech_ids {
                    dyn_params.push(Box::new(id.clone()));
                }
            }
        }

        if let Some(statuses) = statuses {
            if !statuses.is_empty() {
                let placeholders = crate::shared::utils::sql::in_clause_placeholders(statuses);
                sql.push_str(&format!(" AND status IN ({})", placeholders));
                for status in statuses {
                    dyn_params.push(Box::new(status.clone()));
                }
            }
        }

        sql.push_str(" ORDER BY scheduled_date, start_time");

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let tasks = stmt
            .query_map(rusqlite::params_from_iter(dyn_params), |row| {
                Ok(CalendarTask {
                    id: row.get(0)?,
                    task_number: row.get(1)?,
                    title: row.get(2)?,
                    status: row
                        .get::<_, String>(3)?
                        .parse::<CalendarTaskStatus>()
                        .unwrap_or(CalendarTaskStatus::Draft),
                    priority: row
                        .get::<_, String>(4)?
                        .parse::<CalendarTaskPriority>()
                        .unwrap_or(CalendarTaskPriority::Medium),
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

    /// Return the technician assigned to a task, or None if unassigned.
    pub fn get_technician_for_task(&self, task_id: &str) -> Result<Option<String>, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(e.to_string()))?;

        let technician_id: Option<String> = conn
            .query_row(
                "SELECT technician_id FROM tasks WHERE id = ?1",
                [task_id],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(technician_id)
    }

    /// Find tasks that overlap with the proposed time slot for a given technician.
    pub fn find_conflicting_tasks(
        &self,
        tech_id: &str,
        new_date: &str,
        task_id: &str,
        new_start: Option<&str>,
        new_end: Option<&str>,
    ) -> Result<Vec<CalendarTask>, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(e.to_string()))?;

        // SAFETY: format! uses only TaskStatus::to_string() values — no user input.
        let completed = TaskStatus::Completed.to_string();
        let cancelled = TaskStatus::Cancelled.to_string();
        let mut sql = format!(
            "SELECT * FROM calendar_tasks \
             WHERE technician_id = ?1 \
             AND scheduled_date = ?2 \
             AND id != ?3 \
             AND status NOT IN ('{completed}', '{cancelled}')",
            completed = completed,
            cancelled = cancelled,
        );

        if new_start.is_some() && new_end.is_some() {
            sql.push_str(
                " AND (\
                    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < ?5 AND end_time > ?4)\
                    OR (start_time IS NOT NULL AND end_time IS NULL AND start_time >= ?4 AND start_time < ?5)\
                )",
            );
        }

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::Database(e.to_string()))?;

        use crate::db::FromSqlRow;
        let conflicts: Vec<CalendarTask> = if let (Some(start), Some(end)) = (new_start, new_end) {
            stmt.query_map([tech_id, new_date, task_id, start, end], |row| {
                CalendarTask::from_row(row)
            })?
            .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([tech_id, new_date, task_id], |row| {
                CalendarTask::from_row(row)
            })?
            .collect::<Result<Vec<_>, _>>()?
        };

        Ok(conflicts)
    }

    /// Update task schedule and upsert the associated calendar event in a single transaction.
    pub fn upsert_schedule(
        &self,
        task_id: &str,
        new_date: &str,
        new_start: Option<&str>,
        new_end: Option<&str>,
        user_id: &str,
    ) -> Result<(), AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let task_id = task_id.to_string();
        let new_date = new_date.to_string();
        let new_start = new_start.map(str::to_string);
        let new_end = new_end.map(str::to_string);
        let user_id = user_id.to_string();

        self.db
            .with_transaction(move |tx| {
                tx.execute(
                    "UPDATE tasks SET scheduled_date = ?1, start_time = ?2, end_time = ?3, \
                     updated_at = ?4, updated_by = ?5 WHERE id = ?6",
                    rusqlite::params![new_date, new_start, new_end, now, user_id, task_id],
                )
                .map_err(|e| format!("Failed to update task schedule: {}", e))?;

                let existing_event_id: Option<String> = tx
                    .query_row(
                        "SELECT id FROM calendar_events WHERE task_id = ?1 AND deleted_at IS NULL",
                        rusqlite::params![task_id],
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
                    tx.execute(
                        "UPDATE calendar_events SET start_datetime = ?1, end_datetime = ?2, \
                         updated_at = ?3, updated_by = ?4 WHERE id = ?5",
                        rusqlite::params![start_datetime, end_datetime, now, user_id, event_id],
                    )
                    .map_err(|e| format!("Failed to update calendar event: {}", e))?;
                } else {
                    let event_id = crate::shared::utils::uuid::generate_uuid_string();
                    let (task_title, technician_id): (String, Option<String>) = tx
                        .query_row(
                            "SELECT COALESCE(title, task_number), technician_id FROM tasks WHERE id = ?1",
                            rusqlite::params![task_id],
                            |row| Ok((row.get(0)?, row.get(1)?)),
                        )
                        .unwrap_or_else(|_| (format!("Task {}", task_id), None));

                    tx.execute(
                        r#"INSERT INTO calendar_events
                            (id, title, start_datetime, end_datetime, all_day, timezone,
                             event_type, task_id, technician_id, is_recurring, is_virtual,
                             participants, reminders, status, tags, synced,
                             created_at, updated_at, created_by, updated_by)
                           VALUES (?1, ?2, ?3, ?4, 0, 'UTC', 'task', ?5, ?6, 0, 0,
                                   '[]', '[]', 'confirmed', '[]', 0, ?7, ?7, ?8, ?8)"#,
                        rusqlite::params![
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
}
