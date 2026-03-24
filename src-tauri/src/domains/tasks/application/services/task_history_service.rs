//! Application-layer service for task history operations (ADR-018).
//!
//! Encapsulates the task-existence check and history retrieval that was
//! previously inline in `ipc/task/history.rs`, so that the IPC handler
//! remains a thin adapter.

use std::sync::Arc;

use tracing::{debug, error, info, instrument};

use crate::commands::AppError;
use crate::domains::tasks::domain::models::task::TaskHistory;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_history_repository::TaskHistoryRepository;

/// Orchestrates task history queries through the application layer.
pub struct TaskHistoryService {
    task_service: Arc<TaskService>,
    history_repo: Arc<TaskHistoryRepository>,
}

impl TaskHistoryService {
    pub fn new(
        task_service: Arc<TaskService>,
        history_repo: Arc<TaskHistoryRepository>,
    ) -> Self {
        Self {
            task_service,
            history_repo,
        }
    }

    /// Retrieve the full status-change history for a task.
    ///
    /// Validates that the task exists before querying history entries,
    /// returning `AppError::NotFound` when the task ID is unknown.
    #[instrument(skip(self), fields(task_id = %task_id))]
    pub async fn get_by_task_id(&self, task_id: &str) -> Result<Vec<TaskHistory>, AppError> {
        debug!("Getting task history");

        // Verify the task exists first
        let task = self
            .task_service
            .get_task_async(task_id)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to fetch task for history lookup");
                AppError::Database(format!("Failed to fetch task: {}", e))
            })?;

        if task.is_none() {
            return Err(AppError::NotFound(format!(
                "Task not found: {}",
                task_id
            )));
        }

        let history = self
            .history_repo
            .find_by_task_id(task_id.to_string())
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to fetch task history");
                AppError::Database(format!("Failed to fetch task history: {}", e))
            })?;

        info!(count = history.len(), "Retrieved history entries for task");

        Ok(history)
    }
}
