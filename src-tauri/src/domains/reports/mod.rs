//! Reports domain — report generation, analytics, exports
//!
//! This module represents the reports bounded context.
//! Report services are currently provided via `crate::services::report_jobs`
//! and will be migrated into this domain in a future iteration.

mod facade;
#[allow(unused_imports)]
pub(crate) use facade::ReportsFacade;

pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
