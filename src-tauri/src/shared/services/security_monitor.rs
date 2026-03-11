//! Security monitoring and alerting service (shared cross-cutting concern).
//!
//! This module provides real-time security monitoring, threat detection,
//! and alerting capabilities. Placed in shared so that the auth domain
//! can use it without importing from the audit domain's infrastructure.

pub use crate::domains::auth::infrastructure::security_monitor::SecurityMonitorService;
