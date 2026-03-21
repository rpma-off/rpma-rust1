//! Intervention Step Service (Group B — Step Management)
//!
//! Extracted from `InterventionService` to provide a focused interface
//! for step-related operations: advancing, saving progress, and querying steps.
//!
//! The underlying business rules remain in the domain and workflow layers;
//! this service only *coordinates* them.

use crate::db::Database;
use crate::db::InterventionResult;
use crate::domains::interventions::domain::models::step::InterventionStep;
use crate::domains::interventions::infrastructure::intervention_data::InterventionDataService;
use crate::domains::interventions::infrastructure::intervention_types::{
    AdvanceStepRequest, AdvanceStepResponse, SaveStepProgressRequest,
};
use crate::domains::interventions::infrastructure::intervention_workflow::InterventionWorkflowService;
use std::sync::Arc;

/// Service responsible for intervention step management.
///
/// Handles step advancement, progress persistence, and step queries.
#[derive(Debug)]
pub struct InterventionStepService {
    workflow: InterventionWorkflowService,
    data: InterventionDataService,
}

impl InterventionStepService {
    /// Create a new step service from a database handle.
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            workflow: InterventionWorkflowService::new(db.clone()),
            data: InterventionDataService::new(db),
        }
    }

    /// Advance to the next step in the workflow.
    pub async fn advance_step(
        &self,
        request: AdvanceStepRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> InterventionResult<AdvanceStepResponse> {
        self.workflow
            .advance_step(request, correlation_id, user_id)
            .await
    }

    /// Save step progress without advancing to the next step.
    pub async fn save_step_progress(
        &self,
        request: SaveStepProgressRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> InterventionResult<InterventionStep> {
        self.workflow
            .save_step_progress(request, correlation_id, user_id)
            .await
    }

    /// Get a step by its ID.
    pub fn get_step(&self, id: &str) -> InterventionResult<Option<InterventionStep>> {
        self.data.get_step(id)
    }

    /// Get all steps for an intervention.
    pub fn get_intervention_steps(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionStep>> {
        self.data.get_intervention_steps(intervention_id)
    }
}
