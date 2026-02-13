//! Intervention Calculation Service - Handles all calculation logic
//!
//! This service manages calculations for PPF interventions including:
//! - Initial requirements calculation
//! - Progress metrics calculation
//! - Final metrics calculation
//! - Step completion tracking

use crate::db::InterventionResult;
use crate::models::intervention::Intervention;
use crate::models::step::{InterventionStep, StepStatus, StepType};
use crate::services::intervention_types::{InterventionMetrics, StepRequirement};

/// Service for calculating intervention metrics and requirements
pub struct InterventionCalculationService;

#[derive(Debug, Clone)]
pub struct StepCompletionSummary {
    pub total_steps: usize,
    pub completed_steps: usize,
    pub completion_percentage: f64,
    pub mandatory_total: usize,
    pub mandatory_completed: usize,
    pub incomplete_mandatory: Vec<(i32, String)>,
}

impl Default for InterventionCalculationService {
    fn default() -> Self {
        Self::new()
    }
}

impl InterventionCalculationService {
    /// Create new calculation service
    pub fn new() -> Self {
        Self
    }

    /// Summarize step completion status for progress and validation.
    pub fn summarize_steps(steps: &[InterventionStep]) -> StepCompletionSummary {
        let total_steps = steps.len();
        let completed_steps = steps
            .iter()
            .filter(|s| s.step_status == StepStatus::Completed)
            .count();

        let completion_percentage = if total_steps == 0 {
            100.0
        } else {
            (completed_steps as f64 / total_steps as f64) * 100.0
        };

        let mandatory_steps: Vec<&InterventionStep> = steps
            .iter()
            .filter(|s| s.is_mandatory && s.step_type != StepType::Finalization)
            .collect();

        let mandatory_total = mandatory_steps.len();
        let mandatory_completed = mandatory_steps
            .iter()
            .filter(|s| s.step_status == StepStatus::Completed)
            .count();

        let incomplete_mandatory = mandatory_steps
            .iter()
            .filter(|s| s.step_status != StepStatus::Completed)
            .map(|s| (s.step_number, s.step_name.clone()))
            .collect();

        StepCompletionSummary {
            total_steps,
            completed_steps,
            completion_percentage,
            mandatory_total,
            mandatory_completed,
            incomplete_mandatory,
        }
    }

    /// Calculate initial requirements for workflow steps
    pub fn calculate_initial_requirements(
        &self,
        intervention: &Intervention,
        steps: &[InterventionStep],
    ) -> InterventionResult<Vec<StepRequirement>> {
        let mut requirements = Vec::new();

        for step in steps {
            match step.step_type {
                crate::models::step::StepType::Inspection => {
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "photos".to_string(),
                        description: format!(
                            "Take {} inspection photos of the vehicle",
                            step.min_photos_required
                        ),
                        is_mandatory: true,
                        is_completed: false,
                    });
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "notes".to_string(),
                        description: "Record initial vehicle condition notes".to_string(),
                        is_mandatory: true,
                        is_completed: false,
                    });
                }
                crate::models::step::StepType::Preparation => {
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "photos".to_string(),
                        description: format!(
                            "Take {} preparation photos showing surface cleaning",
                            step.min_photos_required
                        ),
                        is_mandatory: true,
                        is_completed: false,
                    });
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "checklist".to_string(),
                        description: "Complete surface preparation checklist".to_string(),
                        is_mandatory: true,
                        is_completed: false,
                    });
                }
                crate::models::step::StepType::Installation => {
                    let zone_count = intervention
                        .ppf_zones_config
                        .as_ref()
                        .map(|z| z.len())
                        .unwrap_or(1);
                    let required_photos = step.min_photos_required * zone_count as i32;
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "photos".to_string(),
                        description: format!(
                            "Take {} installation photos ({} per zone)",
                            required_photos, step.min_photos_required
                        ),
                        is_mandatory: true,
                        is_completed: false,
                    });
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "quality_check".to_string(),
                        description: "Perform quality check for bubbles and alignment".to_string(),
                        is_mandatory: true,
                        is_completed: false,
                    });
                }
                crate::models::step::StepType::Finalization => {
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "photos".to_string(),
                        description: format!(
                            "Take {} final inspection photos",
                            step.min_photos_required
                        ),
                        is_mandatory: true,
                        is_completed: false,
                    });
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "signature".to_string(),
                        description: "Obtain customer signature".to_string(),
                        is_mandatory: true,
                        is_completed: false,
                    });
                    requirements.push(StepRequirement {
                        step_id: step.id.clone(),
                        requirement_type: "feedback".to_string(),
                        description: "Collect customer satisfaction feedback".to_string(),
                        is_mandatory: false,
                        is_completed: false,
                    });
                }
            }
        }

        Ok(requirements)
    }

    /// Calculate completed requirements for a step
    pub fn calculate_completed_requirements(
        &self,
        _intervention: &Intervention,
        step: &InterventionStep,
    ) -> InterventionResult<Vec<String>> {
        let mut completed = Vec::new();

        // Check if photos were taken
        if step.photo_count > 0 {
            completed.push(format!("{} photos taken", step.photo_count));
        }

        // Check if notes were recorded
        if step.notes.is_some() {
            completed.push("Notes recorded".to_string());
        }

        // Check collected data for specific requirements
        if let Some(data) = &step.collected_data {
            if let Ok(value) = serde_json::from_value::<serde_json::Value>(data.clone()) {
                if value
                    .get("quality_check_passed")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
                {
                    completed.push("Quality check passed".to_string());
                }
                if value
                    .get("checklist_completed")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
                {
                    completed.push("Checklist completed".to_string());
                }
            }
        }

        Ok(completed)
    }

    /// Calculate final metrics for completed intervention
    pub fn calculate_final_metrics(
        &self,
        intervention: &Intervention,
    ) -> InterventionResult<InterventionMetrics> {
        // This would need access to steps, but for now return basic metrics
        // In a real implementation, this would query the steps from the database

        let total_steps = 4; // Based on our 4-step workflow
        let steps_completed =
            if intervention.status == crate::models::intervention::InterventionStatus::Completed {
                total_steps
            } else {
                0
            };

        let completion_rate = if total_steps > 0 {
            (steps_completed as f32 / total_steps as f32) * 100.0
        } else {
            100.0
        };

        // For now, return placeholder metrics
        // In real implementation, this would calculate based on actual step data
        Ok(InterventionMetrics {
            total_duration_minutes: intervention.actual_duration.unwrap_or(0),
            completion_rate,
            quality_score: intervention.quality_score,
            customer_satisfaction: intervention.customer_satisfaction,
            steps_completed,
            total_steps,
            photos_taken: 0, // Would be calculated from steps
        })
    }
}
