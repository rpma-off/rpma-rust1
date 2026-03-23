//! Application layer for the calendar domain (ADR-001).
//!
//! CalendarService owns business logic (conflict detection, scheduling).
//! CalendarFacade provides the command/response orchestration pattern.

pub use crate::domains::calendar::calendar_handler::service::*;
pub use crate::domains::calendar::calendar_handler::facade::*;
