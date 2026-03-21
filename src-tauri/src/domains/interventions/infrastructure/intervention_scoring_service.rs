//! Intervention Scoring Service (Group E — Scoring)
//!
//! Extracted from `InterventionService` to provide a focused interface
//! for scoring and progress operations: progress calculation and aggregate statistics.
//!
//! The underlying business rules and calculations remain in the domain
//! and calculation layers; this service only *coordinates* them.

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::InterventionProgress;
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

    /// Calculate intervention progress based on completed steps.
    pub fn get_progress(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<InterventionProgress> {
        let intervention = self.data.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        let steps = self.data.get_intervention_steps(intervention_id)?;

        let summary = InterventionCalculationService::summarize_steps(&steps);
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

        Ok(InterventionProgress {
            intervention_id: intervention_id.to_string(),
            current_step,
            total_steps,
            completed_steps,
            completion_percentage,
            estimated_time_remaining: None,
            status: intervention.status,
        })
    }

    /// Compute aggregate statistics for a given technician (or all technicians when `None`).
    ///
    /// Counts total, completed and in-progress interventions from the database.
    pub fn get_stats_by_technician(
        &self,
        technician_id: Option<&str>,
    ) -> InterventionResult<InterventionAggregateStats> {
        use crate::domains::interventions::domain::models::intervention::InterventionStatus;

        let (interventions, _) = self
            .data
            .list_interventions(None, technician_id, None, None)?;

        let total = interventions.len() as u64;
        let completed = interventions
            .iter()
            .filter(|i| i.status == InterventionStatus::Completed)
            .count() as u64;
        let in_progress = interventions
            .iter()
            .filter(|i| i.status == InterventionStatus::InProgress)
            .count() as u64;

        Ok(InterventionAggregateStats {
            total_interventions: total,
            completed_interventions: completed,
            in_progress_interventions: in_progress,
            average_completion_time: None,
        })
    }
}
