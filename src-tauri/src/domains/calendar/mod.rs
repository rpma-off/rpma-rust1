//! Calendar domain — scheduling, planning, and calendar events
//!
//! This module represents the calendar bounded context.
//! Calendar services are currently provided via `crate::services::calendar`
//! and will be migrated into this domain in a future iteration.

mod facade;
#[allow(unused_imports)]
pub(crate) use facade::CalendarFacade;

pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
