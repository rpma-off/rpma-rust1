// Application layer for the Calendar bounded context.
//
// Re-exports the public IPC contracts for calendar operations.

pub use crate::domains::calendar::ipc::calendar::{
    CheckConflictsRequest, CreateEventRequest, DeleteEventRequest, GetCalendarTasksRequest,
    GetEventByIdRequest, GetEventsForTaskRequest, GetEventsForTechnicianRequest,
    ScheduleTaskRequest, UpdateEventRequest,
};
