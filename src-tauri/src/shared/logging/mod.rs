//! Shared logging helpers for bounded contexts.
//!
//! This module fences the legacy top-level `crate::logging` module behind a
//! shared entry point so bounded contexts can depend on `shared::logging`.

pub mod audit_log_handler;
pub mod audit_repository;
pub mod audit_service;

pub use crate::logging::correlation;
pub use crate::logging::{LogDomain, RPMARequestLogger};

#[cfg(test)]
mod tests {
    use super::correlation;

    #[test]
    fn shared_logging_re_exports_correlation_helpers() {
        let correlation_id = correlation::generate_correlation_id();
        assert!(correlation::is_valid_correlation_id(&correlation_id));
    }
}
