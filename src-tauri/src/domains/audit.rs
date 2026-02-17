//! Audit/Security domain — audit trails, security monitoring, and alerts
//!
//! This module re-exports audit and security-related components across layers.

// Public facade
pub use crate::services::audit_service::AuditService;

// Models
pub(crate) use crate::models::notification::{
    NotificationPriority, NotificationStatus, NotificationType,
};

// Services
pub(crate) use crate::services::alerting::AlertingService;
pub(crate) use crate::services::security_monitor::SecurityMonitorService;
