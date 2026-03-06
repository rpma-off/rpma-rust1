//! Shared contract for task assignment checking.
//!
//! This trait allows domains (e.g. interventions) to verify task
//! assignments without depending directly on the tasks infrastructure.

use async_trait::async_trait;

use crate::shared::ipc::errors::AppError;

/// Minimal information about a task assignment needed by other domains.
pub struct TaskAssignmentInfo {
    pub technician_id: Option<String>,
}

/// Port for querying task assignment data across bounded contexts.
#[async_trait]
pub trait TaskAssignmentChecker: Send + Sync {
    /// Check whether `user_id` is assigned to `task_id`.
    fn check_task_assignment(&self, task_id: &str, user_id: &str) -> Result<bool, AppError>;

    /// Retrieve the assignment info for a task. Returns `None` when the task does not exist.
    async fn get_task_assignment(
        &self,
        task_id: &str,
    ) -> Result<Option<TaskAssignmentInfo>, AppError>;
}
