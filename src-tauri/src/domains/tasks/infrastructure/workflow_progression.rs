//! Workflow Progression Service
//!
//! Extracted from InterventionWorkflowService to handle step advancement,
//! progress tracking, and workflow state transitions.

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::logging::RPMARequestLogger;
use crate::models::intervention::Intervention;
use crate::models::step::{InterventionStep, StepStatus};
use crate::services::intervention_data::InterventionDataService;
use crate::services::intervention_types::AdvanceStepRequest;
use crate::services::intervention_types::AdvanceStepResponse;
use crate::shared::contracts::common::TimestampString;

use std::sync::Arc;

/// Service for handling workflow progression operations
#[derive(Debug)]
pub struct WorkflowProgressionService {
    db: Arc<Database>,
    data: InterventionDataService,
}

impl WorkflowProgressionService {
    /// Create a new WorkflowProgressionService
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            data: InterventionDataService::new(db.clone()),
            db,
        }
    }

    /// Advance to the next step in the workflow
    pub async fn advance_step(
        &self,
        intervention: &mut Intervention,
        current_step: &mut InterventionStep,
        request: &AdvanceStepRequest,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<AdvanceStepResponse> {
        // Update step with collected data
        self.data
            .update_step_with_data(current_step, request)
            .map_err(|e| {
                logger.error("Failed to update step with data", Some(&e), None);
                InterventionError::Database(format!("Failed to update step: {}", e))
            })?;

        // Set step to in-progress if not already set
        if current_step.step_status == StepStatus::Pending {
            current_step.step_status = StepStatus::InProgress;
            current_step.started_at = TimestampString::now();
        }

        // Mark step as completed
        current_step.step_status = StepStatus::Completed;
        current_step.completed_at = TimestampString::now();

        // Save updated step
        self.save_step_with_retry(current_step, logger).await?;

        // Update intervention progress
        self.data
            .update_intervention_progress(intervention)
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
            .get_next_step(intervention, current_step.step_number)
        {
            Ok(step) => step,
            Err(_e) => {
                let mut next_step_context = std::collections::HashMap::new();
                next_step_context.insert(
                    "current_step".to_string(),
                    serde_json::json!(current_step.step_number),
                );
                logger.warn("Failed to get next step", Some(next_step_context));
                None // Continue without next step rather than failing
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
            step: current_step.clone(),
            next_step,
            progress_percentage,
            requirements_completed,
        })
    }

    /// Save step progress without advancing to next step
    pub async fn save_step_progress(
        &self,
        step_id: &str,
        collected_data: &serde_json::Value,
        notes: &Option<String>,
        photos: &Option<Vec<String>>,
        logger: &RPMARequestLogger,
    ) -> InterventionResult<InterventionStep> {
        logger.info("Saving step progress", None);

        // Get current step
        let mut step = self
            .data
            .get_step(step_id)
            .map_err(|e| {
                eprintln!("[DEBUG] Database error getting step: {:?}", e);
                e
            })?
            .ok_or_else(|| {
                eprintln!("[DEBUG] Step not found with ID: {}", step_id);
                InterventionError::NotFound(format!("Step {} not found", step_id))
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

        // Update step with collected data
        step.collected_data = Some(collected_data.clone());
        step.notes = notes.clone();

        if let Some(photos) = photos {
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

    /// Get intervention with retry logic
    pub async fn get_intervention_with_retry(
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
    pub async fn get_step_with_retry(
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
}
