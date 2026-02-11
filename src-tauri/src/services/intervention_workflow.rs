//! Intervention Workflow Service - Handles PPF workflow operations
//!
//! This service manages the core PPF intervention workflow including:
//! - Starting interventions
//! - Advancing through workflow steps
//! - Saving step progress
//! - Finalizing interventions

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::logging::{LogDomain, RPMARequestLogger};
use crate::models::common::TimestampString;
use crate::models::intervention::{Intervention, InterventionStatus};
use crate::models::step::{InterventionStep, StepStatus};
use crate::services::intervention_data::InterventionDataService;
use crate::services::intervention_types::*;
use crate::services::workflow_strategy::{
    EnvironmentConditions, WorkflowContext, WorkflowStrategyFactory,
};
use crate::services::workflow_validation::WorkflowValidationService;
use serde_json::json;

use std::sync::Arc;

/// Service for managing PPF intervention workflows
#[derive(Debug)]
pub struct InterventionWorkflowService {
    db: Arc<Database>,
    data: InterventionDataService,
    validation: WorkflowValidationService,
}

impl InterventionWorkflowService {
    /// Create new workflow service
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            data: InterventionDataService::new(db.clone()),
            validation: WorkflowValidationService::new(db.clone()),
            db,
        }
    }

    /// Start a new PPF intervention
    pub fn start_intervention(
        &self,
        request: StartInterventionRequest,
        user_id: &str,
        correlation_id: &str,
    ) -> InterventionResult<StartInterventionResponse> {
        let logger = RPMARequestLogger::new(
            correlation_id.to_string(),
            Some(user_id.to_string()),
            LogDomain::Task,
        );
        let mut context = std::collections::HashMap::new();
        context.insert("task_id".to_string(), serde_json::json!(request.task_id));
        context.insert(
            "technician_id".to_string(),
            serde_json::json!(request.technician_id),
        );
        logger.info("Starting new PPF intervention", Some(context));

        // Basic validation - ensure required fields are present
        if request.task_id.is_empty() {
            logger.error("Task ID is required for intervention start", None, None);
            return Err(InterventionError::Validation(
                "Task ID is required".to_string(),
            ));
        }

        // Validate task_id format (allow both UUID and string formats for compatibility)
        if request.task_id.is_empty() {
            logger.error("Task ID cannot be empty", None, None);
            return Err(InterventionError::Validation(
                "Task ID cannot be empty".to_string(),
            ));
        }

        if request.technician_id.is_empty() {
            logger.error(
                "Technician ID is required for intervention start",
                None,
                None,
            );
            return Err(InterventionError::Validation(
                "Technician ID is required".to_string(),
            ));
        }

        // Attempt to start intervention with cleanup on failure
        match self.start_intervention_internal(&request, user_id, &logger) {
            Ok(response) => {
                let mut success_context = std::collections::HashMap::new();
                success_context.insert(
                    "intervention_id".to_string(),
                    serde_json::json!(response.intervention.id),
                );
                success_context.insert(
                    "step_count".to_string(),
                    serde_json::json!(response.steps.len()),
                );
                logger.info("Successfully started intervention", Some(success_context));
                Ok(response)
            }
            Err(e) => {
                // Cleanup on failure - attempt to rollback any partial state
                if let Err(cleanup_err) = self.cleanup_failed_start(&request.task_id, &logger) {
                    // Log cleanup error but return original operation error
                    let mut cleanup_error_context = std::collections::HashMap::new();
                    cleanup_error_context
                        .insert("task_id".to_string(), serde_json::json!(request.task_id));
                    cleanup_error_context.insert(
                        "cleanup_error".to_string(),
                        serde_json::json!(cleanup_err.to_string()),
                    );
                    logger.warn("Cleanup also failed", Some(cleanup_error_context));
                }

                let mut error_context = std::collections::HashMap::new();
                error_context.insert("task_id".to_string(), serde_json::json!(request.task_id));
                logger.error(
                    "Failed to start intervention",
                    Some(&e),
                    Some(error_context),
                );
                Err(e)
            }
        }
    }

    /// Internal start intervention logic (separated for error handling)
    fn start_intervention_internal(
        &self,
        request: &StartInterventionRequest,
        user_id: &str,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<StartInterventionResponse> {
        // Execute all operations within a single transaction
        self.db
            .with_transaction(|tx| {
                // Create intervention record
                let intervention = self
                    .data
                    .create_intervention_with_tx(tx, request, user_id)
                    .map_err(|e| e.to_string())?;
                let mut create_context = std::collections::HashMap::new();
                create_context.insert(
                    "intervention_id".to_string(),
                    serde_json::json!(intervention.id),
                );
                logger.debug("Created intervention record", Some(create_context));

                // Create workflow context for strategy pattern
                let workflow_context = WorkflowContext {
                    intervention: intervention.clone(),
                    user_id: user_id.to_string(),
                    environment_conditions: Some(EnvironmentConditions {
                        weather_condition: request.weather_condition.clone(),
                        temperature_celsius: request.temperature.map(|t| t as f64),
                        humidity_percentage: request.humidity.map(|h| h as f64),
                        work_location: request.work_location.clone(),
                    }),
                };

                // Get appropriate workflow strategy
                let strategy =
                    WorkflowStrategyFactory::create_strategy(&intervention, &workflow_context);
                logger.debug(
                    &format!("Using workflow strategy: {}", strategy.strategy_name()),
                    None,
                );

                // Initialize workflow steps using the strategy (synchronous version)
                let workflow_result = strategy
                    .initialize_workflow_sync(&intervention, &workflow_context)
                    .map_err(|e| e.to_string())?;

                let steps = workflow_result.steps;

                // Store steps in database
                for step in &steps {
                    self.data
                        .save_step_with_tx(tx, step)
                        .map_err(|e| e.to_string())?;
                }

                let mut steps_context = std::collections::HashMap::new();
                steps_context.insert("step_count".to_string(), serde_json::json!(steps.len()));
                steps_context.insert(
                    "total_estimated_duration".to_string(),
                    serde_json::json!(workflow_result.total_estimated_duration),
                );
                if let Some(instructions) = &workflow_result.special_instructions {
                    steps_context.insert(
                        "special_instructions".to_string(),
                        serde_json::json!(instructions),
                    );
                }
                logger.debug(
                    "Initialized workflow steps with strategy",
                    Some(steps_context),
                );

                // Link task to intervention with proper step ID validation
                let first_step_id = steps
                    .first()
                    .ok_or_else(|| "No workflow steps created".to_string())?
                    .id
                    .clone();

                self.data
                    .link_task_to_intervention_with_tx(
                        tx,
                        &request.task_id,
                        &intervention.id,
                        &first_step_id,
                    )
                    .map_err(|e| e.to_string())?;

                // Convert special instructions to requirements if present
                let initial_requirements = workflow_result
                    .special_instructions
                    .unwrap_or_default()
                    .into_iter()
                    .enumerate()
                    .map(|(_i, instruction)| StepRequirement {
                        step_id: first_step_id.clone(),
                        requirement_type: "instruction".to_string(),
                        description: instruction,
                        is_mandatory: true,
                        is_completed: false,
                    })
                    .collect();

                // Create response
                let response = StartInterventionResponse {
                    intervention,
                    steps,
                    initial_requirements,
                };

                Ok(response)
            })
            .map_err(InterventionError::Database)
    }
    /// Cleanup partial state on failed intervention start
    fn cleanup_failed_start(
        &self,
        task_id: &str,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<()> {
        let mut cleanup_context = std::collections::HashMap::new();
        cleanup_context.insert("task_id".to_string(), serde_json::json!(task_id));
        logger.warn(
            "Cleaning up failed intervention start",
            Some(cleanup_context),
        );

        let mut cleanup_errors = Vec::new();

        // Reset task workflow state if it was partially set
        if let Err(e) = self.db.get_connection().and_then(|conn| {
            conn.execute(
                "UPDATE tasks SET workflow_id = NULL, current_workflow_step_id = NULL, status = 'draft', started_at = NULL WHERE id = ? AND workflow_id IS NOT NULL",
                rusqlite::params![task_id]
            ).map_err(|db_err| db_err.to_string())
        }) {
            let mut cleanup_error_context = std::collections::HashMap::new();
            cleanup_error_context.insert("task_id".to_string(), serde_json::json!(task_id));
            cleanup_error_context.insert("error".to_string(), serde_json::json!(e));
            logger.error("Failed to cleanup task workflow state", None, Some(cleanup_error_context));
            cleanup_errors.push(format!("Failed to reset task: {}", e));
        }

        // Delete any orphaned intervention and steps for this task
        if let Err(e) = self.db.get_connection().and_then(|conn| {
            // Delete steps first
            conn.execute(
                "DELETE FROM intervention_steps WHERE intervention_id IN (SELECT id FROM interventions WHERE task_id = ?)",
                rusqlite::params![task_id]
            ).map_err(|db_err| db_err.to_string())?;
            // Delete intervention
            conn.execute(
                "DELETE FROM interventions WHERE task_id = ?",
                rusqlite::params![task_id]
            ).map_err(|db_err| db_err.to_string())
        }) {
            let mut cleanup_error_context = std::collections::HashMap::new();
            cleanup_error_context.insert("task_id".to_string(), serde_json::json!(task_id));
            cleanup_error_context.insert("error".to_string(), serde_json::json!(e));
            logger.error("Failed to cleanup orphaned intervention", None, Some(cleanup_error_context));
            cleanup_errors.push(format!("Failed to delete orphaned intervention: {}", e));
        } else {
            let mut success_context = std::collections::HashMap::new();
            success_context.insert("task_id".to_string(), serde_json::json!(task_id));
            logger.info("Successfully cleaned up orphaned intervention", Some(success_context));
        }

        // Return cleanup errors if any occurred
        if !cleanup_errors.is_empty() {
            return Err(InterventionError::Database(format!(
                "Cleanup completed with errors: {}",
                cleanup_errors.join("; ")
            )));
        }

        Ok(())
    }

    /// Validate that a step advancement is allowed based on current workflow state
    /// Advance to the next step in the workflow
    pub async fn advance_step(
        &self,
        request: AdvanceStepRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> InterventionResult<AdvanceStepResponse> {
        let logger = RPMARequestLogger::new(
            correlation_id.to_string(),
            user_id.map(|s| s.to_string()),
            LogDomain::Task,
        );
        let mut advance_context = std::collections::HashMap::new();
        advance_context.insert(
            "intervention_id".to_string(),
            serde_json::json!(request.intervention_id),
        );
        advance_context.insert("step_id".to_string(), serde_json::json!(request.step_id));
        logger.info("Advancing intervention step", Some(advance_context));

        // Get current intervention with retry logic
        let mut intervention = self
            .get_intervention_with_retry(&request.intervention_id, &logger)
            .await?;

        // Get current step with retry logic
        let mut current_step = self.get_step_with_retry(&request.step_id, &logger).await?;

        // Comprehensive workflow state validation
        self.validation
            .validate_step_advancement(&intervention, &current_step, &logger)?;

        let has_completion_data = Self::has_completion_data(&request);

        if current_step.step_status == StepStatus::Pending && has_completion_data {
            // Steps must be started before completion data is accepted.
            return Err(InterventionError::Workflow(
                "Step must be started before completion data can be provided".to_string(),
            ));
        }

        // Update step with collected data
        self.data
            .update_step_with_data(&mut current_step, &request)?;

        // Set step to in-progress if not already set
        if current_step.step_status == StepStatus::Pending {
            current_step.step_status = StepStatus::InProgress;
            current_step.started_at = TimestampString::now();
        }

        if current_step.step_status == StepStatus::InProgress && !has_completion_data {
            // No completion indicators; persist updated progress data and return.
            self.save_step_with_retry(&current_step, &logger).await?;
            let progress_percentage = intervention.completion_percentage as f32;
            return Ok(AdvanceStepResponse {
                step: current_step,
                next_step: None,
                progress_percentage,
                requirements_completed: Vec::new(),
            });
        }

        self.apply_completion_requirements(&mut current_step, &logger)?;

        // Mark step as completed
        current_step.step_status = StepStatus::Completed;
        current_step.completed_at = TimestampString::now();

        // Save updated step with retry
        self.save_step_with_retry(&current_step, &logger).await?;

        // Update intervention progress
        self.data
            .update_intervention_progress(&mut intervention)
            .await
            .map_err(|e| {
                let mut progress_context = std::collections::HashMap::new();
                progress_context.insert(
                    "intervention_id".to_string(),
                    serde_json::json!(intervention.id),
                );
                logger.error(
                    "Failed to update intervention progress",
                    Some(&e),
                    Some(progress_context),
                );
                InterventionError::Database(format!("Failed to update progress: {}", e))
            })?;

        // Get next step if available
        let next_step = match self
            .data
            .get_next_step(&intervention, current_step.step_number)
        {
            Ok(step) => step,
            Err(e) => {
                let mut next_step_context = std::collections::HashMap::new();
                next_step_context.insert(
                    "current_step".to_string(),
                    serde_json::json!(current_step.step_number),
                );
                next_step_context.insert("error".to_string(), serde_json::json!(e.to_string()));
                logger.error("Failed to get next step", None, Some(next_step_context));
                return Err(InterventionError::Database(format!(
                    "Failed to get next step for step {}: {}",
                    current_step.step_number, e
                )));
            }
        };

        // Calculate progress
        let progress_percentage = intervention.completion_percentage as f32;

        // Calculate completed requirements (simplified)
        let requirements_completed = vec![format!("step_{}_completed", current_step.step_number)];

        let mut completion_context = std::collections::HashMap::new();
        completion_context.insert(
            "progress_percentage".to_string(),
            serde_json::json!(progress_percentage),
        );
        completion_context.insert(
            "next_step".to_string(),
            serde_json::json!(next_step.as_ref().map(|s| s.step_number)),
        );
        logger.info("Step advancement completed", Some(completion_context));

        Ok(AdvanceStepResponse {
            step: current_step,
            next_step,
            progress_percentage,
            requirements_completed,
        })
    }

    /// Get intervention with retry logic
    async fn get_intervention_with_retry(
        &self,
        intervention_id: &str,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<Intervention> {
        const MAX_RETRIES: u32 = 3;
        let mut attempt = 0;

        loop {
            match self.data.get_intervention(intervention_id) {
                Ok(Some(intervention)) => return Ok(intervention),
                Ok(None) => {
                    return Err(InterventionError::NotFound(format!(
                        "Intervention {} not found",
                        intervention_id
                    )));
                }
                Err(e) => {
                    attempt += 1;
                    if attempt >= MAX_RETRIES {
                        let mut retry_context = std::collections::HashMap::new();
                        retry_context.insert(
                            "intervention_id".to_string(),
                            serde_json::json!(intervention_id),
                        );
                        retry_context.insert("attempts".to_string(), serde_json::json!(attempt));
                        logger.error(
                            "Failed to get intervention after retries",
                            Some(&e),
                            Some(retry_context),
                        );
                        return Err(InterventionError::Database(format!(
                            "Failed to retrieve intervention after {} attempts: {}",
                            MAX_RETRIES, e
                        )));
                    }
                    let mut retry_warn_context = std::collections::HashMap::new();
                    retry_warn_context.insert(
                        "intervention_id".to_string(),
                        serde_json::json!(intervention_id),
                    );
                    retry_warn_context.insert("attempt".to_string(), serde_json::json!(attempt));
                    logger.warn(
                        "Failed to get intervention, retrying",
                        Some(retry_warn_context),
                    );
                    // Simple backoff - in production, use exponential backoff
                    std::thread::sleep(std::time::Duration::from_millis(100 * attempt as u64));
                }
            }
        }
    }

    /// Get step with retry logic
    async fn get_step_with_retry(
        &self,
        step_id: &str,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<InterventionStep> {
        const MAX_RETRIES: u32 = 3;
        let mut attempt = 0;

        loop {
            match self.data.get_step(step_id) {
                Ok(Some(step)) => return Ok(step),
                Ok(None) => {
                    return Err(InterventionError::NotFound(format!(
                        "Step {} not found",
                        step_id
                    )));
                }
                Err(e) => {
                    attempt += 1;
                    if attempt >= MAX_RETRIES {
                        let mut step_retry_context = std::collections::HashMap::new();
                        step_retry_context
                            .insert("step_id".to_string(), serde_json::json!(step_id));
                        step_retry_context
                            .insert("attempts".to_string(), serde_json::json!(attempt));
                        logger.error(
                            "Failed to get step after retries",
                            Some(&e),
                            Some(step_retry_context),
                        );
                        return Err(InterventionError::Database(format!(
                            "Failed to retrieve step after {} attempts: {}",
                            MAX_RETRIES, e
                        )));
                    }
                    let mut step_retry_warn_context = std::collections::HashMap::new();
                    step_retry_warn_context
                        .insert("step_id".to_string(), serde_json::json!(step_id));
                    step_retry_warn_context
                        .insert("attempt".to_string(), serde_json::json!(attempt));
                    logger.warn(
                        "Failed to get step, retrying",
                        Some(step_retry_warn_context),
                    );
                    std::thread::sleep(std::time::Duration::from_millis(100 * attempt as u64));
                }
            }
        }
    }

    /// Save step with retry logic
    async fn save_step_with_retry(
        &self,
        step: &InterventionStep,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<()> {
        const MAX_RETRIES: u32 = 3;
        let mut attempt = 0;

        loop {
            match self.data.save_step(step) {
                Ok(()) => return Ok(()),
                Err(e) => {
                    attempt += 1;
                    if attempt >= MAX_RETRIES {
                        let mut save_retry_context = std::collections::HashMap::new();
                        save_retry_context
                            .insert("step_id".to_string(), serde_json::json!(step.id));
                        save_retry_context
                            .insert("attempts".to_string(), serde_json::json!(attempt));
                        logger.error(
                            "Failed to save step after retries",
                            Some(&e),
                            Some(save_retry_context),
                        );
                        return Err(InterventionError::Database(format!(
                            "Failed to save step after {} attempts: {}",
                            MAX_RETRIES, e
                        )));
                    }
                    let mut save_retry_warn_context = std::collections::HashMap::new();
                    save_retry_warn_context
                        .insert("step_id".to_string(), serde_json::json!(step.id));
                    save_retry_warn_context
                        .insert("attempt".to_string(), serde_json::json!(attempt));
                    logger.warn(
                        "Failed to save step, retrying",
                        Some(save_retry_warn_context),
                    );
                    std::thread::sleep(std::time::Duration::from_millis(100 * attempt as u64));
                }
            }
        }
    }

    /// Determine whether the request includes completion data for a step.
    ///
    /// Returns true when collected_data is non-empty or when photos/issues are supplied.
    fn has_completion_data(request: &AdvanceStepRequest) -> bool {
        !matches!(
            request.collected_data,
            serde_json::Value::Null | serde_json::Value::Object(ref map) if map.is_empty()
        ) || request
            .photos
            .as_ref()
            .map_or(false, |photos| !photos.is_empty())
            || request
                .issues
                .as_ref()
                .map_or(false, |issues| !issues.is_empty())
    }

    fn apply_completion_requirements(
        &self,
        step: &mut InterventionStep,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<()> {
        if !step.requires_photos {
            return Ok(());
        }

        // Enforce inclusive minimum photo requirement.
        if step.photo_count < step.min_photos_required {
            let mut error_context = std::collections::HashMap::new();
            error_context.insert("step_id".to_string(), serde_json::json!(step.id));
            error_context.insert(
                "required_photos".to_string(),
                serde_json::json!(step.min_photos_required),
            );
            error_context.insert(
                "current_photos".to_string(),
                serde_json::json!(step.photo_count),
            );
            logger.error(
                "Step completion blocked: missing required photos",
                None,
                Some(error_context),
            );
            return Err(InterventionError::Workflow(format!(
                "Step {} requires at least {} photo(s); {} provided",
                step.step_number, step.min_photos_required, step.photo_count
            )));
        }

        if step.max_photos_allowed > 0 && step.photo_count > step.max_photos_allowed {
            let mut error_context = std::collections::HashMap::new();
            error_context.insert("step_id".to_string(), serde_json::json!(step.id));
            error_context.insert(
                "max_photos".to_string(),
                serde_json::json!(step.max_photos_allowed),
            );
            error_context.insert(
                "current_photos".to_string(),
                serde_json::json!(step.photo_count),
            );
            logger.error(
                "Step completion blocked: too many photos",
                None,
                Some(error_context),
            );
            return Err(InterventionError::Workflow(format!(
                "Step {} allows at most {} photo(s); {} provided",
                step.step_number, step.max_photos_allowed, step.photo_count
            )));
        }

        step.required_photos_completed = true;
        Ok(())
    }

    /// Save step progress without advancing to next step
    pub async fn save_step_progress(
        &self,
        request: SaveStepProgressRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> InterventionResult<InterventionStep> {
        let logger = RPMARequestLogger::new(
            correlation_id.to_string(),
            user_id.map(|s| s.to_string()),
            LogDomain::Task,
        );
        logger.info("Saving step progress", None);

        // Log request details for debugging
        eprintln!("[DEBUG] SaveStepProgressRequest: step_id={}, collected_data={:?}, notes={:?}, photos_count={:?}",
            request.step_id, request.collected_data, request.notes,
            request.photos.as_ref().map(|p| p.len()).unwrap_or(0));

        // Get current step
        eprintln!(
            "[DEBUG] Attempting to get step with ID: {}",
            request.step_id
        );
        let mut step = self
            .data
            .get_step(&request.step_id)
            .map_err(|e| {
                eprintln!("[DEBUG] Database error getting step: {:?}", e);
                e
            })?
            .ok_or_else(|| {
                eprintln!("[DEBUG] Step not found with ID: {}", request.step_id);
                InterventionError::NotFound(format!("Step {} not found", request.step_id))
            })?;

        // Log step details before updating
        eprintln!(
            "[DEBUG] Found step: id={}, intervention_id={}, step_number={}, step_status={:?}",
            step.id, step.intervention_id, step.step_number, step.step_status
        );

        // Set step to in-progress if not already set
        if step.step_status == StepStatus::Pending {
            step.step_status = StepStatus::InProgress;
            step.started_at = TimestampString::now();
        }

        // Update step with collected data (similar to advance_step but without marking as completed)
        step.collected_data = Some(request.collected_data.clone());
        step.notes = request.notes.clone();

        if let Some(photos) = &request.photos {
            step.photo_count = photos.len() as i32;
            step.photo_urls = Some(photos.clone());
        }

        // Validate that the data can be serialized for database storage
        if let Err(e) = serde_json::to_string(&step.collected_data) {
            eprintln!("[DEBUG] Failed to serialize collected_data: {:?}", e);
            return Err(InterventionError::Validation(format!(
                "Invalid collected_data format: {}",
                e
            )));
        }

        // Save the step
        self.data.save_step(&step).map_err(|e| {
            eprintln!("[DEBUG] Failed to save step in database: {:?}", e);
            e
        })?;

        logger.debug("Successfully saved progress for step", None);

        Ok(step)
    }

    /// Validate that an intervention can be finalized
    /// Finalize an intervention
    pub fn finalize_intervention(
        &self,
        request: FinalizeInterventionRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> InterventionResult<FinalizeInterventionResponse> {
        let logger = RPMARequestLogger::new(
            correlation_id.to_string(),
            user_id.map(|s| s.to_string()),
            LogDomain::Task,
        );
        logger.info("Finalizing intervention", None);
        // Get intervention
        let mut intervention = self
            .data
            .get_intervention(&request.intervention_id)?
            .ok_or_else(|| {
                InterventionError::NotFound(format!(
                    "Intervention {} not found",
                    request.intervention_id
                ))
            })?;

        // Comprehensive finalization validation
        self.validation
            .validate_intervention_finalization(&intervention, &logger)?;

        // Save collected data and photos to the finalization step if provided
        let steps = self.data.get_intervention_steps(&intervention.id)?;
        if let Some(finalization_step) = steps
            .iter()
            .find(|s| s.step_type == crate::models::step::StepType::Finalization)
        {
            let mut updated_step = finalization_step.clone();
            let mut step_updated = false;

            if let Some(collected_data) = &request.collected_data {
                updated_step.collected_data = Some(collected_data.clone());
                step_updated = true;
            }

            if let Some(photos) = &request.photos {
                updated_step.photo_count = photos.len() as i32;
                updated_step.photo_urls = Some(photos.clone());
                step_updated = true;
            }

            if step_updated {
                updated_step.step_status = StepStatus::Completed;
                updated_step.completed_at = TimestampString(Some(crate::models::common::now()));
                self.data.save_step(&updated_step)?;
                logger.debug(
                    "Updated finalization step with collected data and/or photos",
                    None,
                );
            }
        }

        // Update final data
        intervention.customer_satisfaction = request.customer_satisfaction;
        intervention.quality_score = request.quality_score;
        intervention.final_observations = request.final_observations;
        intervention.customer_signature = request.customer_signature;
        intervention.customer_comments = request.customer_comments;
        intervention.status = InterventionStatus::Completed;
        intervention.completed_at = TimestampString(Some(crate::models::common::now()));
        intervention.updated_at = crate::models::common::now();

        // Calculate actual duration
        if let (Some(start), Some(end)) = (
            intervention.started_at.inner(),
            intervention.completed_at.inner(),
        ) {
            intervention.actual_duration = Some(((end - start) / 60000) as i32);
        }

        // Save intervention
        self.data.save_intervention(&intervention)?;

        // Update associated task status to completed
        let now = crate::models::common::now();
        self.db.get_connection()?.execute(
            "UPDATE tasks SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?",
            rusqlite::params![now, now, intervention.task_id],
        ).map_err(|e| InterventionError::Database(format!("Failed to update task status: {}", e)))?;

        // Calculate basic metrics
        let metrics = crate::services::intervention_types::InterventionMetrics {
            total_duration_minutes: intervention.actual_duration.unwrap_or(0),
            completion_rate: 100.0, // Fully completed
            quality_score: intervention.quality_score,
            customer_satisfaction: intervention.customer_satisfaction,
            steps_completed: intervention.current_step,
            total_steps: intervention.current_step, // Assuming all steps up to current are completed
            photos_taken: 0,                        // Would need to count from steps
        };

        logger.info("Intervention finalized successfully", None);

        Ok(FinalizeInterventionResponse {
            intervention,
            metrics,
        })
    }

    /// Cancel an intervention
    pub fn cancel_intervention(
        &self,
        intervention_id: &str,
        user_id: &str,
    ) -> InterventionResult<Intervention> {
        // Get intervention
        let mut intervention = self
            .data
            .get_intervention(intervention_id)?
            .ok_or_else(|| {
                InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
            })?;

        // Check if intervention can be cancelled
        match intervention.status {
            InterventionStatus::Pending | InterventionStatus::InProgress => {
                // Can cancel
            }
            InterventionStatus::Completed | InterventionStatus::Cancelled => {
                return Err(InterventionError::BusinessRule(format!(
                    "Cannot cancel intervention in {} state",
                    intervention.status
                )));
            }
            InterventionStatus::Paused => {
                // Can cancel paused interventions
            }
        }

        // Update intervention status to cancelled
        intervention.status = InterventionStatus::Cancelled;
        intervention.updated_at = chrono::Utc::now().timestamp_millis();
        intervention.updated_by = Some(user_id.to_string());

        // Save to database
        let updates = json!({
            "status": serde_json::to_string(&intervention.status).unwrap_or_default(),
            "updated_at": intervention.updated_at,
            "updated_by": intervention.updated_by
        });
        self.data.update_intervention(&intervention.id, updates)?;

        Ok(intervention)
    }

    /// Get an intervention by ID
    pub fn get_intervention_by_id(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        self.data.get_intervention(intervention_id)
    }

    /// Get interventions for a task
    pub fn get_interventions_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Vec<Intervention>> {
        // Since the data service doesn't have this method, we'll implement it directly
        // Get all interventions and filter by task_id
        let (interventions, _) = self
            .data
            .list_interventions(None, None, Some(1000), Some(0))?;
        Ok(interventions
            .into_iter()
            .filter(|i| i.task_id == task_id)
            .collect())
    }

    /// List interventions with pagination
    pub fn list_interventions(
        &self,
        limit: i32,
        offset: i32,
    ) -> InterventionResult<Vec<Intervention>> {
        let (interventions, _) =
            self.data
                .list_interventions(None, None, Some(limit), Some(offset))?;
        Ok(interventions)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::step::StepType;
    use crate::test_utils::TestDatabase;

    fn test_logger() -> RPMARequestLogger {
        RPMARequestLogger::new("test-correlation".to_string(), None, LogDomain::Task)
    }

    #[test]
    fn test_apply_completion_requirements_requires_photos() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = InterventionWorkflowService::new(test_db.db());
        let mut step = InterventionStep::new(
            "intervention-1".to_string(),
            1,
            "Inspection".to_string(),
            StepType::Inspection,
        );
        step.requires_photos = true;
        step.min_photos_required = 2;
        step.photo_count = 1;

        let result = service.apply_completion_requirements(&mut step, &test_logger());

        assert!(matches!(result, Err(InterventionError::Workflow(_))));
        assert!(!step.required_photos_completed);
    }

    #[test]
    fn test_apply_completion_requirements_marks_completed() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = InterventionWorkflowService::new(test_db.db());
        let mut step = InterventionStep::new(
            "intervention-1".to_string(),
            1,
            "Inspection".to_string(),
            StepType::Inspection,
        );
        step.requires_photos = true;
        step.min_photos_required = 2;
        step.photo_count = 2;

        let result = service.apply_completion_requirements(&mut step, &test_logger());

        assert!(result.is_ok());
        assert!(step.required_photos_completed);
    }
}
