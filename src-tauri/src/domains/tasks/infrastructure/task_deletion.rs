//! Task Deletion Service
//!
//! Extracted from TaskCrudService to handle task deletion operations.

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::infrastructure::task_constants::{
    SINGLE_TASK_TIMEOUT_SECS, TASK_QUERY_COLUMNS,
};
use crate::domains::tasks::domain::models::task::Task;
use rusqlite::params;
use std::sync::Arc;
use tokio::time::timeout;
use tracing::{error, warn};

/// Service for handling task deletion operations
#[derive(Debug)]
pub struct TaskDeletionService {
    db: Arc<Database>,
}

impl TaskDeletionService {
    /// Create a new TaskDeletionService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Delete a task (async version) - uses soft delete by default
    pub async fn delete_task_async(
        &self,
        id: &str,
        user_id: &str,
        force: bool,
    ) -> Result<(), AppError> {
        let db = self.db.clone();
        let id = id.to_string();

        // Add timeout to prevent hanging
        let timeout_duration = std::time::Duration::from_secs(SINGLE_TASK_TIMEOUT_SECS);

        let user_id = user_id.to_string();
        let result = timeout(
            timeout_duration,
            tokio::task::spawn_blocking(move || {
                let service = TaskDeletionService::new(db);
                if force {
                    service.hard_delete_task_sync(&id, &user_id)
                } else {
                    service.soft_delete_task(&id, &user_id)
                }
            }),
        )
        .await;

        match result {
            Ok(Ok(result)) => result,
            Ok(Err(e)) => Err(AppError::Database(format!("Task deletion failed: {}", e))),
            Err(_timeout) => {
                error!("Task deletion timeout - database may be locked");

                // Try to checkpoint WAL
                let _ = crate::db::checkpoint_wal(self.db.pool());

                Err(AppError::Database(
                    "Task deletion timeout - database may be locked".to_string(),
                ))
            }
        }
    }

    /// Hard delete a task (permanent removal from database)
    pub async fn hard_delete_task_async(&self, id: &str, user_id: &str) -> Result<(), AppError> {
        self.delete_task_async(id, user_id, true).await
    }

    /// Hard delete a task (sync version) - permanently removes task from database
    pub fn hard_delete_task_sync(&self, id: &str, user_id: &str) -> Result<(), AppError> {
        // Check if task exists and get it for ownership check
        let task = self.get_task_sync(id)?;
        let task = match task {
            Some(t) => t,
            None => {
                warn!(
                    "TaskDeletionService: task {} not found for hard deletion",
                    id
                );
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
                error!(
                    "TaskDeletionService: failed to hard delete task {}: {}",
                    id, e
                );
                AppError::Database(format!("Failed to hard delete task: {}", e))
            })?;

        Ok(())
    }

    /// Soft delete a task (mark as deleted without removing data)
    pub fn soft_delete_task(&self, id: &str, user_id: &str) -> Result<(), AppError> {
        // Check if task exists
        let task = self.get_task_sync(id)?;
        if task.is_none() {
            warn!(
                "TaskDeletionService: task {} not found for soft deletion",
                id
            );
            return Err(AppError::NotFound(format!("Task with id {} not found", id)));
        }

        let conn = self.db.get_connection()?;
        let now = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "UPDATE tasks SET deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
            params![now, user_id, now, id],
        )
        .map_err(|e| {
            error!("TaskDeletionService: failed to soft delete task {}: {}", id, e);
            AppError::Database(format!("Failed to soft delete task: {}", e))
        })?;

        Ok(())
    }

    /// Restore a soft-deleted task
    pub fn restore_task(&self, id: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "UPDATE tasks SET deleted_at = NULL, deleted_by = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL",
            params![chrono::Utc::now().timestamp_millis(), id],
        )
        .map_err(|e| {
            error!("TaskDeletionService: failed to restore task {}: {}", id, e);
            AppError::Database(format!("Failed to restore task: {}", e))
        })?;

        Ok(())
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

    /// Permanently delete all soft-deleted tasks older than specified days
    pub fn cleanup_deleted_tasks(&self, days_old: i32) -> Result<u32, AppError> {
        let conn = self.db.get_connection()?;
        let cutoff_timestamp =
            chrono::Utc::now().timestamp_millis() - (days_old as i64 * 24 * 60 * 60 * 1000);

        let deleted_count = conn
            .execute(
                "DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?",
                params![cutoff_timestamp],
            )
            .map_err(|e| {
                error!(
                    "TaskDeletionService: failed to cleanup deleted tasks: {}",
                    e
                );
                AppError::Database(format!("Failed to cleanup deleted tasks: {}", e))
            })?;

        Ok(deleted_count as u32)
    }
}
