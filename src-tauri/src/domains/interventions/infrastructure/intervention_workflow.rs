//! Intervention Workflow Service - Handles PPF workflow operations
//!
//! This service manages the core PPF intervention workflow including:
//! - Starting interventions
//! - Advancing through workflow steps
//! - Saving step progress
//! - Finalizing interventions

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionStatus,
};
use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus};
use crate::domains::interventions::infrastructure::intervention_data::InterventionDataService;
use crate::domains::interventions::infrastructure::intervention_types::*;
use crate::domains::tasks::infrastructure::workflow_strategy::{
    EnvironmentConditions, WorkflowContext, WorkflowStrategyFactory,
};
use crate::domains::tasks::infrastructure::workflow_validation::WorkflowValidationService;
use crate::logging::{LogDomain, RPMARequestLogger};
use crate::shared::contracts::common::TimestampString;
use crate::shared::event_bus::{publish_event, InterventionFinalized};
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

        logger.debug(
            "Advance step state",
            Some(std::collections::HashMap::from([
                (
                    "step_number".to_string(),
                    serde_json::json!(current_step.step_number),
                ),
                (
                    "step_status".to_string(),
                    serde_json::json!(current_step.step_status),
                ),
                (
                    "has_completion_data".to_string(),
                    serde_json::json!(has_completion_data),
                ),
                (
                    "photo_count".to_string(),
                    serde_json::json!(request.photos.as_ref().map(|p| p.len()).unwrap_or(0)),
                ),
            ])),
        );

        // Update step with collected data
        self.data
            .update_step_with_data(&mut current_step, &request)?;

        // Set step to in-progress if not already set
        // This allows a single call to transition Pending Ã¢â€ â€™ InProgress Ã¢â€ â€™ Completed
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

    /// Execute an operation with retry logic and structured logging.
    async fn with_retry<T, F>(
        &self,
        entity_label: &str,
        entity_id: &str,
        logger: &RPMARequestLogger,
        operation: F,
    ) -> InterventionResult<T>
    where
        F: Fn() -> InterventionResult<T>,
    {
        const MAX_RETRIES: u32 = 3;
        let mut attempt = 0;

        loop {
            match operation() {
                Ok(value) => return Ok(value),
                Err(e) => {
                    attempt += 1;
                    if attempt >= MAX_RETRIES {
                        let mut ctx = std::collections::HashMap::new();
                        ctx.insert(format!("{}_id", entity_label), serde_json::json!(entity_id));
                        ctx.insert("attempts".to_string(), serde_json::json!(attempt));
                        logger.error(
                            &format!("Failed to {} after retries", entity_label),
                            Some(&e),
                            Some(ctx),
                        );
                        return Err(InterventionError::Database(format!(
                            "Failed to {} after {} attempts: {}",
                            entity_label, MAX_RETRIES, e
                        )));
                    }
                    let mut ctx = std::collections::HashMap::new();
                    ctx.insert(format!("{}_id", entity_label), serde_json::json!(entity_id));
                    ctx.insert("attempt".to_string(), serde_json::json!(attempt));
                    logger.warn(&format!("Failed to {}, retrying", entity_label), Some(ctx));
                    std::thread::sleep(std::time::Duration::from_millis(100 * attempt as u64));
                }
            }
        }
    }

    /// Get intervention with retry logic
    async fn get_intervention_with_retry(
        &self,
        intervention_id: &str,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<Intervention> {
        let data = &self.data;
        let id = intervention_id.to_string();
        self.with_retry("get intervention", intervention_id, logger, move || {
            data.get_intervention(&id)?.ok_or_else(|| {
                InterventionError::NotFound(format!("Intervention {} not found", id))
            })
        })
        .await
    }

    /// Get step with retry logic
    async fn get_step_with_retry(
        &self,
        step_id: &str,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<InterventionStep> {
        let data = &self.data;
        let id = step_id.to_string();
        self.with_retry("get step", step_id, logger, move || {
            data.get_step(&id)?
                .ok_or_else(|| InterventionError::NotFound(format!("Step {} not found", id)))
        })
        .await
    }

    /// Save step with retry logic
    async fn save_step_with_retry(
        &self,
        step: &InterventionStep,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<()> {
        let data = &self.data;
        self.with_retry("save step", &step.id, logger, || data.save_step(step))
            .await
    }

    /// Determine whether the request includes completion data for a step.
    ///
    /// Returns true when collected_data is non-empty or when photos/issues are supplied.
    fn has_completion_data(request: &AdvanceStepRequest) -> bool {
        let has_collected_data = match &request.collected_data {
            serde_json::Value::Null => false,
            serde_json::Value::Object(map) if map.is_empty() => false,
            _ => true,
        };

        has_collected_data
            || request
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

        // Prepare the finalization step update outside the transaction
        let steps = self.data.get_intervention_steps(&intervention.id)?;
        let finalization_step = steps
            .iter()
            .find(|s| {
                s.step_type
                    == crate::domains::interventions::domain::models::step::StepType::Finalization
            })
            .cloned();

        let updated_step = finalization_step.map(|mut step| {
            if let Some(collected_data) = &request.collected_data {
                step.collected_data = Some(collected_data.clone());
            }

            if let Some(photos) = &request.photos {
                step.photo_count = photos.len() as i32;
                step.photo_urls = Some(photos.clone());
            }

            step.step_status = StepStatus::Completed;
            step.completed_at = TimestampString(Some(crate::shared::contracts::common::now()));
            if step.started_at.inner().is_none() {
                step.started_at = TimestampString(Some(crate::shared::contracts::common::now()));
            }
            step
        });

        // Update final data
        intervention.customer_satisfaction = request.customer_satisfaction;
        intervention.quality_score = request.quality_score;
        intervention.final_observations = request.final_observations;
        intervention.customer_signature = request.customer_signature;
        intervention.customer_comments = request.customer_comments;
        intervention.status = InterventionStatus::Completed;
        intervention.completed_at = TimestampString(Some(crate::shared::contracts::common::now()));
        intervention.updated_at = crate::shared::contracts::common::now();

        // Calculate actual duration
        if let (Some(start), Some(end)) = (
            intervention.started_at.inner(),
            intervention.completed_at.inner(),
        ) {
            intervention.actual_duration = Some(((end - start) / 60000) as i32);
        }

        // Wrap step save, intervention save, and task status update in a single transaction
        let task_id = intervention.task_id.clone();
        self.db
            .with_transaction(|tx| {
                // Save finalization step within the transaction
                if let Some(ref step) = updated_step {
                    self.data
                        .save_step_with_tx(tx, step)
                        .map_err(|e| e.to_string())?;
                }

                // Save intervention within the transaction
                self.data
                    .save_intervention_with_tx(tx, &intervention)
                    .map_err(|e| e.to_string())?;

                // Update associated task status to completed
                let now = crate::shared::contracts::common::now();
                tx.execute(
                    "UPDATE tasks SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?",
                    rusqlite::params![now, now, task_id],
                )
                .map_err(|e| format!("Failed to update task status: {}", e))?;

                Ok(())
            })
            .map_err(InterventionError::Database)?;

        let completed_at_ms = intervention
            .completed_at
            .inner()
            .unwrap_or_else(crate::shared::contracts::common::now);
        let technician_id = user_id
            .map(|id| id.to_string())
            .or_else(|| intervention.technician_id.clone())
            .unwrap_or_else(|| "system".to_string());
        publish_event(
            InterventionFinalized {
                intervention_id: intervention.id.clone(),
                task_id: intervention.task_id.clone(),
                technician_id,
                completed_at_ms,
            }
            .into(),
        );

        if updated_step.is_some() {
            logger.debug("Marked finalization step as completed", None);
        }

        // Calculate basic metrics
        let metrics = crate::domains::interventions::infrastructure::intervention_types::InterventionMetrics {
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
    use crate::domains::interventions::domain::models::step::StepType;
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

    #[test]
    fn test_has_completion_data_with_empty_collected_data_and_no_media() {
        let request = AdvanceStepRequest {
            intervention_id: "int-1".to_string(),
            step_id: "step-1".to_string(),
            collected_data: serde_json::Value::Object(Default::default()),
            photos: None,
            notes: None,
            quality_check_passed: true,
            issues: None,
        };

        assert!(!InterventionWorkflowService::has_completion_data(&request));
    }

    #[test]
    fn test_has_completion_data_with_collected_data_or_media() {
        let mut request = AdvanceStepRequest {
            intervention_id: "int-1".to_string(),
            step_id: "step-1".to_string(),
            collected_data: serde_json::json!({"k": "v"}),
            photos: None,
            notes: None,
            quality_check_passed: true,
            issues: None,
        };

        assert!(InterventionWorkflowService::has_completion_data(&request));

        request.collected_data = serde_json::Value::Null;
        request.photos = Some(vec!["photo-1".to_string()]);
        assert!(InterventionWorkflowService::has_completion_data(&request));

        request.photos = None;
        request.issues = Some(vec!["issue-1".to_string()]);
        assert!(InterventionWorkflowService::has_completion_data(&request));
    }
}
