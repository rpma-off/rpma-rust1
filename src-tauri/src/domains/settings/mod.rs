//! Settings domain — user preferences and system configuration
//!
//! This module represents the settings bounded context.
//! Settings services are currently provided via `crate::services::settings`
//! and will be migrated into this domain in a future iteration.

mod facade;
#[allow(unused_imports)]
pub(crate) use facade::SettingsFacade;

pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
