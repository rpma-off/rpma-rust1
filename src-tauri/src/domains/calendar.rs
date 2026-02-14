//! Calendar domain — scheduling, planning, and calendar events
//!
//! This module re-exports all calendar-related components across layers.

// Models
pub use crate::models::calendar::{
    CalendarDateRange, CalendarFilter, CalendarTask, ConflictDetection,
};
pub use crate::models::calendar_event::{CalendarEvent, EventStatus, EventType};

// Services
pub use crate::services::calendar::CalendarService;
pub use crate::services::calendar_event_service::CalendarEventService;

// Repositories
pub use crate::repositories::calendar_event_repository::CalendarEventRepository;
