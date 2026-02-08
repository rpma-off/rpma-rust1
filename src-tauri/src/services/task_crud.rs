//! Task CRUD operations module
//!
//! This module handles core Create, Read, Update, Delete operations for tasks.

use crate::commands::AppError;
use crate::db::Database;
use crate::models::task::*;
use std::sync::Arc;

/// Core CRUD operations for tasks
#[derive(Debug)]
pub struct TaskCrudService {
    pub(crate) db: Arc<Database>,
}

impl TaskCrudService {
    /// Create a new TaskCrudService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Create a new task (async version)
    pub async fn create_task_async(
        &self,
        req: CreateTaskRequest,
        user_id: &str,
    ) -> Result<Task, AppError> {
        use crate::services::task_creation::TaskCreationService;
        let creation_service = TaskCreationService::new(self.db.clone());
        creation_service.create_task_async(req, user_id).await
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
    pub async fn delete_task_async(&self, id: &str, user_id: &str) -> Result<(), AppError> {
        use crate::services::task_deletion::TaskDeletionService;
        let deletion_service = TaskDeletionService::new(self.db.clone());
        deletion_service.delete_task_async(id, user_id, false).await
    }

    /// Hard delete a task (async version) - permanently removes from database
    pub async fn hard_delete_task_async(&self, id: &str, user_id: &str) -> Result<(), AppError> {
        use crate::services::task_deletion::TaskDeletionService;
        let deletion_service = TaskDeletionService::new(self.db.clone());
        deletion_service.delete_task_async(id, user_id, true).await
    }
}
