//! Workflow Steps — step advancement, completion requirements, and progress saving

use crate::db::InterventionError;
use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus};
use crate::domains::interventions::infrastructure::intervention_types::{
    AdvanceStepRequest, AdvanceStepResponse, SaveStepProgressRequest,
};
use crate::shared::contracts::common::TimestampString;
use crate::shared::logging::{LogDomain, RPMARequestLogger};

impl super::InterventionWorkflowService {
    /// Advance to the next step in the workflow
    pub async fn advance_step(
        &self,
        request: AdvanceStepRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> crate::db::InterventionResult<AdvanceStepResponse> {
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

        let mut intervention = self
            .get_intervention_with_retry(&request.intervention_id, &logger)
            .await?;

        let mut current_step = self.get_step_with_retry(&request.step_id, &logger).await?;

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

        self.data
            .update_step_with_data(&mut current_step, &request)?;

        if current_step.step_status == StepStatus::Pending {
            current_step.step_status = StepStatus::InProgress;
            current_step.started_at = TimestampString::now();
        }

        if current_step.step_status == StepStatus::InProgress && !has_completion_data {
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

        current_step.step_status = StepStatus::Completed;
        current_step.completed_at = TimestampString::now();

        self.save_step_with_retry(&current_step, &logger).await?;

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

        let progress_percentage = intervention.completion_percentage as f32;
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
    ) -> crate::db::InterventionResult<T>
    where
        F: Fn() -> crate::db::InterventionResult<T>,
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
    pub(super) async fn get_intervention_with_retry(
        &self,
        intervention_id: &str,
        logger: &RPMARequestLogger,
    ) -> crate::db::InterventionResult<Intervention> {
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
    ) -> crate::db::InterventionResult<InterventionStep> {
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
    ) -> crate::db::InterventionResult<()> {
        let data = &self.data;
        self.with_retry("save step", &step.id, logger, || data.save_step(step))
            .await
    }

    /// Determine whether the request includes completion data for a step.
    pub fn has_completion_data(request: &AdvanceStepRequest) -> bool {
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

    pub fn apply_completion_requirements(
        &self,
        step: &mut InterventionStep,
        logger: &RPMARequestLogger,
    ) -> crate::db::InterventionResult<()> {
        if !step.requires_photos {
            return Ok(());
        }

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
    ) -> crate::db::InterventionResult<InterventionStep> {
        let logger = RPMARequestLogger::new(
            correlation_id.to_string(),
            user_id.map(|s| s.to_string()),
            LogDomain::Task,
        );
        logger.info("Saving step progress", None);

        eprintln!("[DEBUG] SaveStepProgressRequest: step_id={}, collected_data={:?}, notes={:?}, photos_count={:?}",
            request.step_id, request.collected_data, request.notes,
            request.photos.as_ref().map(|p| p.len()).unwrap_or(0));

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

        eprintln!(
            "[DEBUG] Found step: id={}, intervention_id={}, step_number={}, step_status={:?}",
            step.id, step.intervention_id, step.step_number, step.step_status
        );

        match step.step_status {
            StepStatus::Pending => {
                step.step_status = StepStatus::InProgress;
                step.started_at = TimestampString::now();
            }
            StepStatus::Completed => {
                step.step_status = StepStatus::Completed;
            }
            _ => {}
        }

        step.collected_data = Some(request.collected_data.clone());
        step.step_data = step.collected_data.clone();
        step.notes = request.notes.clone();

        if let Some(photos) = &request.photos {
            step.photo_count = photos.len() as i32;
            step.photo_urls = Some(photos.clone());
        }

        if let Err(e) = serde_json::to_string(&step.collected_data) {
            eprintln!("[DEBUG] Failed to serialize collected_data: {:?}", e);
            return Err(InterventionError::Validation(format!(
                "Invalid collected_data format: {}",
                e
            )));
        }

        self.data.save_step(&step).map_err(|e| {
            eprintln!("[DEBUG] Failed to save step in database: {:?}", e);
            e
        })?;

        logger.debug("Successfully saved progress for step", None);

        Ok(step)
    }
}
