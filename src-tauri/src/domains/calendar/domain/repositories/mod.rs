//! Repository contracts for the calendar domain (ADR-005).
//!
//! Concrete implementations live in the infrastructure layer.
//! The CalendarEventQueries trait is the domain contract for event queries.

pub use crate::domains::calendar::infrastructure::calendar_repository::CalendarEventQueries;
