//! Task CRUD operations module
//!
//! This module handles core Create, Read, Update, Delete operations for tasks.

use crate::commands::AppError;
use crate::db::{checkpoint_wal, AsyncDatabase, Database};
use crate::models::task::*;
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;
use tokio::time::timeout;
use tracing::{error, warn};
use uuid::Uuid;

/// Core CRUD operations for tasks
#[derive(Debug)]
pub struct TaskCrudService {
    pub(crate) db: Arc<Database>,
    async_db: Arc<AsyncDatabase>,
}

/// Temporary service for sync operations within async context
pub struct SyncTaskCrudService<'a> {
    conn: &'a rusqlite::Connection,
}

impl TaskCrudService {
    /// Create a new TaskCrudService instance
    pub fn new(db: Arc<Database>) -> Self {
        let async_db = Arc::new(db.as_async());
        Self { db, async_db }
    }

    /// Create a new task (async version)
    pub async fn create_task_async(
        &self,
        req: CreateTaskRequest,
        user_id: &str,
    ) -> Result<Task, AppError> {
        let req = req.clone();
        let user_id = user_id.to_string();

        // Use AsyncDatabase wrapper for non-blocking operations
        self.async_db
            .execute_async(move |conn| {
                let sync_service = SyncTaskCrudService { conn };
                sync_service
                    .create_task_sync(req, &user_id)
                    .map_err(|e| e.to_string())
            })
            .await
            .map_err(|e| {
                error!("TaskCrudService: task creation failed: {:?}", e);
                AppError::Database(e)
            })
    }

    /// Create a new task (sync version for internal use)
    #[allow(dead_code)]
    fn create_task_sync(&self, req: CreateTaskRequest, user_id: &str) -> Result<Task, AppError> {
        // Validate request
        self.validate_create_request(&req)?;

        // Generate unique task number if not provided
        let task_number = req.task_number.clone().unwrap_or_else(|| {
            self.generate_task_number().unwrap_or_else(|e| {
                error!("Failed to generate task number: {}, using fallback", e);
                format!("TASK-{}", Uuid::new_v4())
            })
        });

        // Create task instance
        let now = Utc::now();
        let now_millis = now.timestamp_millis();
        let task = Task {
            id: Uuid::new_v4().to_string(),
            task_number: task_number.clone(),
            title: req
                .title
                .clone()
                .filter(|t| !t.trim().is_empty() && t != "Nouvelle tâche")
                .unwrap_or_else(|| {
                    // Generate meaningful title based on available data
                    if let Some(make) = &req.vehicle_make {
                        format!("{} {} ({})", make, req.vehicle_model, req.vehicle_plate)
                    } else {
                        format!("{} ({})", req.vehicle_model, req.vehicle_plate)
                    }
                }),
            description: req.description.clone(),
            vehicle_plate: Some(req.vehicle_plate.clone()),
            vehicle_model: Some(req.vehicle_model.clone()),
            vehicle_year: req.vehicle_year.clone(),
            vehicle_make: req.vehicle_make.clone(),
            vin: req.vin.clone(),
            ppf_zones: Some(req.ppf_zones.clone()),
            custom_ppf_zones: req.custom_ppf_zones.clone(),
            status: req.status.unwrap_or(TaskStatus::Pending),
            priority: req.priority.unwrap_or(TaskPriority::Medium),
            technician_id: req.technician_id.clone(),
            assigned_at: None,
            assigned_by: None,
            scheduled_date: Some(req.scheduled_date.clone()),
            start_time: req.start_time.clone(),
            end_time: req.end_time.clone(),
            date_rdv: req.date_rdv.clone(),
            heure_rdv: req.heure_rdv.clone(),
            template_id: req.template_id.clone(),
            workflow_id: req.workflow_id.clone(),
            workflow_status: None,
            current_workflow_step_id: None,
            started_at: None,
            completed_at: None,
            completed_steps: None,
            client_id: req.client_id.clone(),
            customer_name: req.customer_name.clone(),
            customer_email: req.customer_email.clone(),
            customer_phone: req.customer_phone.clone(),
            customer_address: req.customer_address.clone(),
            external_id: req.external_id.clone(),
            lot_film: req.lot_film.clone(),
            checklist_completed: req.checklist_completed.unwrap_or(false),
            notes: req.notes.clone(),
            tags: req.tags.clone(),
            estimated_duration: req.estimated_duration,
            actual_duration: None,
            created_at: now_millis,
            updated_at: now_millis,
            creator_id: Some(user_id.to_string()),
            created_by: Some(user_id.to_string()),
            updated_by: Some(user_id.to_string()),
            deleted_at: None,
            deleted_by: None,
            synced: false,
            last_synced_at: None,
        };

        // Insert into database
        let _conn = self.db.get_connection()?;

        // Check if client exists if client_id is provided
        if let Some(client_id) = &task.client_id {
            let client_exists: i64 = self.db.query_single_value(
                "SELECT COUNT(*) FROM clients WHERE id = ?",
                params![client_id],
            )?;
            if client_exists == 0 {
                error!(
                    "Client {} does not exist, this will cause foreign key constraint failure",
                    client_id
                );
                return Err(AppError::Validation(format!(
                    "Client with ID {} does not exist",
                    client_id
                )));
            }
        }

        // Check if task_number is unique
        let task_exists: i64 = self.db.query_single_value(
            "SELECT COUNT(*) FROM tasks WHERE task_number = ?",
            params![&task.task_number],
        )?;
        if task_exists > 0 {
            error!("Task number {} already exists", task.task_number);
            return Err(AppError::Validation(format!(
                "Task number {} already exists",
                task.task_number
            )));
        }

        // Convert enums to strings using Display implementation
        let status_str = task.status.to_string();
        let priority_str = task.priority.to_string();

        let ppf_zones_json = serde_json::to_string(&task.ppf_zones.as_ref().unwrap_or(&vec![]))
            .unwrap_or_else(|e| {
                warn!("Failed to serialize PPF zones: {}", e);
                "[]".to_string()
            });
        let custom_ppf_zones_json =
            serde_json::to_string(&task.custom_ppf_zones.as_ref().unwrap_or(&vec![]))
                .unwrap_or_else(|e| {
                    warn!("Failed to serialize custom PPF zones: {}", e);
                    "[]".to_string()
                });
        let conn = self.db.get_connection()?;

        let _ = conn.execute(
            r#"
            INSERT INTO tasks (id, task_number, title, description, vehicle_plate, vehicle_model, vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id, assigned_at, assigned_by, scheduled_date, start_time, end_time, date_rdv, heure_rdv, template_id, workflow_id, workflow_status, current_workflow_step_id, started_at, completed_at, completed_steps, client_id, customer_name, customer_email, customer_phone, customer_address, external_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration, created_at, updated_at, creator_id, created_by, updated_by, deleted_at, deleted_by, synced, last_synced_at) VALUES (:id, :task_number, :title, :description, :vehicle_plate, :vehicle_model, :vehicle_year, :vehicle_make, :vin, :ppf_zones, :custom_ppf_zones, :status, :priority, :technician_id, :assigned_at, :assigned_by, :scheduled_date, :start_time, :end_time, :date_rdv, :heure_rdv, :template_id, :workflow_id, :workflow_status, :current_workflow_step_id, :started_at, :completed_at, :completed_steps, :client_id, :customer_name, :customer_email, :customer_phone, :customer_address, :external_id, :lot_film, :checklist_completed, :notes, :tags, :estimated_duration, :actual_duration, :created_at, :updated_at, :creator_id, :created_by, :updated_by, :deleted_at, :deleted_by, :synced, :last_synced_at)
            "#,
            params![
                task.id,
                task.task_number,
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
                task.created_at,
                task.updated_at,
                task.creator_id,
                task.created_by,
                task.updated_by,
                task.deleted_at,
                task.deleted_by,
                task.synced,
                task.last_synced_at,
            ],
        );

        // Add entry to sync queue after successful task creation
        let _ = conn.execute(
            "INSERT INTO sync_queue (operation_type, entity_type, entity_id, data, status, priority)
             VALUES ('create', 'task', ?, ?, 'pending', 5)",
            params![
                task.id,
                serde_json::to_string(&task).unwrap_or_else(|e| {
                    error!("Failed to serialize task for sync queue: {}", e);
                    "{}".to_string()
                })
            ]
        ).map_err(|e| {
            error!("Failed to add task to sync queue: {}", e);
            // Don't fail the task creation if sync queue fails
            e
        });

        Ok(task)
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
                let service = TaskCrudService::new(db);
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
                let _ = checkpoint_wal(self.db.pool());

                Err(AppError::Database(
                    "Task update timeout - database may be locked".to_string(),
                ))
            }
        }
    }

    /// Update an existing task (sync version for internal use)
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

        if let Some(status) = &req.status {
            task.status = status.clone();
        }

        if let Some(_vehicle_plate) = &req.vehicle_plate {
            task.vehicle_plate = req.vehicle_plate.clone();
        }

        if let Some(_vehicle_model) = &req.vehicle_model {
            task.vehicle_model = req.vehicle_model.clone();
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

        if let Some(_vehicle_make) = &req.vehicle_make {
            task.vehicle_make = req.vehicle_make.clone();
        }

        if let Some(_vin) = &req.vin {
            task.vin = req.vin.clone();
        }

        if let Some(_client_id) = &req.client_id {
            task.client_id = req.client_id.clone();
        }

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

        if let Some(technician_id) = &req.technician_id {
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

        // Convert enums to strings using Display implementation
        let status_str = task.status.to_string();
        let priority_str = task.priority.to_string();

        let ppf_zones_json = serde_json::to_string(&task.ppf_zones.as_ref().unwrap_or(&vec![]))
            .unwrap_or_else(|e| {
                warn!("Failed to serialize PPF zones: {}", e);
                "[]".to_string()
            });
        let custom_ppf_zones_json =
            serde_json::to_string(&task.custom_ppf_zones.as_ref().unwrap_or(&vec![]))
                .unwrap_or_else(|e| {
                    warn!("Failed to serialize custom PPF zones: {}", e);
                    "[]".to_string()
                });

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
            error!("TaskCrudService: failed to update task {}: {}", task.id, e);
            format!("Failed to update task: {}", e)
        })?;

        // Add entry to sync queue after successful task update
        let _ = conn.execute(
            "INSERT INTO sync_queue (operation_type, entity_type, entity_id, data, status, priority)
             VALUES ('update', 'task', ?, ?, 'pending', 5)",
            params![
                task.id,
                serde_json::to_string(&task).unwrap_or_else(|e| {
                    error!("Failed to serialize task for sync queue: {}", e);
                    "{}".to_string()
                })
            ]
        ).map_err(|e| {
            error!("Failed to add task update to sync queue: {}", e);
            e
        });

        Ok(task)
    }

    /// Delete a task (async version)
    pub async fn delete_task_async(&self, id: &str, user_id: &str) -> Result<(), AppError> {
        let db = self.db.clone();
        let id = id.to_string();

        // Add timeout to prevent hanging
        let timeout_duration = std::time::Duration::from_secs(5);

        let user_id = user_id.to_string();
        let result = timeout(
            timeout_duration,
            tokio::task::spawn_blocking(move || {
                let service = TaskCrudService::new(db);
                service.delete_task_sync(&id, &user_id)
            }),
        )
        .await;

        match result {
            Ok(Ok(result)) => result,
            Ok(Err(e)) => Err(AppError::Database(format!("Task deletion failed: {}", e))),
            Err(_timeout) => {
                error!("Task deletion timeout - database may be locked");

                // Try to checkpoint WAL
                let _ = checkpoint_wal(self.db.pool());

                Err(AppError::Database(
                    "Task deletion timeout - database may be locked".to_string(),
                ))
            }
        }
    }

    /// Delete a task (sync version for internal use)
    pub fn delete_task_sync(&self, id: &str, user_id: &str) -> Result<(), AppError> {
        // Check if task exists and get it for ownership check
        let task = self.get_task_sync(id)?;
        let task = match task {
            Some(t) => t,
            None => {
                warn!("TaskCrudService: task {} not found for deletion", id);
                return Err(AppError::NotFound(format!("Task with id {} not found", id)));
            }
        };

        // Check ownership
        if task.created_by.as_ref() != Some(&user_id.to_string()) {
            return Err(AppError::Authorization(
                "You can only delete tasks you created".to_string(),
            ));
        }

        // Delete from database
        let conn = self.db.get_connection()?;
        conn.execute("DELETE FROM tasks WHERE id = ?", params![id])
            .map_err(|e| {
                error!("TaskCrudService: failed to delete task {}: {}", id, e);
                AppError::Database(format!("Failed to delete task: {}", e))
            })?;

        // Add entry to sync queue after successful task deletion
        let _ = conn.execute(
            "INSERT INTO sync_queue (operation_type, entity_type, entity_id, data, status, priority)
             VALUES ('delete', 'task', ?, '{}', 'pending', 5)",
            params![id]
        ).map_err(|e| {
            error!("Failed to add task deletion to sync queue: {}", e);
            e
        });

        Ok(())
    }

    /// Get a single task by ID (sync version for internal use)
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

    /// Validate create request
    #[allow(dead_code)]
    fn validate_create_request(&self, req: &CreateTaskRequest) -> Result<(), AppError> {
        if req.vehicle_plate.trim().is_empty() {
            return Err(AppError::Validation(
                "Vehicle plate is required".to_string(),
            ));
        }
        if req.vehicle_model.trim().is_empty() {
            return Err(AppError::Validation(
                "Vehicle model is required".to_string(),
            ));
        }
        if req.scheduled_date.trim().is_empty() {
            return Err(AppError::Validation(
                "Scheduled date is required".to_string(),
            ));
        }
        if req.ppf_zones.is_empty() {
            return Err(AppError::Validation(
                "At least one PPF zone must be selected".to_string(),
            ));
        }
        Ok(())
    }

    /// Generate a unique task number
    #[allow(dead_code)]
    fn generate_task_number(&self) -> Result<String, AppError> {
        let now = Utc::now();
        let date_part = now.format("%Y%m%d").to_string();

        let conn = self.db.get_connection()?;

        // Start IMMEDIATE transaction to prevent race conditions
        conn.execute("BEGIN IMMEDIATE", [])
            .map_err(|e| AppError::Database(format!("Failed to start transaction: {}", e)))?;

        let sql = "SELECT task_number FROM tasks WHERE task_number LIKE ? ORDER BY task_number DESC LIMIT 1";
        let pattern = format!("{}-%", date_part);

        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| AppError::Database(format!("Failed to prepare statement: {}", e)))?;

        let existing_numbers: Result<Vec<String>, _> = stmt
            .query_map(params![pattern], |row| row.get::<_, String>(0))
            .map_err(|e| AppError::Database(format!("Failed to query task numbers: {}", e)))?
            .collect();
        let existing_numbers = existing_numbers.unwrap_or_else(|e| {
            error!("Failed to collect existing task numbers: {}", e);
            Vec::new()
        });

        let mut max_sequence = 0;
        for number in existing_numbers {
            if let Some(seq_str) = number.strip_prefix(&format!("{}-", date_part)) {
                if let Ok(seq) = seq_str.parse::<i32>() {
                    max_sequence = max_sequence.max(seq);
                }
            }
        }

        let next_sequence = max_sequence + 1;
        let task_number = format!("{}-{:03}", date_part, next_sequence);

        // Commit transaction to release lock
        conn.execute("COMMIT", [])
            .map_err(|e| AppError::Database(format!("Failed to commit transaction: {}", e)))?;

        Ok(task_number)
    }
}

 impl SyncTaskCrudService<'_> {
    fn create_task_sync(&self, req: CreateTaskRequest, user_id: &str) -> Result<Task, AppError> {
        // Validate request
        self.validate_create_request(&req)?;

        // Generate unique task number if not provided
        let task_number = req.task_number.clone().unwrap_or_else(|| {
            self.generate_task_number().unwrap_or_else(|e| {
                error!("Failed to generate task number: {}, using fallback", e);
                format!("TASK-{}", Uuid::new_v4())
            })
        });

        // Create task instance
        let now = Utc::now();
        let now_millis = now.timestamp_millis();
        let task = Task {
            id: Uuid::new_v4().to_string(),
            task_number: task_number.clone(),
            title: req
                .title
                .clone()
                .filter(|t| !t.trim().is_empty() && t != "Nouvelle tâche")
                .unwrap_or_else(|| {
                    // Generate meaningful title based on available data
                    if let Some(make) = &req.vehicle_make {
                        format!("{} {} ({})", make, req.vehicle_model, req.vehicle_plate)
                    } else {
                        format!("{} ({})", req.vehicle_model, req.vehicle_plate)
                    }
                }),
            description: req.description.clone(),
            vehicle_plate: Some(req.vehicle_plate.clone()),
            vehicle_model: Some(req.vehicle_model.clone()),
            vehicle_year: req.vehicle_year.clone(),
            vehicle_make: req.vehicle_make.clone(),
            vin: req.vin.clone(),
            ppf_zones: Some(req.ppf_zones.clone()),
            custom_ppf_zones: req.custom_ppf_zones.clone(),
            status: TaskStatus::Pending,
            priority: req.priority.unwrap_or(TaskPriority::Medium),
            technician_id: req.technician_id.clone(),
            assigned_at: None,
            assigned_by: None,
            scheduled_date: Some(req.scheduled_date.clone()),
            start_time: req.start_time.clone(),
            end_time: req.end_time.clone(),
            date_rdv: req.date_rdv.clone(),
            heure_rdv: req.heure_rdv.clone(),
            template_id: None,
            workflow_id: None,
            workflow_status: None,
            current_workflow_step_id: None,
            started_at: None,
            completed_at: None,
            completed_steps: None,
            client_id: req.client_id.clone(),
            customer_name: req.customer_name.clone(),
            customer_phone: req.customer_phone.clone(),
            customer_email: req.customer_email.clone(),
            external_id: req.external_id.clone(),
            created_by: Some(user_id.to_string()),
            creator_id: Some(user_id.to_string()),
            created_at: now_millis,
            updated_at: now_millis,
            actual_duration: None,
            checklist_completed: false,
            customer_address: None,
            lot_film: None,
            estimated_duration: req.estimated_duration,
            deleted_at: None,
            deleted_by: None,
            tags: Some(req.tags.clone().unwrap_or_default()),
            notes: req.notes.clone(),
            synced: false,
            last_synced_at: None,
            updated_by: Some(user_id.to_string()),
        };

        // Insert into database
        self.conn.execute(
            "INSERT INTO tasks (
                id, task_number, title, description, vehicle_plate, vehicle_model, vehicle_year,
                vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
                scheduled_date, start_time, end_time, date_rdv, heure_rdv, client_id, customer_name,
                customer_phone, customer_email, external_id, notes, tags, estimated_duration,
                created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                task.id,
                task.task_number,
                task.title,
                task.description,
                task.vehicle_plate,
                task.vehicle_model,
                task.vehicle_year,
                task.vehicle_make,
                task.vin,
                serde_json::to_string(&task.ppf_zones).unwrap_or_else(|e| {
                    warn!("Failed to serialize PPF zones: {}", e);
                    "[]".to_string()
                }),
                serde_json::to_string(&task.custom_ppf_zones).unwrap_or_else(|e| {
                    warn!("Failed to serialize custom PPF zones: {}", e);
                    "[]".to_string()
                }),
                serde_json::to_string(&task.status).unwrap_or_else(|e| {
                    warn!("Failed to serialize status: {}", e);
                    "draft".to_string()
                }),
                serde_json::to_string(&task.priority).unwrap_or_else(|e| {
                    warn!("Failed to serialize priority: {}", e);
                    "medium".to_string()
                }),
                task.technician_id,
                task.scheduled_date,
                task.start_time,
                task.end_time,
                task.date_rdv,
                task.heure_rdv,
                task.client_id,
                task.customer_name,
                task.customer_phone,
                task.customer_email,
                task.external_id,
                task.notes,
                serde_json::to_string(&task.tags).unwrap_or_else(|e| {
                    warn!("Failed to serialize tags: {}", e);
                    "[]".to_string()
                }),
                req.estimated_duration,
                task.created_by,
                task.created_at,
                task.updated_at,
            ],
        ).map_err(|e| AppError::Database(format!("Failed to create task: {}", e)))?;

        Ok(task)
    }

    fn validate_create_request(&self, req: &CreateTaskRequest) -> Result<(), AppError> {
        if req.vehicle_plate.trim().is_empty() {
            return Err(AppError::Validation(
                "Vehicle plate is required".to_string(),
            ));
        }
        if req.vehicle_model.trim().is_empty() {
            return Err(AppError::Validation(
                "Vehicle model is required".to_string(),
            ));
        }
        Ok(())
    }

    fn generate_task_number(&self) -> Result<String, AppError> {
        // Generate a unique task number
        let now = Utc::now();
        let date_part = now.format("%Y%m%d").to_string();

        // Start IMMEDIATE transaction to prevent race conditions
        self.conn.execute("BEGIN IMMEDIATE", [])
            .map_err(|e| AppError::Database(format!("Failed to start transaction: {}", e)))?;

        let sequence: i64 = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE DATE(created_at/1000, 'unixepoch') = DATE('now')",
                [],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| AppError::Database(format!("Failed to query task count: {}", e)))?
            + 1;

        let task_number = format!("{}-{:03}", date_part, sequence);

        // Commit transaction to release lock
        self.conn.execute("COMMIT", [])
            .map_err(|e| AppError::Database(format!("Failed to commit transaction: {}", e)))?;

        Ok(task_number)
    }
}
