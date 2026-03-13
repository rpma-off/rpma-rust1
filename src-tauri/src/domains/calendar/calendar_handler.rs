//! Calendar domain — repository, service, facade, IPC request DTOs, and Tauri commands.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::db::Database;
use crate::domains::calendar::models::*;
use crate::resolve_context;
use crate::shared::context::RequestContext;
use crate::shared::ipc::errors::AppError as IpcAppError;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use async_trait::async_trait;
use rusqlite::params;
use serde::Deserialize;
use serde_json;
use std::sync::Arc;
use tracing::{info, instrument};

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

// ── Calendar repository ───────────────────────────────────────────────────────

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

        let mut sql = String::from(
            "SELECT * FROM calendar_tasks \
             WHERE technician_id = ?1 \
             AND scheduled_date = ?2 \
             AND id != ?3 \
             AND status NOT IN ('completed', 'cancelled')",
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
                    params![new_date, new_start, new_end, now, user_id, task_id],
                )
                .map_err(|e| format!("Failed to update task schedule: {}", e))?;

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
                    tx.execute(
                        "UPDATE calendar_events SET start_datetime = ?1, end_datetime = ?2, \
                         updated_at = ?3, updated_by = ?4 WHERE id = ?5",
                        params![start_datetime, end_datetime, now, user_id, event_id],
                    )
                    .map_err(|e| format!("Failed to update calendar event: {}", e))?;
                } else {
                    let event_id = crate::shared::utils::uuid::generate_uuid_string();
                    let (task_title, technician_id): (String, Option<String>) = tx
                        .query_row(
                            "SELECT COALESCE(title, task_number), technician_id FROM tasks WHERE id = ?1",
                            params![task_id],
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
}

// ── Calendar event repository ─────────────────────────────────────────────────

/// Repository for CalendarEvent entities.
pub struct CalendarEventRepository {
    db: Arc<Database>,
}

impl CalendarEventRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Find events within a date range.
    pub async fn find_by_date_range(
        &self,
        start_date: &str,
        end_date: &str,
        technician_id: Option<&str>,
    ) -> RepoResult<Vec<CalendarEvent>> {
        let mut sql = r#"
            SELECT
                id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events
            WHERE deleted_at IS NULL
            AND start_datetime >= ?
            AND end_datetime <= ?
        "#
        .to_string();

        let mut params_vec: Vec<rusqlite::types::Value> =
            vec![start_date.to_string().into(), end_date.to_string().into()];

        if let Some(tech_id) = technician_id {
            sql.push_str(" AND technician_id = ?");
            params_vec.push(tech_id.to_string().into());
        }

        sql.push_str(" ORDER BY start_datetime ASC");

        self.db
            .query_as(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| {
                RepoError::Database(format!("Failed to query events by date range: {}", e))
            })
    }

    /// Find events for a specific technician.
    pub async fn find_by_technician(&self, technician_id: &str) -> RepoResult<Vec<CalendarEvent>> {
        self.db
            .query_as(
                r#"SELECT id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events WHERE deleted_at IS NULL AND technician_id = ?
            ORDER BY start_datetime ASC"#,
                params![technician_id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to query events by technician: {}", e))
            })
    }

    /// Find events linked to a specific task.
    pub async fn find_by_task(&self, task_id: &str) -> RepoResult<Vec<CalendarEvent>> {
        self.db
            .query_as(
                r#"SELECT id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events WHERE deleted_at IS NULL AND task_id = ?
            ORDER BY start_datetime ASC"#,
                params![task_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to query events by task: {}", e)))
    }

    /// Create a new calendar event.
    pub async fn create(
        &self,
        input: CreateEventInput,
        created_by: Option<String>,
    ) -> RepoResult<CalendarEvent> {
        let id = crate::shared::utils::uuid::generate_uuid_string();
        let now = chrono::Utc::now().timestamp_millis();

        let participants_json = serde_json::to_string(&input.participants.unwrap_or_default())
            .map_err(|e| RepoError::Database(format!("Failed to serialize participants: {}", e)))?;
        let reminders_json = serde_json::to_string(&input.reminders.unwrap_or_default())
            .map_err(|e| RepoError::Database(format!("Failed to serialize reminders: {}", e)))?;
        let tags_json = serde_json::to_string(&input.tags.unwrap_or_default())
            .map_err(|e| RepoError::Database(format!("Failed to serialize tags: {}", e)))?;

        let event_type_str = match input.event_type.unwrap_or(EventType::Meeting) {
            EventType::Meeting => "meeting",
            EventType::Appointment => "appointment",
            EventType::Task => "task",
            EventType::Reminder => "reminder",
            EventType::Other => "other",
        };

        let params_vec: Vec<rusqlite::types::Value> = vec![
            id.clone().into(),
            input.title.into(),
            input.description.into(),
            input.start_datetime.into(),
            input.end_datetime.into(),
            (input.all_day.unwrap_or(false) as i32).into(),
            input.timezone.unwrap_or_else(|| "UTC".to_string()).into(),
            event_type_str.to_string().into(),
            input.category.into(),
            input.task_id.into(),
            input.client_id.into(),
            input.technician_id.into(),
            input.location.into(),
            input.meeting_link.into(),
            (input.is_virtual.unwrap_or(false) as i32).into(),
            participants_json.into(),
            0i32.into(),
            None::<String>.into(),
            None::<String>.into(),
            reminders_json.into(),
            "confirmed".to_string().into(),
            input.color.into(),
            tags_json.into(),
            input.notes.into(),
            0i32.into(),
            now.into(),
            now.into(),
            created_by.clone().into(),
            created_by.into(),
        ];

        self.db.execute(
            r#"INSERT INTO calendar_events (
                id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, created_at, updated_at, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
            rusqlite::params_from_iter(params_vec)
        ).map_err(|e| RepoError::Database(format!("Failed to create calendar event: {}", e)))?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| RepoError::Database("Failed to retrieve created event".to_string()))
    }

    /// Update an existing calendar event.
    pub async fn update(
        &self,
        id: &str,
        input: UpdateEventInput,
        updated_by: Option<String>,
    ) -> RepoResult<Option<CalendarEvent>> {
        let now = chrono::Utc::now().timestamp_millis();
        let mut sql = "UPDATE calendar_events SET updated_at = ?, updated_by = ?".to_string();
        let mut params_vec: Vec<rusqlite::types::Value> = vec![now.into(), updated_by.into()];

        if let Some(title) = &input.title {
            sql.push_str(", title = ?");
            params_vec.push(title.clone().into());
        }
        if let Some(description) = &input.description {
            sql.push_str(", description = ?");
            params_vec.push(description.clone().into());
        }
        if let Some(start_datetime) = &input.start_datetime {
            sql.push_str(", start_datetime = ?");
            params_vec.push(start_datetime.clone().into());
        }
        if let Some(end_datetime) = &input.end_datetime {
            sql.push_str(", end_datetime = ?");
            params_vec.push(end_datetime.clone().into());
        }
        if let Some(all_day) = input.all_day {
            sql.push_str(", all_day = ?");
            params_vec.push(all_day.into());
        }
        if let Some(timezone) = &input.timezone {
            sql.push_str(", timezone = ?");
            params_vec.push(timezone.clone().into());
        }
        if let Some(event_type) = &input.event_type {
            let s = match event_type {
                EventType::Meeting => "meeting",
                EventType::Appointment => "appointment",
                EventType::Task => "task",
                EventType::Reminder => "reminder",
                EventType::Other => "other",
            };
            sql.push_str(", event_type = ?");
            params_vec.push(s.to_string().into());
        }
        if let Some(category) = &input.category {
            sql.push_str(", category = ?");
            params_vec.push(category.clone().into());
        }
        if let Some(task_id) = &input.task_id {
            sql.push_str(", task_id = ?");
            params_vec.push(task_id.clone().into());
        }
        if let Some(client_id) = &input.client_id {
            sql.push_str(", client_id = ?");
            params_vec.push(client_id.clone().into());
        }
        if let Some(location) = &input.location {
            sql.push_str(", location = ?");
            params_vec.push(location.clone().into());
        }
        if let Some(meeting_link) = &input.meeting_link {
            sql.push_str(", meeting_link = ?");
            params_vec.push(meeting_link.clone().into());
        }
        if let Some(is_virtual) = input.is_virtual {
            sql.push_str(", is_virtual = ?");
            params_vec.push(is_virtual.into());
        }
        if let Some(participants) = &input.participants {
            let j = serde_json::to_string(participants).map_err(|e| {
                RepoError::Database(format!("Failed to serialize participants: {}", e))
            })?;
            sql.push_str(", participants = ?");
            params_vec.push(j.into());
        }
        if let Some(status) = &input.status {
            let s = match status {
                EventStatus::Confirmed => "confirmed",
                EventStatus::Tentative => "tentative",
                EventStatus::Cancelled => "cancelled",
            };
            sql.push_str(", status = ?");
            params_vec.push(s.to_string().into());
        }
        if let Some(reminders) = &input.reminders {
            let j = serde_json::to_string(reminders).map_err(|e| {
                RepoError::Database(format!("Failed to serialize reminders: {}", e))
            })?;
            sql.push_str(", reminders = ?");
            params_vec.push(j.into());
        }
        if let Some(color) = &input.color {
            sql.push_str(", color = ?");
            params_vec.push(color.clone().into());
        }
        if let Some(tags) = &input.tags {
            let j = serde_json::to_string(tags)
                .map_err(|e| RepoError::Database(format!("Failed to serialize tags: {}", e)))?;
            sql.push_str(", tags = ?");
            params_vec.push(j.into());
        }
        if let Some(notes) = &input.notes {
            sql.push_str(", notes = ?");
            params_vec.push(notes.clone().into());
        }

        sql.push_str(" WHERE id = ? AND deleted_at IS NULL");
        params_vec.push(id.to_string().into());

        let rows_affected = self
            .db
            .execute(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to update calendar event: {}", e)))?;

        if rows_affected > 0 {
            self.find_by_id(id.to_string()).await
        } else {
            Ok(None)
        }
    }
}

#[async_trait]
impl Repository<CalendarEvent, String> for CalendarEventRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<CalendarEvent>> {
        self.db
            .query_single_as(
                r#"SELECT id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events WHERE id = ? AND deleted_at IS NULL"#,
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find calendar event by id: {}", e)))
    }

    async fn find_all(&self) -> RepoResult<Vec<CalendarEvent>> {
        self.db
            .query_as(
                r#"SELECT id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events WHERE deleted_at IS NULL ORDER BY start_datetime ASC"#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all calendar events: {}", e)))
    }

    async fn save(&self, entity: CalendarEvent) -> RepoResult<CalendarEvent> {
        let exists = self.exists_by_id(entity.id.clone()).await?;
        if exists {
            let update_input = UpdateEventInput {
                title: Some(entity.title),
                description: entity.description,
                start_datetime: Some(entity.start_datetime),
                end_datetime: Some(entity.end_datetime),
                all_day: Some(entity.all_day),
                timezone: Some(entity.timezone),
                event_type: Some(entity.event_type),
                category: entity.category,
                task_id: entity.task_id,
                client_id: entity.client_id,
                location: entity.location,
                meeting_link: entity.meeting_link,
                is_virtual: Some(entity.is_virtual),
                participants: Some(entity.participants),
                status: Some(entity.status),
                reminders: Some(entity.reminders),
                color: entity.color,
                tags: Some(entity.tags),
                notes: entity.notes,
            };
            self.update(&entity.id, update_input, entity.updated_by)
                .await?
                .ok_or_else(|| RepoError::Database("Failed to update calendar event".to_string()))
        } else {
            let create_input = CreateEventInput {
                title: entity.title,
                description: entity.description,
                start_datetime: entity.start_datetime,
                end_datetime: entity.end_datetime,
                all_day: Some(entity.all_day),
                timezone: Some(entity.timezone),
                event_type: Some(entity.event_type),
                category: entity.category,
                task_id: entity.task_id,
                client_id: entity.client_id,
                technician_id: entity.technician_id,
                location: entity.location,
                meeting_link: entity.meeting_link,
                is_virtual: Some(entity.is_virtual),
                participants: Some(entity.participants),
                reminders: Some(entity.reminders),
                color: entity.color,
                tags: Some(entity.tags),
                notes: entity.notes,
            };
            self.create(create_input, entity.created_by).await
        }
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let now = chrono::Utc::now().timestamp_millis();
        let rows_affected = self
            .db
            .execute(
                "UPDATE calendar_events SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
                params![now, now, id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete calendar event: {}", e)))?;
        Ok(rows_affected > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM calendar_events WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to check calendar event existence: {}", e))
            })?;
        Ok(count > 0)
    }
}

// ── Calendar service ──────────────────────────────────────────────────────────

/// Business logic for calendar scheduling and conflict detection.
pub struct CalendarService {
    repo: CalendarRepository,
}

impl CalendarService {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repo: CalendarRepository::new(db),
        }
    }

    pub async fn get_tasks(
        &self,
        date_range: CalendarDateRange,
        technician_ids: Option<Vec<String>>,
        statuses: Option<Vec<String>>,
    ) -> Result<Vec<CalendarTask>, AppError> {
        self.repo
            .get_tasks(&date_range, technician_ids.as_deref(), statuses.as_deref())
    }

    pub async fn check_conflicts(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
    ) -> Result<ConflictDetection, AppError> {
        if task_id.trim().is_empty() {
            return Err(AppError::Validation("task_id is required".to_string()));
        }
        if new_date.trim().is_empty() {
            return Err(AppError::Validation("new_date is required".to_string()));
        }

        let technician_id = self.repo.get_technician_for_task(&task_id)?;

        if technician_id.is_none() {
            return Ok(ConflictDetection {
                has_conflict: false,
                conflict_type: None,
                conflicting_tasks: vec![],
                message: None,
            });
        }

        let tech_id = technician_id.unwrap();
        let conflicts = self.repo.find_conflicting_tasks(
            &tech_id,
            &new_date,
            &task_id,
            new_start.as_deref(),
            new_end.as_deref(),
        )?;

        let has_conflict = !conflicts.is_empty();
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

    pub async fn schedule_task(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
    ) -> Result<(), AppError> {
        if task_id.trim().is_empty() {
            return Err(AppError::Validation("task_id is required".to_string()));
        }
        if new_date.trim().is_empty() {
            return Err(AppError::Validation("new_date is required".to_string()));
        }
        if chrono::NaiveDate::parse_from_str(new_date.trim(), "%Y-%m-%d").is_err() {
            return Err(AppError::Validation(
                "new_date must be in YYYY-MM-DD format".to_string(),
            ));
        }
        self.repo.upsert_schedule(
            &task_id,
            &new_date,
            new_start.as_deref(),
            new_end.as_deref(),
            user_id,
        )
    }

    pub async fn schedule_task_with_conflict_check(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
    ) -> Result<ConflictDetection, AppError> {
        let conflicts = self
            .check_conflicts(
                task_id.clone(),
                new_date.clone(),
                new_start.clone(),
                new_end.clone(),
            )
            .await?;

        if conflicts.has_conflict {
            return Ok(conflicts);
        }

        self.schedule_task(task_id, new_date, new_start, new_end, user_id)
            .await?;

        Ok(ConflictDetection {
            has_conflict: false,
            conflict_type: None,
            conflicting_tasks: vec![],
            message: None,
        })
    }

    pub async fn schedule_task_with_options(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
        force: bool,
    ) -> Result<ConflictDetection, AppError> {
        if force {
            self.schedule_task(task_id, new_date, new_start, new_end, user_id)
                .await?;
            Ok(ConflictDetection {
                has_conflict: false,
                conflict_type: None,
                conflicting_tasks: vec![],
                message: None,
            })
        } else {
            self.schedule_task_with_conflict_check(task_id, new_date, new_start, new_end, user_id)
                .await
        }
    }
}

// ── Facade ────────────────────────────────────────────────────────────────────

/// Command enum for the Calendar bounded context.
pub enum CalendarCommand {
    GetTasks {
        date_range: CalendarDateRange,
        technician_ids: Option<Vec<String>>,
        statuses: Option<Vec<String>>,
    },
    GetEventById {
        id: String,
    },
    CreateEvent {
        event_data: CreateEventInput,
    },
    UpdateEvent {
        id: String,
        event_data: UpdateEventInput,
    },
    DeleteEvent {
        id: String,
    },
    GetEventsForTechnician {
        technician_id: String,
    },
    GetEventsForTask {
        task_id: String,
    },
    GetEventsInRange {
        start_date: String,
        end_date: String,
        technician_id: Option<String>,
    },
    CheckConflicts {
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
    },
    ScheduleTask {
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        force: bool,
    },
}

/// Response enum for the Calendar bounded context.
pub enum CalendarResponse {
    Tasks(Vec<CalendarTask>),
    OptionalEvent(Option<CalendarEvent>),
    Event(CalendarEvent),
    Deleted(bool),
    Events(Vec<CalendarEvent>),
    Conflict(ConflictDetection),
}

/// Facade for the Calendar bounded context.
pub struct CalendarFacade {
    calendar_service: Arc<CalendarService>,
    db: Arc<Database>,
}

impl std::fmt::Debug for CalendarFacade {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CalendarFacade").finish()
    }
}

impl CalendarFacade {
    pub fn new(calendar_service: Arc<CalendarService>, db: Arc<Database>) -> Self {
        Self { calendar_service, db }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    pub fn calendar_service(&self) -> &Arc<CalendarService> {
        &self.calendar_service
    }

    pub fn validate_date_range(&self, start_date: &str, end_date: &str) -> Result<(), IpcAppError> {
        if start_date.trim().is_empty() || end_date.trim().is_empty() {
            return Err(IpcAppError::Validation(
                "Both start_date and end_date are required".to_string(),
            ));
        }
        if start_date > end_date {
            return Err(IpcAppError::Validation(
                "start_date must be before end_date".to_string(),
            ));
        }
        Ok(())
    }

    pub async fn execute(
        &self,
        command: CalendarCommand,
        ctx: &RequestContext,
    ) -> Result<CalendarResponse, IpcAppError> {
        match command {
            CalendarCommand::GetTasks { date_range, technician_ids, statuses } => {
                let tasks = self
                    .calendar_service
                    .get_tasks(date_range, technician_ids, statuses)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("get_calendar_tasks", &e))?;
                Ok(CalendarResponse::Tasks(tasks))
            }
            CalendarCommand::GetEventById { id } => {
                let repo = CalendarEventRepository::new(self.db.clone());
                let event = repo
                    .find_by_id(id)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("get_calendar_event", &e))?;
                Ok(CalendarResponse::OptionalEvent(event))
            }
            CalendarCommand::CreateEvent { event_data } => {
                if event_data.title.trim().is_empty() {
                    return Err(IpcAppError::Validation(
                        "Event title cannot be empty".to_string(),
                    ));
                }
                if event_data.start_datetime >= event_data.end_datetime {
                    return Err(IpcAppError::Validation(
                        "Event start time must be before end time".to_string(),
                    ));
                }
                let repo = CalendarEventRepository::new(self.db.clone());
                let event = repo
                    .create(event_data, Some(ctx.auth.user_id.clone()))
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("create_calendar_event", &e))?;
                Ok(CalendarResponse::Event(event))
            }
            CalendarCommand::UpdateEvent { id, event_data } => {
                if let (Some(start), Some(end)) = (&event_data.start_datetime, &event_data.end_datetime) {
                    if start >= end {
                        return Err(IpcAppError::Validation(
                            "Event start time must be before end time".to_string(),
                        ));
                    }
                }
                let repo = CalendarEventRepository::new(self.db.clone());
                let event = repo
                    .update(&id, event_data, Some(ctx.auth.user_id.clone()))
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("update_calendar_event", &e))?;
                Ok(CalendarResponse::OptionalEvent(event))
            }
            CalendarCommand::DeleteEvent { id } => {
                let repo = CalendarEventRepository::new(self.db.clone());
                let deleted = repo
                    .delete_by_id(id)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("delete_calendar_event", &e))?;
                Ok(CalendarResponse::Deleted(deleted))
            }
            CalendarCommand::GetEventsForTechnician { technician_id } => {
                let repo = CalendarEventRepository::new(self.db.clone());
                let events = repo
                    .find_by_technician(&technician_id)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("get_technician_events", &e))?;
                Ok(CalendarResponse::Events(events))
            }
            CalendarCommand::GetEventsForTask { task_id } => {
                let repo = CalendarEventRepository::new(self.db.clone());
                let events = repo
                    .find_by_task(&task_id)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("get_task_events", &e))?;
                Ok(CalendarResponse::Events(events))
            }
            CalendarCommand::GetEventsInRange { start_date, end_date, technician_id } => {
                self.validate_date_range(&start_date, &end_date)?;
                let repo = CalendarEventRepository::new(self.db.clone());
                let tech_id = technician_id.as_deref();
                let events = repo
                    .find_by_date_range(&start_date, &end_date, tech_id)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("get_events", &e))?;
                Ok(CalendarResponse::Events(events))
            }
            CalendarCommand::CheckConflicts { task_id, new_date, new_start, new_end } => {
                let conflicts = self
                    .calendar_service
                    .check_conflicts(task_id, new_date, new_start, new_end)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("check_scheduling_conflicts", &e))?;
                Ok(CalendarResponse::Conflict(conflicts))
            }
            CalendarCommand::ScheduleTask { task_id, new_date, new_start, new_end, force } => {
                let result = self
                    .calendar_service
                    .schedule_task_with_options(task_id, new_date, new_start, new_end, &ctx.auth.user_id, force)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("schedule_task", &e))?;
                Ok(CalendarResponse::Conflict(result))
            }
        }
    }
}

// ── IPC helpers ───────────────────────────────────────────────────────────────

fn calendar_context(
    state: &AppState<'_>,
    correlation_id: &Option<String>,
) -> Result<RequestContext, AppError> {
    let ctx = resolve_context!(state, correlation_id);
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", ctx.auth.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }
    Ok(ctx)
}

fn facade(state: &AppState<'_>) -> CalendarFacade {
    let service = CalendarService::new(state.db.clone());
    CalendarFacade::new(std::sync::Arc::new(service), state.db.clone())
}

// ── IPC commands ──────────────────────────────────────────────────────────────

#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_get_tasks(
    request: GetCalendarTasksRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarTask>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("calendar_get_tasks command received");
    match facade(&state)
        .execute(CalendarCommand::GetTasks {
            date_range: request.date_range,
            technician_ids: request.technician_ids,
            statuses: request.statuses,
        }, &ctx).await?
    {
        CalendarResponse::Tasks(tasks) => Ok(ApiResponse::success(tasks).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_event_by_id(
    request: GetEventByIdRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("get_event_by_id command received");
    match facade(&state).execute(CalendarCommand::GetEventById { id: request.id }, &ctx).await? {
        CalendarResponse::OptionalEvent(event) => Ok(ApiResponse::success(event).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn create_event(
    request: CreateEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<CalendarEvent>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("create_event command received");
    match facade(&state).execute(CalendarCommand::CreateEvent { event_data: request.event_data }, &ctx).await? {
        CalendarResponse::Event(event) => Ok(ApiResponse::success(event).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_event(
    request: UpdateEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("update_event command received");
    match facade(&state)
        .execute(CalendarCommand::UpdateEvent { id: request.id, event_data: request.event_data }, &ctx)
        .await?
    {
        CalendarResponse::OptionalEvent(event) => Ok(ApiResponse::success(event).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn delete_event(
    request: DeleteEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("delete_event command received");
    match facade(&state).execute(CalendarCommand::DeleteEvent { id: request.id }, &ctx).await? {
        CalendarResponse::Deleted(deleted) => Ok(ApiResponse::success(deleted).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events_for_technician(
    request: GetEventsForTechnicianRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("get_events_for_technician command received");
    match facade(&state)
        .execute(CalendarCommand::GetEventsForTechnician { technician_id: request.technician_id }, &ctx)
        .await?
    {
        CalendarResponse::Events(events) => Ok(ApiResponse::success(events).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events_for_task(
    request: GetEventsForTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("get_events_for_task command received");
    match facade(&state)
        .execute(CalendarCommand::GetEventsForTask { task_id: request.task_id }, &ctx)
        .await?
    {
        CalendarResponse::Events(events) => Ok(ApiResponse::success(events).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events(
    start_date: String,
    end_date: String,
    technician_id: Option<String>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &correlation_id)?;
    info!("get_events command received");
    match facade(&state)
        .execute(CalendarCommand::GetEventsInRange { start_date, end_date, technician_id }, &ctx)
        .await?
    {
        CalendarResponse::Events(events) => Ok(ApiResponse::success(events).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_check_conflicts(
    request: CheckConflictsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ConflictDetection>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("calendar_check_conflicts command received");
    match facade(&state)
        .execute(CalendarCommand::CheckConflicts {
            task_id: request.task_id,
            new_date: request.new_date,
            new_start: request.new_start,
            new_end: request.new_end,
        }, &ctx).await?
    {
        CalendarResponse::Conflict(conflicts) => Ok(ApiResponse::success(conflicts).with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_schedule_task(
    request: ScheduleTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ConflictDetection>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
    info!("calendar_schedule_task command received");
    match facade(&state)
        .execute(CalendarCommand::ScheduleTask {
            task_id: request.task_id,
            new_date: request.new_date,
            new_start: request.new_start,
            new_end: request.new_end,
            force: request.force.unwrap_or(false),
        }, &ctx).await?
    {
        CalendarResponse::Conflict(result) => {
            if result.has_conflict {
                let msg = result.message.unwrap_or_else(|| {
                    format!("Scheduling conflict: {} task(s) overlap", result.conflicting_tasks.len())
                });
                return Err(AppError::Validation(msg));
            }
            Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected calendar facade response".to_string())),
    }
}

// ── Inline tests (migrated from infrastructure/calendar.rs) ──────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::TestDatabase;
    use rusqlite::params;

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
