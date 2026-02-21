//! Application layer for the Calendar bounded context.

pub mod contracts;

pub use contracts::{
    CheckConflictsRequest, CreateEventRequest, DeleteEventRequest, GetCalendarTasksRequest,
    GetEventByIdRequest, GetEventsForTaskRequest, GetEventsForTechnicianRequest,
    ScheduleTaskRequest, UpdateEventRequest,
};
