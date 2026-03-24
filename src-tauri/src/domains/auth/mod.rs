mod facade;
pub(crate) use facade::AuthFacade;
pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;

// Public re-exports for ts-rs type generation (ADR-015).
pub use application::audit_service::{SecurityAlert, SecurityEventRecord, SecurityMetrics};
pub use domain::models::auth::SessionTimeoutConfig;
