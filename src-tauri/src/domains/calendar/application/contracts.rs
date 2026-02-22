//! Request contracts for the Calendar bounded context IPC commands.

use crate::domains::calendar::domain::models::calendar::CalendarDateRange;
use crate::domains::calendar::domain::models::calendar_event::{CreateEventInput, UpdateEventInput};
use serde::Deserialize;

/// Get calendar tasks request
#[derive(Deserialize, Debug)]
pub struct GetCalendarTasksRequest {
    pub session_token: String,
    pub date_range: CalendarDateRange,
    pub technician_ids: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Check conflicts request
#[derive(Deserialize, Debug)]
pub struct CheckConflictsRequest {
    pub session_token: String,
    pub task_id: String,
    pub new_date: String,
    pub new_start: Option<String>,
    pub new_end: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Schedule task request - schedules a task updating both task and calendar event
#[derive(Deserialize, Debug)]
pub struct ScheduleTaskRequest {
    pub session_token: String,
    pub task_id: String,
    pub new_date: String,
    pub new_start: Option<String>,
    pub new_end: Option<String>,
    pub force: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

// Request structures for calendar event commands
#[derive(Deserialize, Debug)]
pub struct GetEventByIdRequest {
    pub id: String,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CreateEventRequest {
    pub event_data: CreateEventInput,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateEventRequest {
    pub id: String,
    pub event_data: UpdateEventInput,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct DeleteEventRequest {
    pub id: String,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct GetEventsForTechnicianRequest {
    pub technician_id: String,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct GetEventsForTaskRequest {
    pub task_id: String,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
