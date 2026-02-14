//! Audit/Security domain — audit trails, security monitoring, and alerts
//!
//! This module re-exports audit and security-related components across layers.

// Models
pub use crate::models::notification::{NotificationPriority, NotificationStatus, NotificationType};

// Services
pub use crate::services::alerting::AlertingService;
pub use crate::services::audit_service::AuditService;
pub use crate::services::security_monitor::SecurityMonitorService;

// Repositories
pub use crate::repositories::audit_repository::AuditRepository;
