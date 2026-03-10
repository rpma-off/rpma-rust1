use crate::db::InterventionError;
use crate::domains::interventions::domain::models::intervention::InterventionStatus;
use crate::domains::interventions::domain::services::intervention_state_machine;

/// TODO: document
pub struct InterventionWorkflowAppService;

impl InterventionWorkflowAppService {
    /// TODO: document
    pub fn validate_transition(
        current: &InterventionStatus,
        next: &InterventionStatus,
    ) -> Result<(), InterventionError> {
        intervention_state_machine::validate_transition(current, next)
            .map_err(InterventionError::BusinessRule)
    }
}
