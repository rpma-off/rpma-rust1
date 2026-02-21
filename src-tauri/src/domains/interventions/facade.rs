use std::sync::Arc;

use crate::domains::interventions::infrastructure::intervention::InterventionService;
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
}
