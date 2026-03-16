//! Workflow Engine — intervention state machine and lifecycle transitions
//!
//! Handles starting, finalizing, cancelling, and rollback of interventions.

use crate::db::InterventionError;
use crate::domains::interventions::domain::models::intervention::InterventionStatus;
use crate::domains::tasks::domain::models::task::TaskStatus;
use crate::domains::interventions::domain::models::step::StepStatus;
use crate::domains::interventions::domain::services::intervention_state_machine;
use crate::domains::interventions::infrastructure::intervention_types::{
    FinalizeInterventionRequest, FinalizeInterventionResponse, InterventionMetrics,
    StartInterventionRequest, StartInterventionResponse, StepRequirement,
};
use crate::domains::interventions::infrastructure::workflow_strategy::{
    EnvironmentConditions, WorkflowContext, WorkflowStrategyFactory,
};
use crate::shared::contracts::common::TimestampString;
use crate::shared::logging::{LogDomain, RPMARequestLogger};
use chrono::Utc;
use serde_json::json;
use tracing::info;

impl super::InterventionWorkflowService {
    /// Start a new PPF intervention
    pub fn start_intervention(
        &self,
        request: StartInterventionRequest,
        user_id: &str,
        correlation_id: &str,
    ) -> crate::db::InterventionResult<StartInterventionResponse> {
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
                if let Err(cleanup_err) = self.cleanup_failed_start(&request.task_id, &logger) {
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
    ) -> crate::db::InterventionResult<StartInterventionResponse> {
        self.db
            .with_transaction(|tx| {
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

                let strategy =
                    WorkflowStrategyFactory::create_strategy(&intervention, &workflow_context);
                logger.debug(
                    &format!("Using workflow strategy: {}", strategy.strategy_name()),
                    None,
                );

                let workflow_result = strategy
                    .initialize_workflow_sync(&intervention, &workflow_context)
                    .map_err(|e| e.to_string())?;

                let steps = workflow_result.steps;

                // QW-3 perf: prepare statement once, execute N times instead of N prepare+execute.
                self.data
                    .save_steps_batch_with_tx(tx, &steps)
                    .map_err(|e| e.to_string())?;

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

                Ok(StartInterventionResponse {
                    intervention,
                    steps,
                    initial_requirements,
                })
            })
            .map_err(InterventionError::Database)
    }

    /// Cleanup partial state on failed intervention start
    fn cleanup_failed_start(
        &self,
        task_id: &str,
        logger: &RPMARequestLogger,
    ) -> crate::db::InterventionResult<()> {
        let mut cleanup_context = std::collections::HashMap::new();
        cleanup_context.insert("task_id".to_string(), serde_json::json!(task_id));
        logger.warn(
            "Cleaning up failed intervention start",
            Some(cleanup_context),
        );

        let mut cleanup_errors = Vec::new();

        // QW-5 perf: acquire one connection for both cleanup statements instead of two.
        match self.db.get_connection() {
            Err(e) => {
                cleanup_errors.push(format!("Failed to get cleanup connection: {}", e));
            }
            Ok(conn) => {
                if let Err(e) = conn
                    .execute(
                        "UPDATE tasks SET workflow_id = NULL, current_workflow_step_id = NULL, status = ?, started_at = NULL WHERE id = ? AND workflow_id IS NOT NULL",
                        rusqlite::params![TaskStatus::Draft.to_string(), task_id],
                    )
                    .map_err(|db_err| db_err.to_string())
                {
                    let mut ctx = std::collections::HashMap::new();
                    ctx.insert("task_id".to_string(), serde_json::json!(task_id));
                    ctx.insert("error".to_string(), serde_json::json!(e));
                    logger.error("Failed to cleanup task workflow state", None, Some(ctx));
                    cleanup_errors.push(format!("Failed to reset task: {}", e));
                }

                let del_result: Result<(), String> = (|| {
                    conn.execute(
                        "DELETE FROM intervention_steps WHERE intervention_id IN (SELECT id FROM interventions WHERE task_id = ?)",
                        rusqlite::params![task_id],
                    )
                    .map_err(|db_err| db_err.to_string())?;
                    conn.execute(
                        "DELETE FROM interventions WHERE task_id = ?",
                        rusqlite::params![task_id],
                    )
                    .map_err(|db_err| db_err.to_string())?;
                    Ok(())
                })();

                if let Err(e) = del_result {
                    let mut ctx = std::collections::HashMap::new();
                    ctx.insert("task_id".to_string(), serde_json::json!(task_id));
                    ctx.insert("error".to_string(), serde_json::json!(e));
                    logger.error("Failed to cleanup orphaned intervention", None, Some(ctx));
                    cleanup_errors.push(format!("Failed to delete orphaned intervention: {}", e));
                } else {
                    let mut ctx = std::collections::HashMap::new();
                    ctx.insert("task_id".to_string(), serde_json::json!(task_id));
                    logger.info("Successfully cleaned up orphaned intervention", Some(ctx));
                }
            }
        }

        if !cleanup_errors.is_empty() {
            return Err(InterventionError::Database(format!(
                "Cleanup completed with errors: {}",
                cleanup_errors.join("; ")
            )));
        }

        Ok(())
    }

    /// Finalize an intervention
    pub fn finalize_intervention(
        &self,
        request: FinalizeInterventionRequest,
        correlation_id: &str,
        user_id: Option<&str>,
    ) -> crate::db::InterventionResult<FinalizeInterventionResponse> {
        let logger = RPMARequestLogger::new(
            correlation_id.to_string(),
            user_id.map(|s| s.to_string()),
            LogDomain::Task,
        );
        logger.info("Finalizing intervention", None);

        let mut intervention = self
            .data
            .get_intervention(&request.intervention_id)?
            .ok_or_else(|| {
                InterventionError::NotFound(format!(
                    "Intervention {} not found",
                    request.intervention_id
                ))
            })?;

        self.validation
            .validate_intervention_finalization(&intervention, &logger)?;

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
                step.step_data = step.collected_data.clone();
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

        intervention.customer_satisfaction = request.customer_satisfaction;
        intervention.quality_score = request.quality_score;
        intervention.final_observations = request.final_observations;
        intervention.customer_signature = request.customer_signature;
        intervention.customer_comments = request.customer_comments;
        intervention_state_machine::validate_transition(
            &intervention.status,
            &InterventionStatus::Completed,
        )
        .map_err(InterventionError::BusinessRule)?;
        intervention.status = InterventionStatus::Completed;
        intervention.completed_at = TimestampString(Some(crate::shared::contracts::common::now()));
        intervention.updated_at = crate::shared::contracts::common::now();

        if let (Some(start), Some(end)) = (
            intervention.started_at.inner(),
            intervention.completed_at.inner(),
        ) {
            intervention.actual_duration = Some(((end - start) / 60000) as i32);
        }

        let task_id = intervention.task_id.clone();
        self.db
            .with_transaction(|tx| {
                if let Some(ref step) = updated_step {
                    self.data
                        .save_step_with_tx(tx, step)
                        .map_err(|e| e.to_string())?;
                }

                self.data
                    .save_intervention_with_tx(tx, &intervention)
                    .map_err(|e| e.to_string())?;

                let now = crate::shared::contracts::common::now();
                tx.execute(
                    "UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?",
                    rusqlite::params![TaskStatus::Completed.to_string(), now, now, task_id],
                )
                .map_err(|e| format!("Failed to update task status: {}", e))?;

                Ok(())
            })
            .map_err(InterventionError::Database)?;

        if updated_step.is_some() {
            logger.debug("Marked finalization step as completed", None);
        }

        let metrics = InterventionMetrics {
            total_duration_minutes: intervention.actual_duration.unwrap_or(0),
            completion_rate: 100.0,
            quality_score: intervention.quality_score,
            customer_satisfaction: intervention.customer_satisfaction,
            steps_completed: intervention.current_step,
            total_steps: intervention.current_step,
            photos_taken: 0,
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
    ) -> crate::db::InterventionResult<
        crate::domains::interventions::domain::models::intervention::Intervention,
    > {
        let mut intervention = self
            .data
            .get_intervention(intervention_id)?
            .ok_or_else(|| {
                InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
            })?;

        match intervention.status {
            InterventionStatus::Pending | InterventionStatus::InProgress => {}
            InterventionStatus::Completed | InterventionStatus::Cancelled => {
                return Err(InterventionError::BusinessRule(format!(
                    "Cannot cancel intervention in {} state",
                    intervention.status
                )));
            }
            InterventionStatus::Paused => {}
        }

        intervention_state_machine::validate_transition(
            &intervention.status,
            &InterventionStatus::Cancelled,
        )
        .map_err(InterventionError::BusinessRule)?;
        intervention.status = InterventionStatus::Cancelled;
        intervention.updated_at = chrono::Utc::now().timestamp_millis();
        intervention.updated_by = Some(user_id.to_string());

        let updates = json!({
            "status": serde_json::to_string(&intervention.status).unwrap_or_default(),
            "updated_at": intervention.updated_at,
            "updated_by": intervention.updated_by
        });
        self.data.update_intervention(&intervention.id, updates)?;

        Ok(intervention)
    }

    /// Start an intervention from a quote
    pub fn start_intervention_from_quote(
        &self,
        task_id: &str,
        quote_id: &str,
    ) -> crate::db::InterventionResult<
        crate::domains::interventions::domain::models::intervention::Intervention,
    > {
        info!(
            task_id = %task_id,
            quote_id = %quote_id,
            "Starting intervention from quote"
        );

        let existing_intervention = self.data.get_active_intervention_by_task(task_id)?;
        if existing_intervention.is_some() {
            info!(
                task_id = %task_id,
                "Active intervention already exists for task, skipping creation"
            );
            return Err(InterventionError::BusinessRule(
                "An active intervention already exists for this task".to_string(),
            ));
        }

        let result = self
            .db
            .with_transaction(|tx| {
                let intervention = self
                    .data
                    .create_intervention_with_tx(
                        tx,
                        &StartInterventionRequest {
                            task_id: task_id.to_string(),
                            technician_id: "system".to_string(),
                            intervention_number: None,
                            ppf_zones: vec![],
                            custom_zones: None,
                            film_type: "standard".to_string(),
                            film_brand: None,
                            film_model: None,
                            weather_condition: "unknown".to_string(),
                            lighting_condition: "unknown".to_string(),
                            work_location: "workshop".to_string(),
                            temperature: None,
                            humidity: None,
                            assistant_ids: None,
                            scheduled_start: Utc::now()
                                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                                .to_string(),
                            estimated_duration: 60,
                            gps_coordinates: None,
                            address: None,
                            notes: Some(format!("Intervention created from quote {}", quote_id)),
                            customer_requirements: None,
                            special_instructions: None,
                        },
                        "system",
                    )
                    .map_err(|e| e.to_string())?;

                info!(
                    intervention_id = %intervention.id,
                    "Intervention created from quote successfully"
                );

                Ok(intervention)
            })
            .map_err(InterventionError::Database)?;

        Ok(result)
    }
}
