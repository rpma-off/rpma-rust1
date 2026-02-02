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

    /// Update a task (async version) - delegates to TaskUpdateService
    pub async fn update_task_async(
        &self,
        req: UpdateTaskRequest,
        user_id: &str,
    ) -> Result<Task, AppError> {
        use crate::services::task_update::TaskUpdateService;
        let update_service = TaskUpdateService::new(self.db.clone());
        update_service.update_task_async(req, user_id).await
    }

    /// Delete a task (async version) - delegates to TaskDeletionService (soft delete by default)
    pub async fn delete_task_async(
        &self,
        id: &str,
        user_id: &str,
    ) -> Result<(), AppError> {
        use crate::services::task_deletion::TaskDeletionService;
        let deletion_service = TaskDeletionService::new(self.db.clone());
        deletion_service.delete_task_async(id, user_id, false).await
    }

    /// Hard delete a task (async version) - permanently removes from database
    pub async fn hard_delete_task_async(
        &self,
        id: &str,
        user_id: &str,
    ) -> Result<(), AppError> {
        use crate::services::task_deletion::TaskDeletionService;
        let deletion_service = TaskDeletionService::new(self.db.clone());
        deletion_service.delete_task_async(id, user_id, true).await
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
