//! Intervention Service - Main coordinator for PPF intervention operations
//!
//! This service provides a unified interface for PPF intervention management
//! by orchestrating operations across specialized service modules:
//!
//! - `InterventionWorkflowService` - Core workflow operations (start, finalize)
//! - `InterventionDataService` - Data access and persistence operations
//!
//! And delegating to extracted sub-services:
//!
//! - `InterventionStepService` (Group B) — Step advancement and queries
//! - `PhotoValidationService` (Group D) — Photo queries and validation
//! - `InterventionScoringService` (Group E) — Progress and statistics
//! - `MaterialConsumptionService` (Group C) — Material recording (placeholder)

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::interventions::domain::models::step::InterventionStep;
use crate::domains::interventions::infrastructure::intervention_data::InterventionDataService;
use crate::domains::interventions::infrastructure::intervention_scoring_service::InterventionScoringService;
use crate::domains::interventions::infrastructure::intervention_step_service::InterventionStepService;
use crate::domains::interventions::infrastructure::intervention_workflow::InterventionWorkflowService;
use crate::domains::interventions::infrastructure::material_consumption_service::MaterialConsumptionService;
use crate::domains::interventions::infrastructure::photo_validation_service::PhotoValidationService;

use std::sync::Arc;

/// Re-export types from specialized modules and types for backward compatibility
pub use crate::domains::interventions::infrastructure::intervention_types::*;

/// Main intervention service that orchestrates all intervention operations.
///
/// Group A (Lifecycle) methods live here directly. Groups B, C, D, E are
/// delegated to injected sub-services.
#[derive(Debug)]
pub struct InterventionService {
    /// Handles core lifecycle workflow operations (start, finalize)
    workflow: InterventionWorkflowService,
    /// Handles data access and persistence for lifecycle operations
    data: InterventionDataService,
    /// Group B — Step management
    step_service: Arc<InterventionStepService>,
    /// Group D — Photo validation
    photo_validation_service: Arc<PhotoValidationService>,
    /// Group E — Scoring and statistics
    scoring_service: Arc<InterventionScoringService>,
    /// Group C — Material consumption (placeholder)
    #[allow(dead_code)]
    material_service: Arc<MaterialConsumptionService>,
}

impl InterventionService {
    /// Convenience constructor that builds all sub-services from a Database handle.
    ///
    /// Suitable for tests and ad-hoc usage where explicit DI is not needed.
    pub fn new(db: Arc<Database>) -> Self {
        let step_service = Arc::new(InterventionStepService::new(db.clone()));
        let photo_validation_service = Arc::new(PhotoValidationService::new(db.clone()));
        let scoring_service = Arc::new(InterventionScoringService::new(db.clone()));
        let material_service = Arc::new(MaterialConsumptionService::new(db.clone()));
        Self::with_services(
            db,
            step_service,
            photo_validation_service,
            scoring_service,
            material_service,
        )
    }

    /// Constructor for explicit dependency injection.
    ///
    /// Used by `ServiceBuilder` to wire pre-constructed sub-services.
    pub fn with_services(
        db: Arc<Database>,
        step_service: Arc<InterventionStepService>,
        photo_validation_service: Arc<PhotoValidationService>,
        scoring_service: Arc<InterventionScoringService>,
        material_service: Arc<MaterialConsumptionService>,
    ) -> Self {
        Self {
            workflow: InterventionWorkflowService::new(db.clone()),
            data: InterventionDataService::new(db),
            step_service,
            photo_validation_service,
            scoring_service,
            material_service,
        }
    }

    // ── Group A — Lifecycle ──────────────────────────────────────────────

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

    /// TODO: document
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

    /// Apply the same update payload to each intervention in `ids`.
    ///
    /// Returns the number of successfully updated interventions.
    /// Extracted from the IPC layer per ADR-018.
    pub fn bulk_update_interventions(
        &self,
        ids: &[String],
        updates: serde_json::Value,
    ) -> InterventionResult<usize> {
        let mut updated = 0usize;
        for id in ids {
            match self.data.update_intervention(id, updates.clone()) {
                Ok(_) => updated += 1,
                Err(e) => {
                    tracing::warn!(intervention_id = %id, error = %e, "bulk_update: skipping failed intervention update");
                }
            }
        }
        Ok(updated)
    }

    // ── Group B — Step Management (delegated) ────────────────────────────

    /// Advance to the next step in the workflow
    pub async fn advance_step(
        &self,
        request: AdvanceStepRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> InterventionResult<AdvanceStepResponse> {
        self.step_service
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
        self.step_service
            .save_step_progress(request, correlation_id, user_id)
            .await
    }

    /// Get step by ID
    pub fn get_step(&self, id: &str) -> InterventionResult<Option<InterventionStep>> {
        self.step_service.get_step(id)
    }

    /// Get all steps for an intervention
    pub fn get_intervention_steps(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionStep>> {
        self.step_service.get_intervention_steps(intervention_id)
    }

    // ── Group D — Photo Validation (delegated) ──────────────────────────

    /// Get all photos for an intervention
    pub fn get_intervention_photos(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionPhoto>> {
        self.photo_validation_service
            .get_intervention_photos(intervention_id)
    }

    // ── Group E — Scoring (delegated) ────────────────────────────────────

    /// Calculate intervention progress based on completed steps
    pub fn get_progress(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<
        crate::domains::interventions::domain::models::intervention::InterventionProgress,
    > {
        self.scoring_service.get_progress(intervention_id)
    }

    /// Compute aggregate statistics for a given technician (or all technicians when `None`).
    ///
    /// Counts total, completed and in-progress interventions from the database.
    /// Extracted from the IPC layer per ADR-018.
    pub fn get_stats_by_technician(
        &self,
        technician_id: Option<&str>,
    ) -> InterventionResult<InterventionAggregateStats> {
        self.scoring_service
            .get_stats_by_technician(technician_id)
    }

    // ── Composite reads ──────────────────────────────────────────────────

    /// Get intervention with all related data in single query (prevents N+1)
    pub fn get_intervention_with_details(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<InterventionWithDetails> {
        // Get intervention
        let intervention = self.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        // Get all steps via step service
        let steps = self.step_service.get_intervention_steps(intervention_id)?;

        // Get all photos via photo validation service
        let photos = self
            .photo_validation_service
            .get_intervention_photos(intervention_id)?;

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
}

/// Aggregate statistics returned by [`InterventionService::get_stats_by_technician`].
#[derive(Debug, serde::Serialize)]
pub struct InterventionAggregateStats {
    pub total_interventions: u64,
    pub completed_interventions: u64,
    pub in_progress_interventions: u64,
    pub average_completion_time: Option<f64>,
}
