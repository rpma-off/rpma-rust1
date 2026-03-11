use std::fmt;
use std::sync::Arc;

use crate::domains::calendar::domain::models::calendar::{
    CalendarDateRange, CalendarTask, ConflictDetection,
};
use crate::domains::calendar::domain::models::calendar_event::{
    CalendarEvent, CreateEventInput, UpdateEventInput,
};
use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::domains::calendar::infrastructure::calendar_event_repository::CalendarEventRepository;
use crate::shared::repositories::base::Repository;
use crate::shared::context::RequestContext;
use crate::shared::ipc::errors::AppError;

/// TODO: document
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

/// TODO: document
pub enum CalendarResponse {
    Tasks(Vec<CalendarTask>),
    OptionalEvent(Option<CalendarEvent>),
    Event(CalendarEvent),
    Deleted(bool),
    Events(Vec<CalendarEvent>),
    Conflict(ConflictDetection),
}

/// Facade for the Calendar bounded context.
///
/// Provides scheduling, conflict detection, and calendar event management
/// with input validation and error mapping.
pub struct CalendarFacade {
    calendar_service: Arc<CalendarService>,
    db: Arc<crate::db::Database>,
}

impl fmt::Debug for CalendarFacade {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CalendarFacade").finish()
    }
}

impl CalendarFacade {
    /// TODO: document
    pub fn new(calendar_service: Arc<CalendarService>, db: Arc<crate::db::Database>) -> Self {
        Self {
            calendar_service,
            db,
        }
    }

    /// TODO: document
    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying calendar service.
    pub fn calendar_service(&self) -> &Arc<CalendarService> {
        &self.calendar_service
    }

    /// Validate date range parameters for calendar queries.
    pub fn validate_date_range(&self, start_date: &str, end_date: &str) -> Result<(), AppError> {
        if start_date.trim().is_empty() || end_date.trim().is_empty() {
            return Err(AppError::Validation(
                "Both start_date and end_date are required".to_string(),
            ));
        }
        if start_date > end_date {
            return Err(AppError::Validation(
                "start_date must be before end_date".to_string(),
            ));
        }
        Ok(())
    }

    /// TODO: document
    pub async fn execute(
        &self,
        command: CalendarCommand,
        ctx: &RequestContext,
    ) -> Result<CalendarResponse, AppError> {
        match command {
            CalendarCommand::GetTasks {
                date_range,
                technician_ids,
                statuses,
            } => {
                let tasks = self
                    .calendar_service
                    .get_tasks(date_range, technician_ids, statuses)
                    .await
                    .map_err(|e| AppError::internal_sanitized("get_calendar_tasks", &e))?;
                Ok(CalendarResponse::Tasks(tasks))
            }
            CalendarCommand::GetEventById { id } => {
                let repo = CalendarEventRepository::new(self.db.clone());
                let event = repo
                    .find_by_id(id)
                    .await
                    .map_err(|e| AppError::internal_sanitized("get_calendar_event", &e))?;
                Ok(CalendarResponse::OptionalEvent(event))
            }
            CalendarCommand::CreateEvent { event_data } => {
                if event_data.title.trim().is_empty() {
                    return Err(AppError::Validation(
                        "Event title cannot be empty".to_string(),
                    ));
                }
                if event_data.start_datetime >= event_data.end_datetime {
                    return Err(AppError::Validation(
                        "Event start time must be before end time".to_string(),
                    ));
                }
                let repo = CalendarEventRepository::new(self.db.clone());
                let event = repo
                    .create(event_data, Some(ctx.auth.user_id.clone()))
                    .await
                    .map_err(|e| AppError::internal_sanitized("create_calendar_event", &e))?;
                Ok(CalendarResponse::Event(event))
            }
            CalendarCommand::UpdateEvent { id, event_data } => {
                if let (Some(start), Some(end)) = (&event_data.start_datetime, &event_data.end_datetime) {
                    if start >= end {
                        return Err(AppError::Validation(
                            "Event start time must be before end time".to_string(),
                        ));
                    }
                }
                let repo = CalendarEventRepository::new(self.db.clone());
                let event = repo
                    .update(&id, event_data, Some(ctx.auth.user_id.clone()))
                    .await
                    .map_err(|e| AppError::internal_sanitized("update_calendar_event", &e))?;
                Ok(CalendarResponse::OptionalEvent(event))
            }
            CalendarCommand::DeleteEvent { id } => {
                let repo = CalendarEventRepository::new(self.db.clone());
                let deleted = repo
                    .delete_by_id(id)
                    .await
                    .map_err(|e| AppError::internal_sanitized("delete_calendar_event", &e))?;
                Ok(CalendarResponse::Deleted(deleted))
            }
            CalendarCommand::GetEventsForTechnician { technician_id } => {
                let repo = CalendarEventRepository::new(self.db.clone());
                let events = repo
                    .find_by_technician(&technician_id)
                    .await
                    .map_err(|e| AppError::internal_sanitized("get_technician_events", &e))?;
                Ok(CalendarResponse::Events(events))
            }
            CalendarCommand::GetEventsForTask { task_id } => {
                let repo = CalendarEventRepository::new(self.db.clone());
                let events = repo
                    .find_by_task(&task_id)
                    .await
                    .map_err(|e| AppError::internal_sanitized("get_task_events", &e))?;
                Ok(CalendarResponse::Events(events))
            }
            CalendarCommand::GetEventsInRange {
                start_date,
                end_date,
                technician_id,
            } => {
                self.validate_date_range(&start_date, &end_date)?;
                let repo = CalendarEventRepository::new(self.db.clone());
                let tech_id = technician_id.as_deref();
                let events = repo
                    .find_by_date_range(&start_date, &end_date, tech_id)
                    .await
                    .map_err(|e| AppError::internal_sanitized("get_events", &e))?;
                Ok(CalendarResponse::Events(events))
            }
            CalendarCommand::CheckConflicts {
                task_id,
                new_date,
                new_start,
                new_end,
            } => {
                let conflicts = self
                    .calendar_service
                    .check_conflicts(task_id, new_date, new_start, new_end)
                    .await
                    .map_err(|e| AppError::internal_sanitized("check_scheduling_conflicts", &e))?;
                Ok(CalendarResponse::Conflict(conflicts))
            }
            CalendarCommand::ScheduleTask {
                task_id,
                new_date,
                new_start,
                new_end,
                force,
            } => {
                let result = self
                    .calendar_service
                    .schedule_task_with_options(
                        task_id,
                        new_date,
                        new_start,
                        new_end,
                        &ctx.auth.user_id,
                        force,
                    )
                    .await
                    .map_err(|e| AppError::internal_sanitized("schedule_task", &e))?;
                Ok(CalendarResponse::Conflict(result))
            }
        }
    }
}
