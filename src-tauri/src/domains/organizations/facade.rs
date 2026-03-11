use std::sync::Arc;

use crate::domains::organizations::application::OrganizationService;
use crate::shared::ipc::errors::AppError;

#[derive(Debug)]
pub struct OrganizationsFacade {
    organization_service: Arc<OrganizationService>,
}

impl OrganizationsFacade {
    pub fn new(organization_service: Arc<OrganizationService>) -> Self {
        Self {
            organization_service,
        }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    pub fn organization_service(&self) -> &Arc<OrganizationService> {
        &self.organization_service
    }

    pub fn map_service_error(&self, context: &str, error: &str) -> AppError {
        let normalized = error.to_lowercase();
        if normalized.contains("not found") {
            AppError::NotFound(format!("{}: {}", context, error))
        } else if normalized.contains("permission") || normalized.contains("unauthorized") {
            AppError::Authorization(error.to_string())
        } else if normalized.contains("validation")
            || normalized.contains("invalid")
            || normalized.contains("required")
            || normalized.contains("must")
            || normalized.contains("already exists")
        {
            AppError::Validation(error.to_string())
        } else {
            AppError::db_sanitized(context, error)
        }
    }
}
