//! Calendar event repository implementation
//!
//! Provides consistent database access patterns for CalendarEvent entities.

use crate::db::Database;
use crate::domains::calendar::domain::models::calendar_event::{
    CalendarEvent, CreateEventInput, EventStatus, EventType, UpdateEventInput,
};
use crate::repositories::base::{RepoError, RepoResult, Repository};
use async_trait::async_trait;
use rusqlite::params;
use serde_json;
use std::sync::Arc;

/// Calendar event repository for database operations
pub struct CalendarEventRepository {
    db: Arc<Database>,
}

impl CalendarEventRepository {
    /// Create a new CalendarEventRepository
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Find events within a date range
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

    /// Find events for a specific technician
    pub async fn find_by_technician(&self, technician_id: &str) -> RepoResult<Vec<CalendarEvent>> {
        self.db
            .query_as(
                r#"
            SELECT
                id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events
            WHERE deleted_at IS NULL
            AND technician_id = ?
            ORDER BY start_datetime ASC
            "#,
                params![technician_id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to query events by technician: {}", e))
            })
    }

    /// Find events linked to a specific task
    pub async fn find_by_task(&self, task_id: &str) -> RepoResult<Vec<CalendarEvent>> {
        self.db
            .query_as(
                r#"
            SELECT
                id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events
            WHERE deleted_at IS NULL
            AND task_id = ?
            ORDER BY start_datetime ASC
            "#,
                params![task_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to query events by task: {}", e)))
    }

    /// Find events of type 'task'
    pub async fn find_tasks(&self) -> RepoResult<Vec<CalendarEvent>> {
        self.db
            .query_as(
                r#"
            SELECT
                id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events
            WHERE deleted_at IS NULL
            AND event_type = 'task'
            ORDER BY start_datetime ASC
            "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to query task events: {}", e)))
    }

    /// Check for conflicts with existing events
    /// Uses canonical overlap formula: two intervals [A_start, A_end) and [B_start, B_end)
    /// overlap iff A_start < B_end AND A_end > B_start.
    pub async fn check_conflicts(
        &self,
        start_datetime: &str,
        end_datetime: &str,
        technician_id: Option<&str>,
        exclude_event_id: Option<&str>,
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
            AND status != 'cancelled'
            AND start_datetime < ? AND end_datetime > ?
        "#
        .to_string();

        let mut params_vec: Vec<rusqlite::types::Value> = vec![
            end_datetime.to_string().into(),
            start_datetime.to_string().into(),
        ];

        if let Some(tech_id) = technician_id {
            sql.push_str(" AND technician_id = ?");
            params_vec.push(tech_id.to_string().into());
        }

        if let Some(exclude_id) = exclude_event_id {
            sql.push_str(" AND id != ?");
            params_vec.push(exclude_id.to_string().into());
        }

        sql.push_str(" ORDER BY start_datetime ASC");

        self.db
            .query_as(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to check conflicts: {}", e)))
    }

    /// Create a new calendar event
    pub async fn create(
        &self,
        input: CreateEventInput,
        created_by: Option<String>,
    ) -> RepoResult<CalendarEvent> {
        let id = uuid::Uuid::new_v4().to_string();
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
            0i32.into(), // is_recurring
            None::<String>.into(),
            None::<String>.into(),
            reminders_json.into(),
            "confirmed".to_string().into(),
            input.color.into(),
            tags_json.into(),
            input.notes.into(),
            0i32.into(), // synced
            now.into(),
            now.into(),
            created_by.clone().into(),
            created_by.into(),
        ];

        self.db.execute(
            r#"
            INSERT INTO calendar_events (
                id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, created_at, updated_at, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            rusqlite::params_from_iter(params_vec)
        ).map_err(|e| RepoError::Database(format!("Failed to create calendar event: {}", e)))?;

        // Return the created event
        self.find_by_id(id)
            .await?
            .ok_or_else(|| RepoError::Database("Failed to retrieve created event".to_string()))
    }

    /// Update an existing calendar event
    pub async fn update(
        &self,
        id: &str,
        input: UpdateEventInput,
        updated_by: Option<String>,
    ) -> RepoResult<Option<CalendarEvent>> {
        let now = chrono::Utc::now().timestamp_millis();

        // Build dynamic update query
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
            let event_type_str = match event_type {
                EventType::Meeting => "meeting",
                EventType::Appointment => "appointment",
                EventType::Task => "task",
                EventType::Reminder => "reminder",
                EventType::Other => "other",
            };
            sql.push_str(", event_type = ?");
            params_vec.push(event_type_str.to_string().into());
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
            let participants_json = serde_json::to_string(participants).map_err(|e| {
                RepoError::Database(format!("Failed to serialize participants: {}", e))
            })?;
            sql.push_str(", participants = ?");
            params_vec.push(participants_json.into());
        }
        if let Some(status) = &input.status {
            let status_str = match status {
                EventStatus::Confirmed => "confirmed",
                EventStatus::Tentative => "tentative",
                EventStatus::Cancelled => "cancelled",
            };
            sql.push_str(", status = ?");
            params_vec.push(status_str.to_string().into());
        }
        if let Some(reminders) = &input.reminders {
            let reminders_json = serde_json::to_string(reminders).map_err(|e| {
                RepoError::Database(format!("Failed to serialize reminders: {}", e))
            })?;
            sql.push_str(", reminders = ?");
            params_vec.push(reminders_json.into());
        }
        if let Some(color) = &input.color {
            sql.push_str(", color = ?");
            params_vec.push(color.clone().into());
        }
        if let Some(tags) = &input.tags {
            let tags_json = serde_json::to_string(tags)
                .map_err(|e| RepoError::Database(format!("Failed to serialize tags: {}", e)))?;
            sql.push_str(", tags = ?");
            params_vec.push(tags_json.into());
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
                r#"
            SELECT
                id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events
            WHERE id = ? AND deleted_at IS NULL
            "#,
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find calendar event by id: {}", e)))
    }

    async fn find_all(&self) -> RepoResult<Vec<CalendarEvent>> {
        self.db
            .query_as(
                r#"
            SELECT
                id, title, description, start_datetime, end_datetime, all_day, timezone,
                event_type, category, task_id, client_id, technician_id, location, meeting_link,
                is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
                reminders, status, color, tags, notes, synced, last_synced_at,
                created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
            FROM calendar_events
            WHERE deleted_at IS NULL
            ORDER BY start_datetime ASC
            "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all calendar events: {}", e)))
    }

    async fn save(&self, entity: CalendarEvent) -> RepoResult<CalendarEvent> {
        // Check if event exists
        let exists = self.exists_by_id(entity.id.clone()).await?;

        if exists {
            // Update existing event
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
            // Create new event
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
        let rows_affected = self.db.execute(
            "UPDATE calendar_events SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
            params![now, now, id]
        ).map_err(|e| RepoError::Database(format!("Failed to delete calendar event: {}", e)))?;

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
