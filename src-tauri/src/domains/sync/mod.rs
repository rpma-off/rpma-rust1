//! Sync domain — offline queue and background synchronization
//!
//! This module represents the sync bounded context.
//! Sync services are currently provided via `crate::sync`
//! and will be migrated into this domain in a future iteration.

mod facade;
#[allow(unused_imports)]
pub(crate) use facade::SyncFacade;

pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
