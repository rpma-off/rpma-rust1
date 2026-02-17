//! Calendar domain — scheduling, planning, and calendar events
//!
//! This module re-exports all calendar-related components across layers.

// Public facade
pub use crate::services::calendar::CalendarService;

// Models
pub(crate) use crate::models::calendar::{
    CalendarDateRange, CalendarFilter, CalendarTask, ConflictDetection,
};
pub(crate) use crate::models::calendar_event::{CalendarEvent, EventStatus, EventType};

// Services
pub(crate) use crate::services::calendar_event_service::CalendarEventService;
