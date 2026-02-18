//! Tasks domain — task CRUD, status transitions, assignments.
//!
//! Task services are currently provided via `crate::services::task`
//! and will be migrated into this domain in a future iteration.

pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
