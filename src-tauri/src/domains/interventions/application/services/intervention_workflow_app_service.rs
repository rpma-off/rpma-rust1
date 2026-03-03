use crate::db::InterventionError;
use crate::domains::interventions::domain::models::intervention::InterventionStatus;
use crate::domains::interventions::domain::services::intervention_state_machine;

pub struct InterventionWorkflowAppService;

impl InterventionWorkflowAppService {
    pub fn validate_transition(
        current: &InterventionStatus,
        next: &InterventionStatus,
    ) -> Result<(), InterventionError> {
        intervention_state_machine::validate_transition(current, next)
            .map_err(InterventionError::BusinessRule)
    }
}
