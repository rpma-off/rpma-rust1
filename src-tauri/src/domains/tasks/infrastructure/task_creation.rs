//! Task Creation Service
//!
//! Extracted from TaskCrudService to handle task creation operations.

use crate::commands::AppError;
use crate::db::Database;
use crate::models::task::{CreateTaskRequest, Task, TaskPriority, TaskStatus};
use crate::services::task_validation::TaskValidationService;
use crate::services::validation::ValidationService;
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;
use tracing::{debug, error, warn};
use uuid::Uuid;

/// Service for handling task creation operations
#[derive(Debug)]
pub struct TaskCreationService {
    db: Arc<Database>,
}

impl TaskCreationService {
    /// Create a new TaskCreationService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Create a new task (async version)
    pub async fn create_task_async(
        &self,
        req: CreateTaskRequest,
        user_id: &str,
    ) -> Result<Task, AppError> {
        // Clone for the blocking operation
        let req = req.clone();
        let user_id = user_id.to_string();
        let db = self.db.clone();

        tokio::task::spawn_blocking(move || {
            let service = TaskCreationService::new(db);
            service.create_task_sync(req, &user_id)
        })
        .await
        .map_err(|e| {
            error!("TaskCreationService: task creation failed: {:?}", e);
            AppError::Database(format!("Task creation failed: {:?}", e))
        })?
    }

    /// Create a new task (sync version)
    pub fn create_task_sync(
        &self,
        req: CreateTaskRequest,
        user_id: &str,
    ) -> Result<Task, AppError> {
        // Validate request using centralized validation rules
        let validator = ValidationService::new();
        let (vehicle_plate, vehicle_model, ppf_zones, scheduled_date) = validator
            .validate_task_creation(
                &req.vehicle_plate,
                &req.vehicle_model,
                &req.ppf_zones,
                &req.scheduled_date,
            )
            .map_err(|e| AppError::Validation(e.to_string()))?;

        // Validate technician assignment if specified
        if let Some(ref technician_id) = req.technician_id {
            let validation_service = TaskValidationService::new(self.db.clone());
            validation_service
                .validate_technician_assignment(technician_id, &Some(ppf_zones.clone()))
                .map_err(|e| {
                    AppError::Validation(format!("Technician validation failed: {}", e))
                })?;
        }

        // Generate unique task number if not provided
        let task_number = req.task_number.clone().unwrap_or_else(|| {
            self.generate_task_number().unwrap_or_else(|e| {
                error!("Failed to generate task number: {}, using fallback", e);
                format!("TASK-{}", Uuid::new_v4())
            })
        });

        let task = self.build_task(
            &req,
            user_id,
            task_number,
            vehicle_plate,
            vehicle_model,
            ppf_zones,
            scheduled_date,
        );

        self.validate_task_constraints(&task)?;
        self.persist_task(&task, user_id)?;

        Ok(task)
    }

    /// Build a `Task` instance from the validated request fields.
    fn build_task(
        &self,
        req: &CreateTaskRequest,
        user_id: &str,
        task_number: String,
        vehicle_plate: String,
        vehicle_model: String,
        ppf_zones: Vec<String>,
        scheduled_date: String,
    ) -> Task {
        let now = Utc::now();
        let now_millis = now.timestamp_millis();
        Task {
            id: Uuid::new_v4().to_string(),
            task_number: task_number.clone(),
            title: req
                .title
                .clone()
                .filter(|t| !t.trim().is_empty() && t != "Nouvelle tâche")
                .unwrap_or_else(|| {
                    // Generate meaningful title based on available data
                    if let Some(make) = &req.vehicle_make {
                        format!("{} {} ({})", make, vehicle_model, vehicle_plate)
                    } else {
                        format!("{} ({})", vehicle_model, vehicle_plate)
                    }
                }),
            description: req.description.clone(),
            vehicle_plate: Some(vehicle_plate.clone()),
            vehicle_model: Some(vehicle_model.clone()),
            vehicle_year: req.vehicle_year.clone(),
            vehicle_make: req.vehicle_make.clone(),
            vin: req.vin.clone(),
            ppf_zones: Some(ppf_zones.clone()),
            custom_ppf_zones: req.custom_ppf_zones.clone(),
            status: req.status.clone().unwrap_or(TaskStatus::Pending),
            priority: req.priority.clone().unwrap_or(TaskPriority::Medium),
            technician_id: req.technician_id.clone(),
            assigned_at: None,
            assigned_by: None,
            scheduled_date: Some(scheduled_date.clone()),
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
        }
    }

    /// Check that the task's client exists and that the task number is unique.
    fn validate_task_constraints(&self, task: &Task) -> Result<(), AppError> {
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

        let task_exists: i64 = self.db.query_single_value(
            "SELECT COUNT(*) FROM tasks WHERE task_number = ?",
            params![&task.task_number],
        )?;
        if task_exists > 0 {
            error!("Task number {} already exists", task.task_number);
            return Err(AppError::TaskDuplicateNumber(format!(
                "Task number '{}' already exists",
                task.task_number
            )));
        }

        Ok(())
    }

    /// Insert the task into the database and enqueue it for sync.
    fn persist_task(&self, task: &Task, user_id: &str) -> Result<(), AppError> {
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

        conn.execute(
            r#"
            INSERT INTO tasks (
                id, task_number, title, description, vehicle_plate, vehicle_model, vehicle_year, 
                vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id, 
                assigned_at, assigned_by, scheduled_date, start_time, end_time, date_rdv, heure_rdv, 
                template_id, workflow_id, workflow_status, current_workflow_step_id, started_at, 
                completed_at, completed_steps, client_id, customer_name, customer_email, customer_phone, 
                customer_address, external_id, lot_film, checklist_completed, notes, tags, 
                estimated_duration, actual_duration, created_at, updated_at, creator_id, created_by, 
                updated_by, deleted_at, deleted_by, synced, last_synced_at
            ) VALUES (
                :id, :task_number, :title, :description, :vehicle_plate, :vehicle_model, :vehicle_year,
                :vehicle_make, :vin, :ppf_zones, :custom_ppf_zones, :status, :priority, :technician_id,
                :assigned_at, :assigned_by, :scheduled_date, :start_time, :end_time, :date_rdv, :heure_rdv,
                :template_id, :workflow_id, :workflow_status, :current_workflow_step_id, :started_at,
                :completed_at, :completed_steps, :client_id, :customer_name, :customer_email, :customer_phone,
                :customer_address, :external_id, :lot_film, :checklist_completed, :notes, :tags,
                :estimated_duration, :actual_duration, :created_at, :updated_at, :creator_id, :created_by,
                :updated_by, :deleted_at, :deleted_by, :synced, :last_synced_at
            )
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
        ).map_err(|e| {
            let err_msg = e.to_string();
            error!("Failed to insert task: {}", err_msg);
            if err_msg.contains("UNIQUE constraint failed") && err_msg.contains("task_number") {
                AppError::TaskDuplicateNumber(format!(
                    "Task number '{}' already exists",
                    task.task_number
                ))
            } else {
                AppError::Database(format!("Failed to create task: {}", err_msg))
            }
        })?;

        // Add task to sync queue for offline/remote synchronization
        let task_json = serde_json::to_string(task).map_err(|e| {
            error!("Failed to serialize task for sync queue: {}", e);
            AppError::Database(format!("Failed to serialize task for sync: {}", e))
        })?;

        if let Err(e) = conn.execute(
            r#"
            INSERT INTO sync_queue (
                operation_type, entity_type, entity_id, data, status, 
                priority, user_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                "create",
                "task",
                task.id,
                task_json,
                "pending",
                5,
                user_id,
                task.created_at
            ],
        ) {
            error!("Failed to add task {} to sync queue: {}", task.id, e);
            warn!("Task created but not added to sync queue: {}", e);
        } else {
            debug!("Task {} added to sync queue", task.id);
        }

        Ok(())
    }

    /// Generate a unique task number
    fn generate_task_number(&self) -> Result<String, AppError> {
        let now = Utc::now();
        let date_part = now.format("%Y%m%d").to_string();

        // Find the highest task number for today
        let sql = "SELECT task_number FROM tasks WHERE task_number LIKE ? ORDER BY task_number DESC LIMIT 1";
        let pattern = format!("{}-%", date_part);

        let conn = self.db.get_connection()?;
        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| AppError::Database(e.to_string()))?;
        let existing_numbers: Result<Vec<String>, _> = stmt
            .query_map(params![pattern], |row| row.get::<_, String>(0))
            .map_err(|e| AppError::Database(e.to_string()))?
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
        Ok(format!("{}-{:03}", date_part, next_sequence))
    }
}
