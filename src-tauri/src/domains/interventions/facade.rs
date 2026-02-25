use std::sync::Arc;

use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;

/// Facade for the Interventions bounded context.
///
/// Provides intervention lifecycle management — start, advance, finalize —
/// with input validation and error mapping.
#[derive(Debug)]
pub struct InterventionsFacade {
    intervention_service: Arc<InterventionService>,
}

impl InterventionsFacade {
    pub fn new(intervention_service: Arc<InterventionService>) -> Self {
        Self {
            intervention_service,
        }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying intervention service.
    pub fn intervention_service(&self) -> &Arc<InterventionService> {
        &self.intervention_service
    }

    /// Validate that an intervention ID is present.
    pub fn validate_intervention_id(&self, intervention_id: &str) -> Result<(), AppError> {
        if intervention_id.trim().is_empty() {
            return Err(AppError::Validation(
                "intervention_id is required".to_string(),
            ));
        }
        Ok(())
    }

    /// Validate that a task ID is present for intervention operations.
    pub fn validate_task_id(&self, task_id: &str) -> Result<(), AppError> {
        if task_id.trim().is_empty() {
            return Err(AppError::Validation(
                "task_id is required for intervention operations".to_string(),
            ));
        }
        Ok(())
    }

    /// Enforce that the current user may access the given intervention.
    ///
    /// Only the assigned technician, admins, and supervisors are allowed.
    pub fn check_intervention_access(
        &self,
        user_id: &str,
        role: &UserRole,
        intervention: &Intervention,
    ) -> Result<(), AppError> {
        if intervention.technician_id.as_deref() != Some(user_id)
            && !matches!(role, UserRole::Admin | UserRole::Supervisor)
        {
            return Err(AppError::Authorization(
                "Not authorized to view this intervention".to_string(),
            ));
        }
        Ok(())
    }

    /// Enforce that the current user may access interventions belonging to a task.
    ///
    /// The caller must pass the result of `task_service.check_task_assignment` as
    /// `is_assigned_to_task`. Admins and supervisors are always allowed through.
    pub fn check_task_intervention_access(
        &self,
        role: &UserRole,
        is_assigned_to_task: bool,
    ) -> Result<(), AppError> {
        if !is_assigned_to_task && !matches!(role, UserRole::Admin | UserRole::Supervisor) {
            return Err(AppError::Authorization(
                "Not authorized to view interventions for this task".to_string(),
            ));
        }
        Ok(())
    }
}
