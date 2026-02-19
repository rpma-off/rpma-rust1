//! Audit/Security domain — audit trails, security monitoring, and alerts
//!
//! This module represents the audit bounded context.
//! Audit services are currently provided via `crate::services::audit_service`
//! and will be migrated into this domain in a future iteration.

mod facade;
#[allow(unused_imports)]
pub(crate) use facade::AuditFacade;

pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
