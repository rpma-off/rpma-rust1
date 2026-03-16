//! Authorization rules for the Interventions bounded context.
//!
//! These helpers encode RBAC / ownership rules used by the facade and IPC layer.
//! Living in the application layer keeps authorization logic out of IPC handlers.

use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::error::AppError;

/// Ensure the session has at least Technician permissions for intervention workflows.
///
/// Technicians, supervisors, and admins satisfy this check; ownership checks are
/// enforced separately by the calling commands where needed.
pub fn ensure_intervention_permission(session: &UserSession) -> Result<(), AppError> {
    if !AuthMiddleware::has_permission(&session.role, &UserRole::Technician) {
        return Err(AppError::Authorization(
            "Insufficient permissions for intervention workflow".to_string(),
        ));
    }
    Ok(())
}

/// Authorization rule for intervention/task ownership checks.
///
/// Admins and supervisors can access any resource (including unassigned ones),
/// while technicians can only access resources assigned to their user ID.
pub fn can_access_own_or_privileged(
    assigned_user_id: Option<&str>,
    session: &UserSession,
) -> bool {
    let is_privileged = matches!(session.role, UserRole::Admin | UserRole::Supervisor);
    is_privileged || assigned_user_id.is_some_and(|id| id == session.user_id.as_str())
}
