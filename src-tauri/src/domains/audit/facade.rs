use std::fmt;
use std::sync::Arc;

use crate::domains::audit::infrastructure::audit_service::AuditService;
use crate::shared::ipc::errors::AppError;

/// Facade for the Audit bounded context.
///
/// Provides audit logging, security monitoring, and alerting
/// with input validation and error mapping.
pub struct AuditFacade {
    audit_service: Arc<AuditService>,
}

impl fmt::Debug for AuditFacade {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("AuditFacade").finish()
    }
}

impl AuditFacade {
    pub fn new(audit_service: Arc<AuditService>) -> Self {
        Self { audit_service }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying audit service.
    pub fn audit_service(&self) -> &Arc<AuditService> {
        &self.audit_service
    }

    /// Map a raw audit error into a structured AppError.
    pub fn map_audit_error(&self, context: &str, error: &str) -> AppError {
        AppError::Internal(format!("Audit error in {}: {}", context, error))
    }
}
