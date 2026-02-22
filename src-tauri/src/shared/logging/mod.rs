//! Shared logging helpers for bounded contexts.
//!
//! This module fences the legacy top-level `crate::logging` module behind a
//! shared entry point so bounded contexts can depend on `shared::logging`.

pub use crate::logging::{
    clear_global_logger, get_global_logger, set_global_logger, LogDomain, LogEntry, LogError,
    LogLayer, LogSeverity, RPMARequestLogger, RepositoryLogger, ServiceLogger,
};
pub use crate::logging::{correlation, middleware};

#[cfg(test)]
mod tests {
    use super::correlation;

    #[test]
    fn shared_logging_re_exports_correlation_helpers() {
        let correlation_id = correlation::generate_correlation_id();
        assert!(correlation::is_valid_correlation_id(&correlation_id));
    }
}
