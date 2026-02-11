//! Workflow Validation Service
//!
//! Extracted from InterventionWorkflowService to handle all validation
//! logic for workflow operations in a focused, single-responsibility service.

use crate::db::{InterventionError, InterventionResult};
use crate::logging::RPMARequestLogger;
use crate::models::intervention::{Intervention, InterventionStatus};
use crate::models::step::{InterventionStep, StepStatus};
use crate::services::intervention_data::InterventionDataService;

use crate::db::Database;
use std::sync::Arc;

/// Service for validating workflow operations
#[derive(Debug)]
pub struct WorkflowValidationService {
    db: Arc<Database>,
    data: InterventionDataService,
}

impl WorkflowValidationService {
    /// Create a new WorkflowValidationService
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            data: InterventionDataService::new(db.clone()),
            db,
        }
    }

    /// Validate that a step advancement is allowed based on current workflow state
    pub fn validate_step_advancement(
        &self,
        intervention: &Intervention,
        current_step: &InterventionStep,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<()> {
        if current_step.intervention_id != intervention.id {
            let mut error_context = std::collections::HashMap::new();
            error_context.insert(
                "intervention_id".to_string(),
                serde_json::json!(intervention.id),
            );
            error_context.insert(
                "step_intervention_id".to_string(),
                serde_json::json!(current_step.intervention_id),
            );
            logger.error(
                "Step does not belong to intervention",
                None,
                Some(error_context),
            );
            return Err(InterventionError::Workflow(
                "Invalid step for this intervention".to_string(),
            ));
        }

        // Check intervention status
        if intervention.status != InterventionStatus::InProgress {
            let mut error_context = std::collections::HashMap::new();
            error_context.insert(
                "intervention_status".to_string(),
                serde_json::json!(intervention.status),
            );
            error_context.insert(
                "expected_status".to_string(),
                serde_json::json!("InProgress"),
            );
            logger.error(
                "Invalid intervention status for step advancement",
                None,
                Some(error_context),
            );
            return Err(InterventionError::Workflow(format!(
                "Intervention is not in progress (status: {:?})",
                intervention.status
            )));
        }

        match current_step.step_status {
            StepStatus::Pending | StepStatus::InProgress => {
                // Pending and in-progress are valid states for advancement.
            }
            StepStatus::Completed => {
                let mut error_context = std::collections::HashMap::new();
                error_context.insert(
                    "step_number".to_string(),
                    serde_json::json!(current_step.step_number),
                );
                error_context.insert(
                    "step_status".to_string(),
                    serde_json::json!(current_step.step_status),
                );
                logger.error(
                    "Attempted to advance already completed step",
                    None,
                    Some(error_context),
                );
                return Err(InterventionError::Workflow(format!(
                    "Step {} is already completed",
                    current_step.step_number
                )));
            }
            StepStatus::Paused => {
                logger.error(
                    "Attempted to advance paused step",
                    None,
                    Some(std::collections::HashMap::from([(
                        "step_number".to_string(),
                        serde_json::json!(current_step.step_number),
                    )])),
                );
                return Err(InterventionError::Workflow(format!(
                    "Step {} is paused and cannot be advanced",
                    current_step.step_number
                )));
            }
            StepStatus::Failed | StepStatus::Skipped | StepStatus::Rework => {
                // Treat these as terminal until explicit rework/resume flows are defined.
                logger.error(
                    "Attempted to advance step in terminal status",
                    None,
                    Some(std::collections::HashMap::from([(
                        "step_status".to_string(),
                        serde_json::json!(current_step.step_status),
                    )])),
                );
                return Err(InterventionError::Workflow(format!(
                    "Step {} is in {:?} state and cannot be advanced",
                    current_step.step_number, current_step.step_status
                )));
            }
        }

        // Check step order - ensure previous steps are completed
        if current_step.step_number > 1 {
            let previous_step_number = current_step.step_number - 1;
            match self
                .data
                .get_step_by_number(&intervention.id, previous_step_number)
            {
                Ok(Some(prev_step)) => {
                    if prev_step.step_status != StepStatus::Completed {
                        let mut error_context = std::collections::HashMap::new();
                        error_context.insert(
                            "current_step".to_string(),
                            serde_json::json!(current_step.step_number),
                        );
                        error_context.insert(
                            "previous_step".to_string(),
                            serde_json::json!(previous_step_number),
                        );
                        error_context.insert(
                            "previous_status".to_string(),
                            serde_json::json!(prev_step.step_status),
                        );
                        logger.error(
                            "Attempted to advance step before completing previous step",
                            None,
                            Some(error_context),
                        );
                        return Err(InterventionError::Workflow(format!(
                            "Cannot advance to step {}: previous step {} is not completed (status: {:?})",
                            current_step.step_number, previous_step_number, prev_step.step_status
                        )));
                    }
                }
                Ok(None) => {
                    let mut error_context = std::collections::HashMap::new();
                    error_context.insert(
                        "intervention_id".to_string(),
                        serde_json::json!(intervention.id),
                    );
                    error_context.insert(
                        "expected_step".to_string(),
                        serde_json::json!(previous_step_number),
                    );
                    logger.error("Previous step not found", None, Some(error_context));
                    return Err(InterventionError::Workflow(format!(
                        "Previous step {} not found for intervention {}",
                        previous_step_number, intervention.id
                    )));
                }
                Err(e) => {
                    let mut error_context = std::collections::HashMap::new();
                    error_context.insert("error".to_string(), serde_json::json!(e.to_string()));
                    logger.error(
                        "Failed to validate previous step",
                        None,
                        Some(error_context),
                    );
                    return Err(InterventionError::Database(format!(
                        "Failed to validate step order: {}",
                        e
                    )));
                }
            }
        }

        // Check if intervention is locked or paused
        if intervention.status == InterventionStatus::Paused {
            let mut error_context = std::collections::HashMap::new();
            error_context.insert(
                "intervention_id".to_string(),
                serde_json::json!(intervention.id),
            );
            logger.error(
                "Attempted to advance step on paused intervention",
                None,
                Some(error_context),
            );
            return Err(InterventionError::Workflow(
                "Cannot advance steps on a paused intervention".to_string(),
            ));
        }

        Ok(())
    }

    /// Validate that an intervention can be finalized
    pub fn validate_intervention_finalization(
        &self,
        intervention: &Intervention,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<()> {
        // Check intervention status
        if intervention.status == InterventionStatus::Completed {
            let mut error_context = std::collections::HashMap::new();
            error_context.insert(
                "intervention_id".to_string(),
                serde_json::json!(intervention.id),
            );
            error_context.insert("status".to_string(), serde_json::json!(intervention.status));
            logger.error(
                "Attempted to finalize already completed intervention",
                None,
                Some(error_context),
            );
            return Err(InterventionError::Workflow(
                "Intervention is already completed".to_string(),
            ));
        }

        if intervention.status != InterventionStatus::InProgress {
            let mut error_context = std::collections::HashMap::new();
            error_context.insert(
                "intervention_id".to_string(),
                serde_json::json!(intervention.id),
            );
            error_context.insert("status".to_string(), serde_json::json!(intervention.status));
            logger.error(
                "Attempted to finalize intervention not in progress",
                None,
                Some(error_context),
            );
            return Err(InterventionError::Workflow(format!(
                "Cannot finalize intervention with status {:?}",
                intervention.status
            )));
        }

        // Check that all mandatory steps are completed
        let steps = self
            .data
            .get_intervention_steps(&intervention.id)
            .map_err(|e| {
                InterventionError::Database(format!("Failed to get steps for validation: {}", e))
            })?;

        let mandatory_steps = steps.iter().filter(|s| s.is_mandatory).collect::<Vec<_>>();
        let completed_mandatory_steps = mandatory_steps
            .iter()
            .filter(|s| s.step_status == StepStatus::Completed)
            .collect::<Vec<_>>();

        if mandatory_steps.len() != completed_mandatory_steps.len() {
            let incomplete_steps: Vec<i32> = mandatory_steps
                .iter()
                .filter(|s| s.step_status != StepStatus::Completed)
                .map(|s| s.step_number)
                .collect();

            let mut error_context = std::collections::HashMap::new();
            error_context.insert(
                "intervention_id".to_string(),
                serde_json::json!(intervention.id),
            );
            error_context.insert(
                "incomplete_steps".to_string(),
                serde_json::json!(incomplete_steps),
            );
            error_context.insert(
                "total_mandatory".to_string(),
                serde_json::json!(mandatory_steps.len()),
            );
            error_context.insert(
                "completed_mandatory".to_string(),
                serde_json::json!(completed_mandatory_steps.len()),
            );
            logger.error(
                "Attempted to finalize intervention with incomplete mandatory steps",
                None,
                Some(error_context),
            );

            return Err(InterventionError::Workflow(format!(
                "Cannot finalize intervention: {} mandatory steps incomplete: {:?}",
                incomplete_steps.len(),
                incomplete_steps
            )));
        }

        Ok(())
    }

    /// Validate start intervention request
    pub fn validate_start_intervention(
        &self,
        task_id: &str,
        technician_id: &str,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<()> {
        // Basic validation - ensure required fields are present
        if task_id.is_empty() {
            logger.error("Task ID is required for intervention start", None, None);
            return Err(InterventionError::Validation(
                "Task ID is required".to_string(),
            ));
        }

        if technician_id.is_empty() {
            logger.error(
                "Technician ID is required for intervention start",
                None,
                None,
            );
            return Err(InterventionError::Validation(
                "Technician ID is required".to_string(),
            ));
        }

        Ok(())
    }
}
