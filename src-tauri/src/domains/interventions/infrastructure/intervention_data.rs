//! Intervention Data Service - Handles all data operations
//!
//! This service manages data access and manipulation for PPF interventions including:
//! - Creating and updating interventions
//! - Managing workflow steps
//! - Data persistence operations
//! - Query operations

mod creation;
mod steps;
mod task_link;

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::{Intervention, InterventionStatus};
use crate::domains::interventions::domain::models::step::{InterventionStep, StepType};
use crate::domains::interventions::infrastructure::intervention_calculation::InterventionCalculationService;
use crate::domains::interventions::infrastructure::intervention_repository::InterventionRepository;
use crate::domains::interventions::infrastructure::intervention_types::{
    AdvanceStepRequest, InterventionPhoto, StartInterventionRequest, UpdateInterventionRequest,
};
use crate::shared::contracts::common::*;
use rusqlite::{params, Transaction};
use std::sync::Arc;

/// Service for intervention data operations
#[derive(Debug)]
pub struct InterventionDataService {
    db: Arc<Database>,
    repository: InterventionRepository,
}

impl InterventionDataService {
    /// Create new data service
    pub fn new(db: Arc<Database>) -> Self {
        let repository = InterventionRepository::new(db.clone());
        Self { db, repository }
    }

    /// Create a new intervention (transaction-based)
    pub fn create_intervention_with_tx(
        &self,
        tx: &Transaction,
        request: &StartInterventionRequest,
        user_id: &str,
    ) -> InterventionResult<Intervention> {
        creation::create_intervention_with_tx(self, tx, request, user_id)
    }

    /// Create a new intervention
    pub fn create_intervention(
        &self,
        request: &StartInterventionRequest,
        user_id: &str,
    ) -> InterventionResult<Intervention> {
        self.db
            .with_transaction(|tx| {
                self.create_intervention_with_tx(tx, request, user_id)
                    .map_err(|e| e.to_string())
            })
            .map_err(InterventionError::Database)
    }

    /// Initialize workflow steps for an intervention (transaction-based)
    /// NOTE: This method is deprecated. Use InterventionWorkflowService.start_intervention instead
    /// which uses the new workflow strategy pattern for flexible workflow definitions.
    pub fn initialize_workflow_steps_with_tx(
        &self,
        tx: &Transaction,
        intervention: &Intervention,
    ) -> InterventionResult<Vec<InterventionStep>> {
        steps::initialize_workflow_steps_with_tx(self, tx, intervention)
    }

    /// Initialize workflow steps for an intervention
    pub fn initialize_workflow_steps(
        &self,
        intervention: &Intervention,
    ) -> InterventionResult<Vec<InterventionStep>> {
        self.db
            .with_transaction(|tx| {
                self.initialize_workflow_steps_with_tx(tx, intervention)
                    .map_err(|e| e.to_string())
            })
            .map_err(InterventionError::Database)
    }

    /// Update step with collected data
    pub fn update_step_with_data(
        &self,
        step: &mut InterventionStep,
        request: &AdvanceStepRequest,
    ) -> InterventionResult<()> {
        steps::update_step_with_data(step, request)
    }

    /// Update intervention progress
    pub async fn update_intervention_progress(
        &self,
        intervention: &mut Intervention,
    ) -> InterventionResult<()> {
        let steps = self.get_intervention_steps(&intervention.id)?;
        let summary = InterventionCalculationService::summarize_steps(&steps);

        intervention.current_step = summary.completed_steps as i32;
        intervention.completion_percentage = summary.completion_percentage;
        intervention.updated_at = now();

        self.save_intervention(intervention)?;
        Ok(())
    }

    /// Get intervention by ID
    pub fn get_intervention(&self, id: &str) -> InterventionResult<Option<Intervention>> {
        self.repository.get_intervention(id)
    }

    /// Get active intervention by task ID
    pub fn get_active_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        self.repository.get_active_intervention_by_task(task_id)
    }

    /// Get latest intervention by task ID (any status)
    pub fn get_latest_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        self.repository.get_latest_intervention_by_task(task_id)
    }

    pub fn get_interventions_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Vec<Intervention>> {
        self.repository.get_interventions_by_task(task_id)
    }

    /// Get step by ID
    pub fn get_step(&self, id: &str) -> InterventionResult<Option<InterventionStep>> {
        self.repository.get_step(id)
    }

    /// Get step by intervention ID and step number
    pub fn get_step_by_number(
        &self,
        intervention_id: &str,
        step_number: i32,
    ) -> InterventionResult<Option<InterventionStep>> {
        self.repository
            .get_step_by_number(intervention_id, step_number)
    }

    /// Get all steps for an intervention
    pub fn get_intervention_steps(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionStep>> {
        self.repository.get_intervention_steps(intervention_id)
    }

    /// Get next step in workflow
    pub fn get_next_step(
        &self,
        intervention: &Intervention,
        current_step_number: i32,
    ) -> InterventionResult<Option<InterventionStep>> {
        let next_step_number = current_step_number + 1;
        self.db
            .query_single_as::<InterventionStep>(
                "SELECT * FROM intervention_steps
             WHERE intervention_id = ? AND step_number = ?
             ORDER BY step_number LIMIT 1",
                params![intervention.id, next_step_number],
            )
            .map_err(InterventionError::Database)
    }

    /// Save intervention
    pub fn save_intervention(&self, intervention: &Intervention) -> InterventionResult<()> {
        self.repository.update_intervention(intervention)
    }

    /// Save intervention within a transaction
    pub fn save_intervention_with_tx(
        &self,
        tx: &Transaction,
        intervention: &Intervention,
    ) -> InterventionResult<()> {
        self.repository
            .update_intervention_with_tx(tx, intervention)
    }

    /// Save step
    pub fn save_step_with_tx(
        &self,
        tx: &Transaction,
        step: &InterventionStep,
    ) -> InterventionResult<()> {
        self.repository.save_step_with_tx(tx, step)
    }

    /// QW-3: batch variant â€” prepare once, execute N times within the provided transaction.
    pub fn save_steps_batch_with_tx(
        &self,
        tx: &Transaction,
        steps: &[InterventionStep],
    ) -> InterventionResult<()> {
        self.repository.save_steps_batch_with_tx(tx, steps)
    }

    /// TODO: document
    pub fn save_step(&self, step: &InterventionStep) -> InterventionResult<()> {
        self.repository.save_step(step)
    }

    /// Update intervention
    pub fn update_intervention(
        &self,
        intervention_id: &str,
        updates: UpdateInterventionRequest,
    ) -> InterventionResult<Intervention> {
        let mut intervention = self.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        if let Some(notes) = updates.notes {
            intervention.notes = Some(notes);
        }
        if let Some(special_instructions) = updates.special_instructions {
            intervention.special_instructions = Some(special_instructions);
        }

        intervention.updated_at = now();
        self.save_intervention(&intervention)?;
        Ok(intervention)
    }

    /// Apply administrative field updates to an existing intervention.
    pub fn bulk_apply_update(
        &self,
        intervention_id: &str,
        status: Option<&str>,
        technician_id: Option<&str>,
    ) -> InterventionResult<()> {
        let mut intervention = self.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        if let Some(status) = status {
            intervention.status = status.parse().unwrap_or(intervention.status);
        }
        if let Some(technician_id) = technician_id {
            intervention.technician_id = Some(technician_id.to_string());
        }

        intervention.updated_at = now();
        self.save_intervention(&intervention)?;
        Ok(())
    }

    /// Delete intervention
    pub fn delete_intervention(&self, intervention_id: &str) -> InterventionResult<()> {
        let intervention = self.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        if intervention.status != InterventionStatus::Pending {
            return Err(InterventionError::BusinessRule(
                "Can only delete pending interventions".to_string(),
            ));
        }

        self.repository.delete_intervention(intervention_id)?;
        Ok(())
    }

    /// Get photos for an intervention
    pub fn get_intervention_photos(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionPhoto>> {
        let photos = self.db.query_as::<InterventionPhoto>(
            "SELECT * FROM photos WHERE intervention_id = ? ORDER BY step_number, captured_at",
            params![intervention_id],
        )?;
        Ok(photos)
    }

    /// Link task to intervention and set initial workflow state (transaction-based)
    pub fn link_task_to_intervention_with_tx(
        &self,
        tx: &Transaction,
        task_id: &str,
        intervention_id: &str,
        first_step_id: &str,
    ) -> InterventionResult<()> {
        task_link::link_task_to_intervention_with_tx(self, tx, task_id, intervention_id, first_step_id)
    }

    /// Link task to intervention and set initial workflow state
    pub fn link_task_to_intervention(
        &self,
        task_id: &str,
        intervention_id: &str,
        first_step_id: &str,
    ) -> InterventionResult<()> {
        self.db
            .with_transaction(|tx| {
                self.link_task_to_intervention_with_tx(tx, task_id, intervention_id, first_step_id)
                    .map_err(|e| e.to_string())
            })
            .map_err(InterventionError::Database)
    }

    /// Reconcile Task/Intervention state consistency
    pub fn reconcile_task_intervention_state(&self, task_id: &str) -> InterventionResult<()> {
        task_link::reconcile_task_intervention_state(self, task_id)
    }

    /// Get PPF workflow steps configuration
    pub fn list_interventions(
        &self,
        status: Option<&str>,
        technician_id: Option<&str>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> InterventionResult<(Vec<Intervention>, i64)> {
        self.repository
            .list_interventions(status, technician_id, limit, offset)
    }

    /// Delegate to the repository's SQL aggregate query for intervention stats.
    pub fn get_aggregate_stats(
        &self,
        technician_id: Option<&str>,
    ) -> InterventionResult<
        crate::domains::interventions::infrastructure::intervention::InterventionAggregateStats,
    > {
        self.repository.get_aggregate_stats(technician_id)
    }

    /// Get legacy PPF workflow steps configuration
    /// NOTE: This method is deprecated. Use WorkflowStrategyFactory instead
    /// which provides flexible workflow strategies based on intervention type.
    pub fn get_ppf_workflow_steps(&self) -> Vec<(String, StepType)> {
        vec![
            ("Inspection".to_string(), StepType::Inspection),
            ("PrÃƒÆ’Ã‚Â©paration".to_string(), StepType::Preparation),
            ("Installation".to_string(), StepType::Installation),
            ("Finalisation".to_string(), StepType::Finalization),
        ]
    }
}

#[cfg(test)]
mod tests;
