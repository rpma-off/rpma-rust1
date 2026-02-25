//! Security monitoring and alerting service (shared cross-cutting concern).
//!
//! This module provides real-time security monitoring, threat detection,
//! and alerting capabilities. Placed in shared so that the auth domain
//! can use it without importing from the audit domain's infrastructure.

pub use crate::domains::audit::infrastructure::security_monitor::{
    AlertSeverity, SecurityAlert, SecurityEvent, SecurityEventType, SecurityMetrics,
    SecurityMonitorService, SecurityThresholds,
};
