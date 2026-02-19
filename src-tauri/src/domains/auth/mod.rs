//! Auth domain — authentication, sessions, tokens, 2FA
//!
//! This module represents the auth bounded context.
//! Auth services are currently provided via `crate::services::auth`
//! and will be migrated into this domain in a future iteration.

mod facade;
#[allow(unused_imports)]
pub(crate) use facade::AuthFacade;

pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
