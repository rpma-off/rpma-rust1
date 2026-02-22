//! Calendar event service implementation
//!
//! Provides business logic for calendar event operations.

use crate::commands::{AppError, AppResult};
use crate::db::Database;
use crate::domains::calendar::domain::models::calendar_event::{CalendarEvent, CreateEventInput, UpdateEventInput};
use crate::repositories::base::Repository;
use crate::domains::calendar::infrastructure::calendar_event_repository::CalendarEventRepository;
use std::sync::Arc;

/// Calendar event service for business logic operations
pub struct CalendarEventService {
    repository: CalendarEventRepository,
}

impl CalendarEventService {
    /// Create a new CalendarEventService
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repository: CalendarEventRepository::new(db),
        }
    }

    /// Get events within a date range
    pub async fn get_events_in_range(
        &self,
        start_date: String,
        end_date: String,
        technician_id: Option<String>,
    ) -> AppResult<Vec<CalendarEvent>> {
        let tech_id = technician_id.as_deref();
        self.repository
            .find_by_date_range(&start_date, &end_date, tech_id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to get events in range: {}", e)))
    }

    /// Get a single event by ID
    pub async fn get_event_by_id(&self, id: String) -> AppResult<Option<CalendarEvent>> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to get event by ID: {}", e)))
    }

    /// Create a new calendar event
    pub async fn create_event(
        &self,
        input: CreateEventInput,
        created_by: Option<String>,
    ) -> AppResult<CalendarEvent> {
        // Basic validation
        if input.title.trim().is_empty() {
            return Err(AppError::Validation(
                "Event title cannot be empty".to_string(),
            ));
        }

        if input.start_datetime >= input.end_datetime {
            return Err(AppError::Validation(
                "Event start time must be before end time".to_string(),
            ));
        }

        self.repository
            .create(input, created_by)
            .await
            .map_err(|e| AppError::Database(format!("Failed to create event: {}", e)))
    }

    /// Update an existing calendar event
    pub async fn update_event(
        &self,
        id: String,
        input: UpdateEventInput,
        updated_by: Option<String>,
    ) -> AppResult<Option<CalendarEvent>> {
        // Basic validation
        if let (Some(start), Some(end)) = (&input.start_datetime, &input.end_datetime) {
            if start >= end {
                return Err(AppError::Validation(
                    "Event start time must be before end time".to_string(),
                ));
            }
        }

        self.repository
            .update(&id, input, updated_by)
            .await
            .map_err(|e| AppError::Database(format!("Failed to update event: {}", e)))
    }

    /// Delete a calendar event (soft delete)
    pub async fn delete_event(&self, id: String) -> AppResult<bool> {
        self.repository
            .delete_by_id(id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to delete event: {}", e)))
    }

    /// Get all events for a specific technician
    pub async fn get_events_for_technician(
        &self,
        technician_id: String,
    ) -> AppResult<Vec<CalendarEvent>> {
        self.repository
            .find_by_technician(&technician_id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to get events for technician: {}", e)))
    }

    /// Get all events linked to a specific task
    pub async fn get_events_for_task(&self, task_id: String) -> AppResult<Vec<CalendarEvent>> {
        self.repository
            .find_by_task(&task_id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to get events for task: {}", e)))
    }

    /// Get all calendar events
    pub async fn get_all_events(&self) -> AppResult<Vec<CalendarEvent>> {
        self.repository
            .find_all()
            .await
            .map_err(|e| AppError::Database(format!("Failed to get all events: {}", e)))
    }

    /// Get all task events
    pub async fn get_task_events(&self) -> AppResult<Vec<CalendarEvent>> {
        self.repository
            .find_tasks()
            .await
            .map_err(|e| AppError::Database(format!("Failed to get task events: {}", e)))
    }

    /// Check for scheduling conflicts
    pub async fn check_conflicts(
        &self,
        start_datetime: String,
        end_datetime: String,
        technician_id: Option<String>,
        exclude_event_id: Option<String>,
    ) -> AppResult<Vec<CalendarEvent>> {
        // Basic validation
        if start_datetime >= end_datetime {
            return Err(AppError::Validation(
                "Start time must be before end time".to_string(),
            ));
        }

        let tech_id = technician_id.as_deref();
        let exclude_id = exclude_event_id.as_deref();

        self.repository
            .check_conflicts(&start_datetime, &end_datetime, tech_id, exclude_id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to check conflicts: {}", e)))
    }
}
