//! Intervention Data Service - Handles all data operations
//!
//! This service manages data access and manipulation for PPF interventions including:
//! - Creating and updating interventions
//! - Managing workflow steps
//! - Data persistence operations
//! - Query operations

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::models::common::*;
use crate::models::intervention::{Intervention, InterventionStatus, InterventionType};
use crate::models::step::{InterventionStep, StepType};
use crate::repositories::InterventionRepository;
use crate::services::intervention_calculation::InterventionCalculationService;
use crate::services::intervention_types::{AdvanceStepRequest, StartInterventionRequest};
use rusqlite::{params, OptionalExtension, Transaction};
use std::str::FromStr;

use std::sync::Arc;
use tracing::warn;

/// Service for intervention data operations
#[derive(Debug)]
pub struct InterventionDataService {
    db: Arc<Database>,
    repository: InterventionRepository,
}

impl InterventionDataService {
    /// Create new data service
    pub fn new(db: Arc<Database>) -> Self {
        let repository = InterventionRepository::new(db.clone());
        Self { db, repository }
    }

    /// Create a new intervention (transaction-based)
    pub fn create_intervention_with_tx(
        &self,
        tx: &Transaction,
        request: &StartInterventionRequest,
        user_id: &str,
    ) -> InterventionResult<Intervention> {
        // Get task_number and vehicle_plate from task
        let (task_number, vehicle_plate): (String, Option<String>) = tx
            .query_row(
                "SELECT task_number, vehicle_plate FROM tasks WHERE id = ?",
                params![request.task_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|e| {
                InterventionError::NotFound(format!("Task {} not found: {}", request.task_id, e))
            })?;
        let vehicle_plate = vehicle_plate.unwrap_or_else(|| "UNKNOWN".to_string());

        let intervention_id = uuid::Uuid::new_v4().to_string();

        let mut intervention =
            Intervention::new(request.task_id.clone(), task_number.clone(), vehicle_plate);
        intervention.id = intervention_id;

        // Set audit fields
        intervention.created_by = Some(user_id.to_string());
        intervention.updated_by = Some(user_id.to_string());
        intervention.updated_at = now();

        // Set intervention properties from request
        intervention.status = InterventionStatus::InProgress;
        intervention.started_at = TimestampString::now();
        intervention.technician_id = Some(request.technician_id.clone());
        intervention.intervention_type = InterventionType::Ppf;
        intervention.ppf_zones_config = Some(request.ppf_zones.clone());
        intervention.film_type =
            Some(FilmType::from_str(&request.film_type).unwrap_or(FilmType::Matte));
        intervention.film_brand = request.film_brand.clone();
        intervention.film_model = request.film_model.clone();
        intervention.scheduled_at = TimestampString(Some(
            chrono::DateTime::parse_from_rfc3339(&request.scheduled_start)
                .map(|dt| dt.timestamp_millis())
                .unwrap_or(now()),
        ));
        intervention.estimated_duration = Some(request.estimated_duration);
        intervention.weather_condition = Some(
            WeatherCondition::from_str(&request.weather_condition)
                .unwrap_or(WeatherCondition::Sunny),
        );
        intervention.lighting_condition = Some(
            LightingCondition::from_str(&request.lighting_condition)
                .unwrap_or(LightingCondition::Natural),
        );
        intervention.work_location =
            Some(WorkLocation::from_str(&request.work_location).unwrap_or(WorkLocation::Indoor));
        intervention.temperature_celsius = request.temperature.map(|t| t as f64);
        intervention.humidity_percentage = request.humidity.map(|h| h as f64);
        if let Some(gps) = &request.gps_coordinates {
            intervention.start_location_lat = Some(gps.latitude);
            intervention.start_location_lon = Some(gps.longitude);
            intervention.start_location_accuracy = None;
        }
        intervention.notes = request.notes.clone();
        intervention.special_instructions = request
            .customer_requirements
            .clone()
            .map(|reqs| reqs.join("; "));

        self.repository
            .create_intervention_with_tx(tx, &intervention)?;

        Ok(intervention)
    }

    /// Create a new intervention
    pub fn create_intervention(
        &self,
        request: &StartInterventionRequest,
        user_id: &str,
    ) -> InterventionResult<Intervention> {
        // For backward compatibility, use a transaction internally
        self.db
            .with_transaction(|tx| {
                self.create_intervention_with_tx(tx, request, user_id)
                    .map_err(|e| e.to_string())
            })
            .map_err(InterventionError::Database)
    }

    /// Initialize workflow steps for an intervention (transaction-based)
    /// NOTE: This method is deprecated. Use InterventionWorkflowService.start_intervention instead
    /// which uses the new workflow strategy pattern for flexible workflow definitions.
    pub fn initialize_workflow_steps_with_tx(
        &self,
        tx: &Transaction,
        intervention: &Intervention,
    ) -> InterventionResult<Vec<InterventionStep>> {
        // Use synchronous version of workflow strategy to avoid runtime creation
        use crate::services::workflow_strategy::{WorkflowContext, WorkflowStrategyFactory};

        let workflow_context = WorkflowContext {
            intervention: intervention.clone(),
            user_id: "system".to_string(), // Not used in this context
            environment_conditions: None,  // Not available in this context
        };

        let strategy = WorkflowStrategyFactory::create_strategy(intervention, &workflow_context);

        // Use synchronous version instead of creating runtime
        let workflow_result = strategy
            .initialize_workflow_sync(intervention, &workflow_context)
            .map_err(|e| {
                InterventionError::Database(format!("Failed to initialize workflow: {}", e))
            })?;

        // Save steps to database
        for step in &workflow_result.steps {
            self.save_step_with_tx(tx, step)?;
        }

        Ok(workflow_result.steps)
    }

    /// Initialize workflow steps for an intervention
    pub fn initialize_workflow_steps(
        &self,
        intervention: &Intervention,
    ) -> InterventionResult<Vec<InterventionStep>> {
        // For backward compatibility, use a transaction internally
        self.db
            .with_transaction(|tx| {
                self.initialize_workflow_steps_with_tx(tx, intervention)
                    .map_err(|e| e.to_string())
            })
            .map_err(InterventionError::Database)
    }

    /// Update step with collected data
    pub fn update_step_with_data(
        &self,
        step: &mut InterventionStep,
        request: &AdvanceStepRequest,
    ) -> InterventionResult<()> {
        step.collected_data = Some(request.collected_data.clone());
        step.notes = request.notes.clone();

        if let Some(photos) = &request.photos {
            step.photo_count = photos.len() as i32;
            step.photo_urls = Some(photos.clone());
        }

        // Handle quality checks and issues
        if let Ok(mut data) =
            serde_json::from_value::<serde_json::Value>(request.collected_data.clone())
        {
            if let Some(obj) = data.as_object_mut() {
                obj.insert(
                    "quality_check_passed".to_string(),
                    serde_json::Value::Bool(request.quality_check_passed),
                );
                if let Some(issues) = &request.issues {
                    obj.insert(
                        "issues".to_string(),
                        serde_json::to_value(issues).unwrap_or(serde_json::Value::Array(vec![])),
                    );
                }
                step.collected_data =
                    Some(serde_json::to_value(obj).unwrap_or(request.collected_data.clone()));
            }
        }

        Ok(())
    }

    /// Update intervention progress
    pub async fn update_intervention_progress(
        &self,
        intervention: &mut Intervention,
    ) -> InterventionResult<()> {
        // Get all steps
        let steps = self.get_intervention_steps(&intervention.id)?;

        let summary = InterventionCalculationService::summarize_steps(&steps);

        // Update current step and progress
        intervention.current_step = summary.completed_steps as i32;
        intervention.completion_percentage = summary.completion_percentage;
        // Note: status is finalized explicitly in the finalization flow, even if progress reaches 100%.

        intervention.updated_at = now();

        self.save_intervention(intervention)?;
        Ok(())
    }

    /// Get intervention by ID
    pub fn get_intervention(&self, id: &str) -> InterventionResult<Option<Intervention>> {
        self.repository.get_intervention(id)
    }

    /// Get active intervention by task ID
    pub fn get_active_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        self.repository.get_active_intervention_by_task(task_id)
    }

    /// Get latest intervention by task ID (any status)
    pub fn get_latest_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        self.repository.get_latest_intervention_by_task(task_id)
    }

    /// Get step by ID
    pub fn get_step(&self, id: &str) -> InterventionResult<Option<InterventionStep>> {
        self.repository.get_step(id)
    }

    /// Get step by intervention ID and step number
    pub fn get_step_by_number(
        &self,
        intervention_id: &str,
        step_number: i32,
    ) -> InterventionResult<Option<InterventionStep>> {
        self.repository
            .get_step_by_number(intervention_id, step_number)
    }

    /// Get all steps for an intervention
    pub fn get_intervention_steps(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionStep>> {
        self.repository.get_intervention_steps(intervention_id)
    }

    /// Get next step in workflow
    pub fn get_next_step(
        &self,
        intervention: &Intervention,
        current_step_number: i32,
    ) -> InterventionResult<Option<InterventionStep>> {
        let next_step_number = current_step_number + 1;
        self.db
            .query_single_as::<InterventionStep>(
                "SELECT * FROM intervention_steps
             WHERE intervention_id = ? AND step_number = ?
             ORDER BY step_number LIMIT 1",
                params![intervention.id, next_step_number],
            )
            .map_err(InterventionError::Database)
    }

    /// Save intervention
    pub fn save_intervention(&self, intervention: &Intervention) -> InterventionResult<()> {
        self.repository.update_intervention(intervention)
    }

    /// Save intervention within a transaction
    pub fn save_intervention_with_tx(
        &self,
        tx: &Transaction,
        intervention: &Intervention,
    ) -> InterventionResult<()> {
        self.repository
            .update_intervention_with_tx(tx, intervention)
    }

    /// Save step
    pub fn save_step_with_tx(
        &self,
        tx: &Transaction,
        step: &InterventionStep,
    ) -> InterventionResult<()> {
        self.repository.save_step_with_tx(tx, step)
    }

    pub fn save_step(&self, step: &InterventionStep) -> InterventionResult<()> {
        self.repository.save_step(step)
    }

    /// Update intervention
    pub fn update_intervention(
        &self,
        intervention_id: &str,
        updates: serde_json::Value,
    ) -> InterventionResult<Intervention> {
        let mut intervention = self.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        // Apply updates
        if let Some(notes) = updates.get("notes").and_then(|v| v.as_str()) {
            intervention.notes = Some(notes.to_string());
        }
        if let Some(special_instructions) =
            updates.get("special_instructions").and_then(|v| v.as_str())
        {
            intervention.special_instructions = Some(special_instructions.to_string());
        }

        intervention.updated_at = now();
        self.save_intervention(&intervention)?;
        Ok(intervention)
    }

    /// Delete intervention
    pub fn delete_intervention(&self, intervention_id: &str) -> InterventionResult<()> {
        // Check if intervention exists
        let intervention = self.get_intervention(intervention_id)?.ok_or_else(|| {
            InterventionError::NotFound(format!("Intervention {} not found", intervention_id))
        })?;

        // Only allow deletion of pending interventions
        if intervention.status != InterventionStatus::Pending {
            return Err(InterventionError::BusinessRule(
                "Can only delete pending interventions".to_string(),
            ));
        }

        // Delete steps first
        self.db.get_connection()?.execute(
            "DELETE FROM intervention_steps WHERE intervention_id = ?",
            params![intervention_id],
        )?;

        // Delete intervention
        self.repository.delete_intervention(intervention_id)?;

        Ok(())
    }

    /// Get photos for an intervention
    pub fn get_intervention_photos(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<crate::models::photo::Photo>> {
        let photos = self.db.query_as::<crate::models::photo::Photo>(
            "SELECT * FROM photos WHERE intervention_id = ? ORDER BY step_number, captured_at",
            params![intervention_id],
        )?;
        Ok(photos)
    }

    /// Link task to intervention and set initial workflow state (transaction-based)
    pub fn link_task_to_intervention_with_tx(
        &self,
        tx: &Transaction,
        task_id: &str,
        intervention_id: &str,
        first_step_id: &str,
    ) -> InterventionResult<()> {
        // Verify task exists before updating
        let task_exists: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE id = ?",
                params![task_id],
                |row| row.get(0),
            )
            .map_err(|e| {
                InterventionError::Database(format!("Failed to verify task exists: {}", e))
            })?;

        if task_exists == 0 {
            return Err(InterventionError::NotFound(format!(
                "Task {} not found",
                task_id
            )));
        }

        // Get task number for intervention synchronization
        let task_number: Option<String> = tx
            .query_row(
                "SELECT task_number FROM tasks WHERE id = ?",
                params![task_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| {
                InterventionError::Database(format!("Failed to get task number: {}", e))
            })?;

        let result = tx.execute(
            "UPDATE tasks SET
                workflow_id = ?,
                current_workflow_step_id = ?,
                status = 'in_progress',
                started_at = ?
            WHERE id = ?",
            params![intervention_id, first_step_id, now(), task_id],
        )?;

        // Update intervention with task number for consistency
        if let Some(task_num) = task_number {
            tx.execute(
                "UPDATE interventions SET task_number = ? WHERE id = ?",
                params![task_num, intervention_id],
            )
            .map_err(|e| {
                InterventionError::Database(format!(
                    "Failed to update intervention task number: {}",
                    e
                ))
            })?;
        }

        if result == 0 {
            return Err(InterventionError::Database(format!(
                "Failed to update task {} - no rows affected",
                task_id
            )));
        }

        Ok(())
    }

    /// Link task to intervention and set initial workflow state
    pub fn link_task_to_intervention(
        &self,
        task_id: &str,
        intervention_id: &str,
        first_step_id: &str,
    ) -> InterventionResult<()> {
        // For backward compatibility, use a transaction internally
        self.db
            .with_transaction(|tx| {
                self.link_task_to_intervention_with_tx(tx, task_id, intervention_id, first_step_id)
                    .map_err(|e| e.to_string())
            })
            .map_err(InterventionError::Database)
    }

    /// Reconcile Task/Intervention state consistency
    pub fn reconcile_task_intervention_state(&self, task_id: &str) -> InterventionResult<()> {
        // Get current task state
        let workflow_id: Option<String> = self.db.query_single_value(
            "SELECT workflow_id FROM tasks WHERE id = ?",
            params![task_id],
        )?;

        let current_step_id: Option<String> = self.db.query_single_value(
            "SELECT current_workflow_step_id FROM tasks WHERE id = ?",
            params![task_id],
        )?;

        let task_status: String = self
            .db
            .query_single_value("SELECT status FROM tasks WHERE id = ?", params![task_id])?;

        // If task has workflow_id, verify intervention exists and is active
        if let Some(intervention_id) = &workflow_id {
            let intervention_count: i64 = self.db.query_single_value(
                "SELECT COUNT(*) FROM interventions WHERE id = ? AND status IN ('pending', 'in_progress', 'paused')",
                params![intervention_id],
            )?;

            if intervention_count == 0 {
                // Intervention doesn't exist or is not active, clean up task references
                warn!(
                    "Intervention {} not found or not active, cleaning up task {} references",
                    intervention_id, task_id
                );
                self.db.get_connection()?.execute(
                    "UPDATE tasks SET workflow_id = NULL, current_workflow_step_id = NULL, status = 'draft' WHERE id = ?",
                    params![task_id],
                )?;
                return Ok(());
            }

            // Verify current step exists and belongs to the intervention
            if let Some(step_id) = &current_step_id {
                let step_count: i64 = self.db.query_single_value(
                    "SELECT COUNT(*) FROM intervention_steps WHERE id = ? AND intervention_id = ?",
                    params![step_id, intervention_id],
                )?;

                if step_count == 0 {
                    warn!(
                        "Current step {} invalid for task {}, clearing reference",
                        step_id, task_id
                    );
                    self.db.get_connection()?.execute(
                        "UPDATE tasks SET current_workflow_step_id = NULL WHERE id = ?",
                        params![task_id],
                    )?;
                }
            }

            // Sync task status with intervention status
            let intervention_status: Option<String> = self.db.query_single_value(
                "SELECT status FROM interventions WHERE id = ?",
                params![intervention_id],
            )?;

            if let Some(int_status) = intervention_status {
                let expected_task_status = match int_status.as_str() {
                    "completed" => "completed",
                    "cancelled" => "cancelled",
                    "paused" => "paused",
                    _ => "in_progress",
                };

                if task_status != expected_task_status {
                    self.db.get_connection()?.execute(
                        "UPDATE tasks SET status = ? WHERE id = ?",
                        params![expected_task_status, task_id],
                    )?;
                }
            }
        } else {
            // Task has no workflow_id but might have orphaned step reference
            if current_step_id.is_some() {
                warn!("Task {} has current_workflow_step_id but no workflow_id, clearing step reference", task_id);
                self.db.get_connection()?.execute(
                    "UPDATE tasks SET current_workflow_step_id = NULL WHERE id = ?",
                    params![task_id],
                )?;
            }
        }
        Ok(())
    }

    /// Get PPF workflow steps configuration
    pub fn list_interventions(
        &self,
        status: Option<&str>,
        technician_id: Option<&str>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> InterventionResult<(Vec<Intervention>, i64)> {
        self.repository
            .list_interventions(status, technician_id, limit, offset)
    }

    /// Get legacy PPF workflow steps configuration
    /// NOTE: This method is deprecated. Use WorkflowStrategyFactory instead
    /// which provides flexible workflow strategies based on intervention type.
    pub fn get_ppf_workflow_steps(&self) -> Vec<(String, StepType)> {
        vec![
            ("Inspection".to_string(), StepType::Inspection),
            ("Préparation".to_string(), StepType::Preparation),
            ("Installation".to_string(), StepType::Installation),
            ("Finalisation".to_string(), StepType::Finalization),
        ]
    }
}
