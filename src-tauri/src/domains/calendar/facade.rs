use std::fmt;
use std::sync::Arc;

use crate::domains::calendar::domain::models::calendar::{
    CalendarDateRange, CalendarTask, ConflictDetection,
};
use crate::domains::calendar::domain::models::calendar_event::{
    CalendarEvent, CreateEventInput, UpdateEventInput,
};
use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::domains::calendar::infrastructure::calendar_event_service::CalendarEventService;
use crate::shared::ipc::errors::AppError;
use crate::shared::ipc::CommandContext;

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
        ctx: &CommandContext,
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
                let service = CalendarEventService::new(self.db.clone());
                let event = service
                    .get_event_by_id(id)
                    .await
                    .map_err(|e| AppError::internal_sanitized("get_calendar_event", &e))?;
                Ok(CalendarResponse::OptionalEvent(event))
            }
            CalendarCommand::CreateEvent { event_data } => {
                let service = CalendarEventService::new(self.db.clone());
                let event = service
                    .create_event(event_data, Some(ctx.session.user_id.clone()))
                    .await?;
                Ok(CalendarResponse::Event(event))
            }
            CalendarCommand::UpdateEvent { id, event_data } => {
                let service = CalendarEventService::new(self.db.clone());
                let event = service
                    .update_event(id, event_data, Some(ctx.session.user_id.clone()))
                    .await?;
                Ok(CalendarResponse::OptionalEvent(event))
            }
            CalendarCommand::DeleteEvent { id } => {
                let service = CalendarEventService::new(self.db.clone());
                let deleted = service
                    .delete_event(id)
                    .await
                    .map_err(|e| AppError::internal_sanitized("delete_calendar_event", &e))?;
                Ok(CalendarResponse::Deleted(deleted))
            }
            CalendarCommand::GetEventsForTechnician { technician_id } => {
                let service = CalendarEventService::new(self.db.clone());
                let events = service
                    .get_events_for_technician(technician_id)
                    .await
                    .map_err(|e| AppError::internal_sanitized("get_technician_events", &e))?;
                Ok(CalendarResponse::Events(events))
            }
            CalendarCommand::GetEventsForTask { task_id } => {
                let service = CalendarEventService::new(self.db.clone());
                let events = service
                    .get_events_for_task(task_id)
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
                let service = CalendarEventService::new(self.db.clone());
                let events = service
                    .get_events_in_range(start_date, end_date, technician_id)
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
                        &ctx.session.user_id,
                        force,
                    )
                    .await
                    .map_err(|e| AppError::internal_sanitized("schedule_task", &e))?;
                Ok(CalendarResponse::Conflict(result))
            }
        }
    }
}
