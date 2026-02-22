//! Task Update Service
//!
//! Extracted from TaskCrudService to handle task update operations.

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::domain::models::task::{Task, UpdateTaskRequest};
use crate::domains::tasks::infrastructure::task_constants::{
    MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, MAX_VEHICLE_YEAR, MIN_VEHICLE_YEAR,
    SINGLE_TASK_TIMEOUT_SECS, TASK_QUERY_COLUMNS,
};
use crate::domains::tasks::infrastructure::task_validation::{
    validate_status_transition, TaskValidationService,
};
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
        let timeout_duration = std::time::Duration::from_secs(SINGLE_TASK_TIMEOUT_SECS);

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

    /// Check if user owns the task
    fn check_task_ownership(&self, task: &Task, user_id: &str) -> Result<(), AppError> {
        if task.created_by.as_ref() != Some(&user_id.to_string()) {
            return Err(AppError::Authorization(
                "You can only update tasks you created".to_string(),
            ));
        }
        Ok(())
    }

    /// Apply title updates with validation
    fn apply_title_updates(task: &mut Task, req: &UpdateTaskRequest) -> Result<(), AppError> {
        if let Some(title) = &req.title {
            if title.trim().is_empty() {
                return Err(AppError::Validation("Title cannot be empty".to_string()));
            }
            if title.len() > MAX_TITLE_LENGTH {
                return Err(AppError::Validation(format!(
                    "Title must be {} characters or less",
                    MAX_TITLE_LENGTH
                )));
            }
            task.title = title.clone();
        }
        Ok(())
    }

    /// Apply description updates with validation
    fn apply_description_updates(task: &mut Task, req: &UpdateTaskRequest) -> Result<(), AppError> {
        if let Some(description) = &req.description {
            if description.len() > MAX_DESCRIPTION_LENGTH {
                return Err(AppError::Validation(format!(
                    "Description must be {} characters or less",
                    MAX_DESCRIPTION_LENGTH
                )));
            }
            task.description = req.description.clone();
        }
        Ok(())
    }

    /// Apply priority updates
    fn apply_priority_updates(task: &mut Task, req: &UpdateTaskRequest) {
        if let Some(priority) = &req.priority {
            task.priority = priority.clone();
        }
    }

    /// Apply status updates with timestamp management
    fn apply_status_updates(
        _service: &TaskUpdateService,
        task: &mut Task,
        req: &UpdateTaskRequest,
    ) -> Result<(), AppError> {
        if let Some(new_status) = &req.status {
            let old_status = task.status.clone();

            if let Err(e) = validate_status_transition(&old_status, new_status) {
                return Err(AppError::Validation(format!(
                    "Invalid status transition from '{}' to '{}': {}",
                    old_status, new_status, e
                )));
            }

            task.status = new_status.clone();

            match (&old_status, new_status) {
                (
                    crate::domains::tasks::domain::models::task::TaskStatus::Pending
                    | crate::domains::tasks::domain::models::task::TaskStatus::Scheduled
                    | crate::domains::tasks::domain::models::task::TaskStatus::Assigned,
                    crate::domains::tasks::domain::models::task::TaskStatus::InProgress,
                ) => {
                    if task.started_at.is_none() {
                        task.started_at = Some(Utc::now().timestamp_millis());
                    }
                }
                (_, crate::domains::tasks::domain::models::task::TaskStatus::Completed) => {
                    if task.completed_at.is_none() {
                        task.completed_at = Some(Utc::now().timestamp_millis());
                    }
                }
                (crate::domains::tasks::domain::models::task::TaskStatus::Completed, _) => {
                    task.completed_at = None;
                }
                _ => {}
            }
        }
        Ok(())
    }

    /// Apply vehicle information updates with validation
    fn apply_vehicle_updates(task: &mut Task, req: &UpdateTaskRequest) -> Result<(), AppError> {
        if let Some(vehicle_plate) = &req.vehicle_plate {
            task.vehicle_plate = Some(vehicle_plate.clone());
        }

        if let Some(vehicle_model) = &req.vehicle_model {
            task.vehicle_model = Some(vehicle_model.clone());
        }

        if let Some(vehicle_year_str) = &req.vehicle_year {
            if let Ok(vehicle_year) = vehicle_year_str.parse::<i32>() {
                if !(MIN_VEHICLE_YEAR..=MAX_VEHICLE_YEAR).contains(&vehicle_year) {
                    return Err(AppError::Validation(format!(
                        "Vehicle year must be between {} and {}",
                        MIN_VEHICLE_YEAR, MAX_VEHICLE_YEAR
                    )));
                }
            } else {
                return Err(AppError::Validation(
                    "Vehicle year must be a valid number".to_string(),
                ));
            }
            task.vehicle_year = req.vehicle_year.clone();
        }

        if let Some(_vehicle_make) = &req.vehicle_make {
            task.vehicle_make = req.vehicle_make.clone();
        }

        if let Some(_vin) = &req.vin {
            task.vin = req.vin.clone();
        }

        Ok(())
    }

    /// Apply client updates with existence validation
    fn apply_client_updates(
        service: &TaskUpdateService,
        task: &mut Task,
        req: &UpdateTaskRequest,
    ) -> Result<(), AppError> {
        if let Some(new_client_id) = &req.client_id {
            let exists: i64 = service
                .db
                .query_single_value(
                    "SELECT COUNT(*) FROM clients WHERE id = ? AND deleted_at IS NULL",
                    params![new_client_id],
                )
                .map_err(|e| {
                    AppError::Database(format!("Failed to check client existence: {}", e))
                })?;

            if exists == 0 {
                return Err(AppError::Validation(format!(
                    "Client with ID {} does not exist",
                    new_client_id
                )));
            }

            if let Some(old_client_id) = &task.client_id {
                if old_client_id != new_client_id {
                    warn!(
                        "Moving task {} from client {} to {}",
                        task.id, old_client_id, new_client_id
                    );
                }
            }
            task.client_id = Some(new_client_id.clone());
        }
        Ok(())
    }

    /// Apply technician assignment updates with validation
    fn apply_technician_updates(
        service: &TaskUpdateService,
        task: &mut Task,
        req: &UpdateTaskRequest,
        user_id: &str,
    ) -> Result<(), AppError> {
        if let Some(technician_id) = &req.technician_id {
            // Check for assignment conflict: task already assigned to a different technician
            if let Some(existing_tech) = &task.technician_id {
                if existing_tech != technician_id && !existing_tech.is_empty() {
                    return Err(AppError::TaskAssignmentConflict(format!(
                        "Task is already assigned to technician '{}'. Unassign first or use reassignment.",
                        existing_tech
                    )));
                }
            }

            let validation_service = TaskValidationService::new(service.db.clone());
            validation_service
                .validate_technician_assignment(technician_id, &task.ppf_zones)
                .map_err(|e| {
                    AppError::Validation(format!("Technician validation failed: {}", e))
                })?;

            task.technician_id = Some(technician_id.clone());
            task.assigned_at = Some(Utc::now().timestamp_millis());
            task.assigned_by = Some(user_id.to_string());
        }
        Ok(())
    }

    /// Apply simple field updates (scheduling, notes, tags, etc.)
    fn apply_simple_updates(task: &mut Task, req: &UpdateTaskRequest) {
        if let Some(_scheduled_date) = &req.scheduled_date {
            task.scheduled_date = req.scheduled_date.clone();
        }

        if let Some(_estimated_duration) = req.estimated_duration {
            task.estimated_duration = req.estimated_duration;
        }

        if let Some(_notes) = &req.notes {
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
    }

    /// Save the updated task to the database
    fn save_task_to_database(&self, task: &Task) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;

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
                status = ?, priority = ?, technician_id = ?, assigned_at = ?, assigned_by = ?,
                scheduled_date = ?, start_time = ?, end_time = ?,
                date_rdv = ?, heure_rdv = ?, template_id = ?, workflow_id = ?,
                workflow_status = ?, current_workflow_step_id = ?,
                started_at = ?, completed_at = ?, completed_steps = ?,
                client_id = ?, customer_name = ?, customer_email = ?, customer_phone = ?,
                customer_address = ?, external_id = ?, lot_film = ?, checklist_completed = ?,
                notes = ?, tags = ?, estimated_duration = ?, actual_duration = ?, updated_at = ?
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
                task.technician_id,
                task.assigned_at,
                task.assigned_by,
                task.scheduled_date,
                task.start_time,
                task.end_time,
                task.date_rdv,
                task.heure_rdv,
                task.template_id,
                task.workflow_id,
                task.workflow_status,
                task.current_workflow_step_id,
                task.started_at,
                task.completed_at,
                task.completed_steps,
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
                task.actual_duration,
                task.updated_at,
                task.id
            ],
        )
        .map_err(|e| {
            error!(
                "TaskUpdateService: failed to update task {}: {}",
                task.id, e
            );
            format!("Failed to update task: {}", e)
        })?;

        Ok(())
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

        let mut task = self
            .get_task_sync(task_id)?
            .ok_or_else(|| format!("Task with id {} not found", task_id))?;

        self.check_task_ownership(&task, user_id)?;
        Self::apply_title_updates(&mut task, &req)?;
        Self::apply_description_updates(&mut task, &req)?;
        Self::apply_priority_updates(&mut task, &req);
        Self::apply_status_updates(self, &mut task, &req)?;
        Self::apply_vehicle_updates(&mut task, &req)?;
        Self::apply_client_updates(self, &mut task, &req)?;
        Self::apply_technician_updates(self, &mut task, &req, user_id)?;
        Self::apply_simple_updates(&mut task, &req);

        task.updated_at = Utc::now().timestamp_millis();
        self.save_task_to_database(&task)?;

        Ok(task)
    }

    /// Get a single task by ID (sync version)
    pub fn get_task_sync(&self, id: &str) -> Result<Option<Task>, AppError> {
        let sql = format!(
            r#"
            SELECT{}
            FROM tasks WHERE id = ? AND deleted_at IS NULL
        "#,
            TASK_QUERY_COLUMNS
        );

        self.db
            .query_single_as::<Task>(&sql, params![id])
            .map_err(|e| AppError::Database(format!("Failed to get task: {}", e)))
    }
}
