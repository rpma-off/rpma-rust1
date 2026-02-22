//! Intervention command modules
//!
//! This module contains all intervention-related command operations,
//! split into specialized modules for better maintainability.

pub mod data_access;
pub mod queries;
pub mod relationships;
pub mod workflow;

use crate::commands::AppError;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::auth_middleware::AuthMiddleware;

/// Ensure the session has at least Technician permissions for intervention workflows.
///
/// Technicians, supervisors, and admins satisfy this check; ownership checks are enforced
/// separately by the calling commands where needed.
pub(crate) fn ensure_intervention_permission(session: &UserSession) -> Result<(), AppError> {
    if !AuthMiddleware::has_permission(&session.role, &UserRole::Technician) {
        return Err(AppError::Authorization(
            "Insufficient permissions for intervention workflow".to_string(),
        ));
    }
    Ok(())
}

// Re-export all commands for backward compatibility
pub use data_access::*;
pub use queries::*;
pub use relationships::*;
pub use workflow::*;
