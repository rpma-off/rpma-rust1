//! Clients domain — client management, contact info
//!
//! This module represents the clients bounded context.
//! Client services are currently provided via `crate::services::client`
//! and will be migrated into this domain in a future iteration.

mod facade;
#[allow(unused_imports)]
pub(crate) use facade::ClientsFacade;

pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
