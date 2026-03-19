//! CalendarFacade — command/response enums and facade orchestration.

use super::*;
use crate::db::Database;
use crate::domains::calendar::infrastructure::{CalendarEventQueries, CalendarRepository};
use crate::shared::context::RequestContext;
use crate::shared::ipc::errors::AppError as IpcAppError;
use crate::shared::repositories::base::Repository;
use std::sync::Arc;

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

// ── Private helpers ───────────────────────────────────────────────────────────

/// Convert an ISO-8601 date or datetime string (from IPC) to epoch milliseconds.
///
/// Accepts the formats the frontend typically sends: `"YYYY-MM-DD"`,
/// `"YYYY-MM-DDTHH:MM:SS"`, and `"YYYY-MM-DDTHH:MM:SSZ"`.
///
/// When `end_of_day` is `true` a bare date (`"YYYY-MM-DD"`) is treated as
/// `23:59:59` on that day so that the range bound is inclusive.
fn date_str_to_epoch_ms(s: &str, end_of_day: bool) -> i64 {
    use chrono::NaiveDateTime;

    // Try full datetime with trailing Z.
    if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%SZ") {
        return dt.and_utc().timestamp_millis();
    }
    // Try full datetime without Z.
    if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        return dt.and_utc().timestamp_millis();
    }
    // Try date-only: append 00:00:00 or 23:59:59 depending on the bound.
    let suffix = if end_of_day { "T23:59:59" } else { "T00:00:00" };
    let with_time = format!("{}{}", s, suffix);
    if let Ok(dt) = NaiveDateTime::parse_from_str(&with_time, "%Y-%m-%dT%H:%M:%S") {
        return dt.and_utc().timestamp_millis();
    }

    // Last resort: fall back to epoch boundaries so the query stays safe.
    if end_of_day { i64::MAX / 2 } else { 0 }
}

/// Facade for the Calendar bounded context.
pub struct CalendarFacade {
    pub(super) calendar_service: Arc<CalendarService>,
    pub(super) db: Arc<Database>,
}

impl std::fmt::Debug for CalendarFacade {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CalendarFacade").finish()
    }
}

impl CalendarFacade {
    pub fn new(calendar_service: Arc<CalendarService>, db: Arc<Database>) -> Self {
        Self {
            calendar_service,
            db,
        }
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
            CalendarCommand::GetTasks {
                date_range,
                technician_ids,
                statuses,
            } => {
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
                if let (Some(start), Some(end)) =
                    (&event_data.start_datetime, &event_data.end_datetime)
                {
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
            CalendarCommand::GetEventsInRange {
                start_date,
                end_date,
                technician_id,
            } => {
                self.validate_date_range(&start_date, &end_date)?;
                let repo = CalendarRepository::new(self.db.clone());
                let from = date_str_to_epoch_ms(&start_date, false);
                let to = date_str_to_epoch_ms(&end_date, true);
                let tech_id = technician_id.as_deref();
                let events = repo
                    .find_events_in_range(from, to, tech_id)
                    .await
                    .map_err(|e| IpcAppError::internal_sanitized("get_events", &e))?;
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
                    .map_err(|e| {
                        IpcAppError::internal_sanitized("check_scheduling_conflicts", &e)
                    })?;
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
                    .map_err(|e| IpcAppError::internal_sanitized("schedule_task", &e))?;
                Ok(CalendarResponse::Conflict(result))
            }
        }
    }
}
