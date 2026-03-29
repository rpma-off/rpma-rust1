//! Intervention Scoring Service (Group E — Scoring)
//!
//! Extracted from `InterventionService` to provide a focused interface
//! for scoring and progress operations: progress calculation and aggregate statistics.
//!
//! The underlying business rules and calculations remain in the domain
//! and calculation layers; this service only *coordinates* them.

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::{
    InterventionProgress, InterventionStatus,
};
use crate::domains::interventions::domain::models::step::InterventionStep;
use crate::domains::interventions::infrastructure::intervention::InterventionAggregateStats;
use crate::domains::interventions::infrastructure::intervention_calculation::InterventionCalculationService;
use crate::domains::interventions::infrastructure::intervention_data::InterventionDataService;
use std::sync::Arc;

/// Service responsible for intervention scoring, progress, and statistics.
#[derive(Debug)]
pub struct InterventionScoringService {
    data: InterventionDataService,
}

impl InterventionScoringService {
    /// Create a new scoring service from a database handle.
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            data: InterventionDataService::new(db),
        }
    }

    pub fn build_progress(
        intervention_id: &str,
        status: InterventionStatus,
        steps: &[InterventionStep],
    ) -> InterventionProgress {
        let summary = InterventionCalculationService::summarize_steps(steps);
        let total_steps = summary.total_steps as i32;
        let completed_steps = summary.completed_steps as i32;
        let current_step = if total_steps > 0 {
            completed_steps + 1
        } else {
            0
        };
        let completion_percentage = if total_steps > 0 {
            summary.completion_percentage as f32
        } else {
            0.0
        };

        InterventionProgress {
            intervention_id: intervention_id.to_string(),
            current_step,
            total_steps,
            completed_steps,
            completion_percentage,
            estimated_time_remaining: None,
            status,
        }
    }

    /// Calculate intervention progress based on completed steps.
    pub fn get_progress(&self, intervention_id: &str) -> InterventionResult<InterventionProgress> {
        let intervention = self
            .data
            .get_intervention(intervention_id)?
            .ok_or_else(|| {
                InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
            })?;

        let steps = self.data.get_intervention_steps(intervention_id)?;
        Ok(Self::build_progress(
            intervention_id,
            intervention.status,
            &steps,
        ))
    }

    /// Compute aggregate statistics for a given technician (or all technicians when `None`).
    ///
    /// Delegates to a single SQL COUNT/SUM aggregate query instead of loading all
    /// intervention rows into memory and filtering with iterator passes.
    pub fn get_stats_by_technician(
        &self,
        technician_id: Option<&str>,
    ) -> InterventionResult<InterventionAggregateStats> {
        self.data.get_aggregate_stats(technician_id)
    }
}
