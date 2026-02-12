//! Intervention Service - Main facade for PPF intervention operations
//!
//! This service provides a unified interface for PPF intervention management
//! by orchestrating operations across specialized service modules:
//!
//! - `InterventionWorkflowService` - Core workflow operations (start, advance, finalize)
//! - `InterventionValidationService` - Validation logic and business rules
//! - `InterventionCalculationService` - Metrics and requirements calculation
//! - `InterventionDataService` - Data access and persistence operations

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::models::intervention::Intervention;
use crate::models::step::InterventionStep;
use crate::services::intervention_data::InterventionDataService;
use crate::services::intervention_workflow::InterventionWorkflowService;

use std::sync::Arc;

/// Re-export types from specialized modules and types for backward compatibility
pub use crate::services::intervention_types::*;

/// Main intervention service that orchestrates all intervention operations
///
/// This service provides a unified interface for intervention management while maintaining
/// separation of concerns through delegation to specialized services.
#[derive(Debug)]
pub struct InterventionService {
    /// Handles core workflow operations (start, advance, finalize)
    workflow: InterventionWorkflowService,
    /// Handles data access and persistence
    data: InterventionDataService,
}

impl InterventionService {
    /// Create a new InterventionService instance
    ///
    /// Initializes all specialized service modules with the provided database connection.
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            workflow: InterventionWorkflowService::new(db.clone()),
            data: InterventionDataService::new(db.clone()),
        }
    }

    /// Start a new PPF intervention
    pub fn start_intervention(
        &self,
        request: StartInterventionRequest,
        user_id: &str,
        correlation_id: &str,
    ) -> InterventionResult<StartInterventionResponse> {
        self.workflow
            .start_intervention(request, user_id, correlation_id)
    }

    /// Advance to the next step in the workflow
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

    /// Save step progress without advancing to next step
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

    /// Finalize an intervention
    pub fn finalize_intervention(
        &self,
        request: FinalizeInterventionRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> InterventionResult<FinalizeInterventionResponse> {
        self.workflow
            .finalize_intervention(request, correlation_id, user_id)
    }

    /// Get intervention by ID
    pub fn get_intervention(&self, id: &str) -> InterventionResult<Option<Intervention>> {
        self.data.get_intervention(id)
    }

    /// Get active intervention for a task
    pub fn get_active_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        self.data.get_active_intervention_by_task(task_id)
    }

    /// Get latest intervention for a task (any status)
    pub fn get_latest_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        self.data.get_latest_intervention_by_task(task_id)
    }

    /// Get step by ID
    pub fn get_step(&self, id: &str) -> InterventionResult<Option<InterventionStep>> {
        self.data.get_step(id)
    }

    /// Get all steps for an intervention
    pub fn get_intervention_steps(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionStep>> {
        self.data.get_intervention_steps(intervention_id)
    }

    /// Get all photos for an intervention
    pub fn get_intervention_photos(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<crate::models::photo::Photo>> {
        self.data.get_intervention_photos(intervention_id)
    }

    /// Update intervention
    pub fn update_intervention(
        &self,
        intervention_id: &str,
        updates: serde_json::Value,
    ) -> InterventionResult<Intervention> {
        self.data.update_intervention(intervention_id, updates)
    }

    /// Delete intervention (admin only)
    pub fn delete_intervention(&self, intervention_id: &str) -> InterventionResult<()> {
        self.data.delete_intervention(intervention_id)
    }

    /// Get intervention with all related data in single query (prevents N+1)
    pub fn get_intervention_with_details(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<InterventionWithDetails> {
        // Get intervention
        let intervention = self.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        // Get all steps in single query
        let steps = self.get_intervention_steps(intervention_id)?;

        // Get all photos for all steps in single query
        let photos = self.data.get_intervention_photos(intervention_id)?;

        // Group photos by step_id
        let mut photos_by_step = std::collections::HashMap::new();
        for photo in photos {
            photos_by_step
                .entry(photo.step_id.clone())
                .or_insert_with(Vec::new)
                .push(photo);
        }

        // Attach photos to steps
        let steps_with_photos: Vec<InterventionStepWithPhotos> = steps
            .into_iter()
            .map(|step| {
                let step_photos = photos_by_step
                    .get(&Some(step.id.clone()))
                    .cloned()
                    .unwrap_or_default();
                InterventionStepWithPhotos {
                    step,
                    photos: step_photos,
                }
            })
            .collect();

        Ok(InterventionWithDetails {
            intervention,
            steps: steps_with_photos,
        })
    }

    pub fn list_interventions(
        &self,
        status: Option<&str>,
        technician_id: Option<&str>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> InterventionResult<(Vec<Intervention>, i64)> {
        self.data
            .list_interventions(status, technician_id, limit, offset)
    }

    /// Calculate intervention progress based on completed steps
    pub fn get_progress(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<crate::models::intervention::InterventionProgress> {
        let intervention = self.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        let steps = self.get_intervention_steps(intervention_id)?;

        let total_steps = steps.len() as i32;
        let completed_steps = steps
            .iter()
            .filter(|s| matches!(s.step_status, crate::models::step::StepStatus::Completed))
            .count() as i32;
        let current_step = completed_steps + 1;
        let completion_percentage = if total_steps > 0 {
            (completed_steps as f32 / total_steps as f32) * 100.0
        } else {
            0.0
        };

        Ok(crate::models::intervention::InterventionProgress {
            intervention_id: intervention_id.to_string(),
            current_step,
            total_steps,
            completed_steps,
            completion_percentage,
            estimated_time_remaining: None,
            status: intervention.status,
        })
    }
}
