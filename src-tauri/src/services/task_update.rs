//! Task Update Service
//!
//! Extracted from TaskCrudService to handle task update operations.

use crate::commands::AppError;
use crate::db::Database;
use crate::models::task::{UpdateTaskRequest, Task};
use crate::services::task_validation::TaskValidationService;
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;
use tokio::time::timeout;
use tracing::{error, warn};

/// Service for handling task update operations
#[derive(Debug)]
pub struct TaskUpdateService {
    db: Arc<Database>,
}

impl TaskUpdateService {
    /// Create a new TaskUpdateService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Update an existing task (async version)
    pub async fn update_task_async(
        &self,
        req: UpdateTaskRequest,
        user_id: &str,
    ) -> Result<Task, AppError> {
        // Ensure id is present
        let _id = req
            .id
            .as_ref()
            .ok_or_else(|| "Task ID is required for update".to_string())?;

        let db = self.db.clone();

        // Add timeout to prevent hanging
        let timeout_duration = std::time::Duration::from_secs(5);

        let user_id = user_id.to_string();
        let result = timeout(
            timeout_duration,
            tokio::task::spawn_blocking(move || {
                let service = TaskUpdateService::new(db);
                service.update_task_sync(req, &user_id)
            }),
        )
        .await;

        match result {
            Ok(Ok(task)) => Ok(task?),
            Ok(Err(e)) => Err(AppError::Database(format!("Task update failed: {}", e))),
            Err(_timeout) => {
                error!("Task update timeout - database may be locked");

                // Try to checkpoint WAL
                let _ = crate::db::checkpoint_wal(self.db.pool());

                Err(AppError::Database(
                    "Task update timeout - database may be locked".to_string(),
                ))
            }
        }
    }

    /// Update an existing task (sync version)
    pub fn update_task_sync(
        &self,
        req: UpdateTaskRequest,
        user_id: &str,
    ) -> Result<Task, AppError> {
        let task_id = req
            .id
            .as_ref()
            .ok_or_else(|| AppError::Validation("Task ID is required for update".to_string()))?;

        // Get existing task
        let mut task = self
            .get_task_sync(task_id)?
            .ok_or_else(|| format!("Task with id {} not found", task_id))?;

        // Check ownership
        if task.created_by.as_ref() != Some(&user_id.to_string()) {
            return Err(AppError::Authorization(
                "You can only update tasks you created".to_string(),
            ));
        }

        // Apply updates
        if let Some(title) = &req.title {
            if title.trim().is_empty() {
                return Err(AppError::Validation("Title cannot be empty".to_string()));
            }
            if title.len() > 100 {
                return Err(AppError::Validation(
                    "Title must be 100 characters or less".to_string(),
                ));
            }
            task.title = title.clone();
        }

        if let Some(description) = &req.description {
            if description.len() > 1000 {
                return Err(AppError::Validation(
                    "Description must be 1000 characters or less".to_string(),
                ));
            }
            task.description = req.description.clone();
        }

        if let Some(priority) = &req.priority {
            task.priority = priority.clone();
        }

        if let Some(new_status) = &req.status {
            let old_status = task.status.clone();
            
            if let Err(e) = self.validate_status_transition(&old_status, new_status) {
                return Err(AppError::Validation(format!(
                    "Invalid status transition from {:?} to {:?}: {}", old_status, new_status, e
                )));
            }
            
            task.status = new_status.clone();
            
            match (&old_status, new_status) {
                (crate::models::task::TaskStatus::Pending | crate::models::task::TaskStatus::Scheduled | crate::models::task::TaskStatus::Assigned, crate::models::task::TaskStatus::InProgress) => {
                    if task.started_at.is_none() {
                        task.started_at = Some(Utc::now().timestamp_millis());
                    }
                }
                (_, crate::models::task::TaskStatus::Completed) => {
                    if task.completed_at.is_none() {
                        task.completed_at = Some(Utc::now().timestamp_millis());
                    }
                }
                (crate::models::task::TaskStatus::Completed, _) => {
                    task.completed_at = None;
                }
                _ => {}
            }
        }

        if let Some(vehicle_plate) = &req.vehicle_plate {
            task.vehicle_plate = Some(vehicle_plate.clone());
        }

        if let Some(vehicle_model) = &req.vehicle_model {
            task.vehicle_model = Some(vehicle_model.clone());
        }

        if let Some(vehicle_year_str) = &req.vehicle_year {
            if let Ok(vehicle_year) = vehicle_year_str.parse::<i32>() {
                if !(1900..=2100).contains(&vehicle_year) {
                    return Err(AppError::Validation(
                        "Vehicle year must be between 1900 and 2100".to_string(),
                    ));
                }
            } else {
                return Err(AppError::Validation(
                    "Vehicle year must be a valid number".to_string(),
                ));
            }
            task.vehicle_year = req.vehicle_year.clone();
        }

        if let Some(vehicle_make) = &req.vehicle_make {
            task.vehicle_make = req.vehicle_make.clone();
        }

        if let Some(vin) = &req.vin {
            task.vin = req.vin.clone();
        }

        if let Some(new_client_id) = &req.client_id {
            let exists: i64 = self.db.query_single_value(
                "SELECT COUNT(*) FROM clients WHERE id = ? AND deleted_at IS NULL",
                params![new_client_id],
            )
            .map_err(|e| AppError::Database(format!("Failed to check client existence: {}", e)))?;
            
            if exists == 0 {
                return Err(AppError::Validation(format!(
                    "Client with ID {} does not exist", new_client_id
                )));
            }
            
            if let Some(old_client_id) = &task.client_id {
                if old_client_id != new_client_id {
                    warn!("Moving task {} from client {} to {}", task.id, old_client_id, new_client_id);
                }
            }
            task.client_id = Some(new_client_id.clone());
        }

        if let Some(scheduled_date) = &req.scheduled_date {
            task.scheduled_date = req.scheduled_date.clone();
        }

        if let Some(estimated_duration) = req.estimated_duration {
            task.estimated_duration = req.estimated_duration;
        }

        if let Some(notes) = &req.notes {
            task.notes = req.notes.clone();
        }

        if let Some(tags) = &req.tags {
            task.tags = Some(tags.clone());
        }

        if let Some(ppf_zones) = &req.ppf_zones {
            task.ppf_zones = Some(ppf_zones.clone());
        }

        if let Some(custom_ppf_zones) = &req.custom_ppf_zones {
            task.custom_ppf_zones = Some(custom_ppf_zones.clone());
        }

        if let Some(customer_name) = &req.customer_name {
            task.customer_name = Some(customer_name.clone());
        }

        if let Some(customer_email) = &req.customer_email {
            task.customer_email = Some(customer_email.clone());
        }

        if let Some(customer_phone) = &req.customer_phone {
            task.customer_phone = Some(customer_phone.clone());
        }

        if let Some(customer_address) = &req.customer_address {
            task.customer_address = Some(customer_address.clone());
        }

        if let Some(external_id) = &req.external_id {
            task.external_id = Some(external_id.clone());
        }

        if let Some(lot_film) = &req.lot_film {
            task.lot_film = Some(lot_film.clone());
        }

        if let Some(technician_id) = &req.technician_id {
            // Validate technician assignment
            let validation_service = TaskValidationService::new(self.db.clone());
            validation_service
                .validate_technician_assignment(technician_id, &task.ppf_zones)
                .map_err(|e| AppError::Validation(format!("Technician validation failed: {}", e)))?;
            
            task.technician_id = Some(technician_id.clone());
        }

        if let Some(checklist_completed) = req.checklist_completed {
            task.checklist_completed = checklist_completed;
        }

        if let Some(start_time) = &req.start_time {
            task.start_time = Some(start_time.clone());
        }

        if let Some(end_time) = &req.end_time {
            task.end_time = Some(end_time.clone());
        }

        if let Some(date_rdv) = &req.date_rdv {
            task.date_rdv = Some(date_rdv.clone());
        }

        if let Some(heure_rdv) = &req.heure_rdv {
            task.heure_rdv = Some(heure_rdv.clone());
        }

        if let Some(template_id) = &req.template_id {
            task.template_id = Some(template_id.clone());
        }

        if let Some(workflow_id) = &req.workflow_id {
            task.workflow_id = Some(workflow_id.clone());
        }

        // Update timestamp
        task.updated_at = Utc::now().timestamp_millis();

        // Update in database
        let conn = self.db.get_connection()?;

        // Convert enums to strings
        let status_str = task.status.to_string();
        let priority_str = task.priority.to_string();

        let ppf_zones_json = serde_json::to_string(&task.ppf_zones.as_ref().unwrap_or(&vec![]))
            .unwrap_or_else(|_| "[]".to_string());
        let custom_ppf_zones_json =
            serde_json::to_string(&task.custom_ppf_zones.as_ref().unwrap_or(&vec![]))
                .unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            r#"
            UPDATE tasks SET
                title = ?, description = ?, vehicle_plate = ?, vehicle_model = ?,
                vehicle_year = ?, vehicle_make = ?, vin = ?, ppf_zones = ?, custom_ppf_zones = ?,
                status = ?, priority = ?, scheduled_date = ?, start_time = ?, end_time = ?,
                date_rdv = ?, heure_rdv = ?, template_id = ?, workflow_id = ?,
                client_id = ?, customer_name = ?, customer_email = ?, customer_phone = ?,
                customer_address = ?, external_id = ?, lot_film = ?, checklist_completed = ?,
                notes = ?, tags = ?, estimated_duration = ?, updated_at = ?
            WHERE id = ?
            "#,
            params![
                task.title,
                task.description,
                task.vehicle_plate,
                task.vehicle_model,
                task.vehicle_year,
                task.vehicle_make,
                task.vin,
                ppf_zones_json,
                custom_ppf_zones_json,
                status_str,
                priority_str,
                task.scheduled_date,
                task.start_time,
                task.end_time,
                task.date_rdv,
                task.heure_rdv,
                task.template_id,
                task.workflow_id,
                task.client_id,
                task.customer_name,
                task.customer_email,
                task.customer_phone,
                task.customer_address,
                task.external_id,
                task.lot_film,
                task.checklist_completed,
                task.notes,
                task.tags,
                task.estimated_duration,
                task.updated_at,
                task.id
            ],
        )
        .map_err(|e| {
            error!("TaskUpdateService: failed to update task {}: {}", task.id, e);
            format!("Failed to update task: {}", e)
        })?;

        Ok(task)
    }

    /// Get a single task by ID (sync version)
    pub fn get_task_sync(&self, id: &str) -> Result<Option<Task>, AppError> {
        let sql = r#"
            SELECT
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
                assigned_at, assigned_by, scheduled_date, start_time, end_time,
                date_rdv, heure_rdv, template_id, workflow_id, workflow_status,
                current_workflow_step_id, started_at, completed_at, completed_steps,
                client_id, customer_name, customer_email, customer_phone, customer_address,
                external_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration,
                created_at, updated_at, creator_id, created_by, updated_by, deleted_at, deleted_by, synced, last_synced_at
            FROM tasks WHERE id = ? AND deleted_at IS NULL
        "#;

        self.db
            .query_single_as::<Task>(sql, params![id])
            .map_err(|e| AppError::Database(format!("Failed to get task: {}", e)))
    }

    /// Validate status transition
    ///
    /// Ensures that status changes follow business rules and prevent invalid state transitions.
    ///
    /// # Arguments
    /// * `current` - The current status of the task
    /// * `new` - The new status being requested
    ///
    /// # Returns
    /// * `Ok(())` - Transition is valid
    /// * `Err(String)` - Transition is invalid with reason
    fn validate_status_transition(
        &self,
        current: &crate::models::task::TaskStatus,
        new: &crate::models::task::TaskStatus,
    ) -> Result<(), String> {
        use crate::models::task::TaskStatus;

        match (current, new) {
            // Valid transitions
            (TaskStatus::Draft, TaskStatus::Pending) => Ok(()),
            (TaskStatus::Draft, TaskStatus::Scheduled) => Ok(()),
            (TaskStatus::Draft, TaskStatus::Cancelled) => Ok(()),
            
            (TaskStatus::Pending, TaskStatus::InProgress) => Ok(()),
            (TaskStatus::Pending, TaskStatus::Scheduled) => Ok(()),
            (TaskStatus::Pending, TaskStatus::Cancelled) => Ok(()),
            (TaskStatus::Pending, TaskStatus::OnHold) => Ok(()),
            (TaskStatus::Pending, TaskStatus::Assigned) => Ok(()),
            
            (TaskStatus::Scheduled, TaskStatus::InProgress) => Ok(()),
            (TaskStatus::Scheduled, TaskStatus::OnHold) => Ok(()),
            (TaskStatus::Scheduled, TaskStatus::Cancelled) => Ok(()),
            (TaskStatus::Scheduled, TaskStatus::Assigned) => Ok(()),
            
            (TaskStatus::Assigned, TaskStatus::InProgress) => Ok(()),
            (TaskStatus::Assigned, TaskStatus::OnHold) => Ok(()),
            (TaskStatus::Assigned, TaskStatus::Cancelled) => Ok(()),
            
            (TaskStatus::InProgress, TaskStatus::Completed) => Ok(()),
            (TaskStatus::InProgress, TaskStatus::OnHold) => Ok(()),
            (TaskStatus::InProgress, TaskStatus::Paused) => Ok(()),
            (TaskStatus::InProgress, TaskStatus::Cancelled) => Ok(()),
            
            (TaskStatus::Paused, TaskStatus::InProgress) => Ok(()),
            (TaskStatus::Paused, TaskStatus::Cancelled) => Ok(()),
            
            (TaskStatus::OnHold, TaskStatus::Pending) => Ok(()),
            (TaskStatus::OnHold, TaskStatus::Scheduled) => Ok(()),
            (TaskStatus::OnHold, TaskStatus::InProgress) => Ok(()),
            (TaskStatus::OnHold, TaskStatus::Cancelled) => Ok(()),
            
            (TaskStatus::Completed, TaskStatus::Archived) => Ok(()),
            
            // Invalid transitions
            (TaskStatus::Completed, TaskStatus::Pending) => Err("Cannot move completed task back to pending".to_string()),
            (TaskStatus::Completed, TaskStatus::InProgress) => Err("Cannot move completed task back to in progress".to_string()),
            (TaskStatus::Completed, TaskStatus::Scheduled) => Err("Cannot move completed task back to scheduled".to_string()),
            
            (TaskStatus::Cancelled, TaskStatus::Pending) => Err("Cannot move cancelled task back to pending".to_string()),
            (TaskStatus::Cancelled, TaskStatus::InProgress) => Err("Cannot move cancelled task back to in progress".to_string()),
            (TaskStatus::Cancelled, TaskStatus::Scheduled) => Err("Cannot move cancelled task back to scheduled".to_string()),
            
            (TaskStatus::Archived, TaskStatus::Pending) => Err("Cannot move archived task back to pending".to_string()),
            (TaskStatus::Archived, TaskStatus::InProgress) => Err("Cannot move archived task back to in progress".to_string()),
            
            _ => Err(format!("Invalid status transition from {:?} to {:?}", current, new)),
        }
    }
}