//! Application-layer service for task checklist operations (ADR-018).
//!
//! Encapsulates checklist persistence that was previously inlined in
//! `ipc/task/checklist.rs` command handlers.  IPC handlers now delegate
//! here so they remain thin adapters.

use std::sync::Arc;

use tracing::{debug, error, instrument};

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::domain::models::task::{
    ChecklistItem, CreateChecklistItemRequest, UpdateChecklistItemRequest,
};
use crate::domains::tasks::infrastructure::task_checklist_repository::TaskChecklistRepository;

/// Lightweight per-request service constructed by IPC handlers.
pub struct TaskChecklistService {
    repo: TaskChecklistRepository,
}

impl TaskChecklistService {
    /// Build from the shared `Database` handle available on `AppState`.
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repo: TaskChecklistRepository::new(db),
        }
    }

    /// List all checklist items for a given task, ordered by position.
    #[instrument(skip(self))]
    pub fn list_for_task(&self, task_id: &str) -> Result<Vec<ChecklistItem>, AppError> {
        debug!(task_id = %task_id, "Listing checklist items for task");
        self.repo.list_for_task(task_id).map_err(|e| {
            error!(error = %e, task_id = %task_id, "Failed to list checklist items");
            e
        })
    }

    /// Toggle completion state of a checklist item and return the updated row.
    #[instrument(skip(self, data))]
    pub fn update_item(
        &self,
        item_id: &str,
        task_id: &str,
        user_id: &str,
        data: UpdateChecklistItemRequest,
    ) -> Result<ChecklistItem, AppError> {
        debug!(item_id = %item_id, task_id = %task_id, "Updating checklist item");
        self.repo
            .update(item_id, task_id, user_id, data)
            .map_err(|e| {
                error!(error = %e, item_id = %item_id, "Failed to update checklist item");
                e
            })
    }

    /// Create a new checklist item for a task.
    #[instrument(skip(self, data))]
    pub fn create_item(&self, data: CreateChecklistItemRequest) -> Result<ChecklistItem, AppError> {
        debug!(task_id = %data.task_id, "Creating checklist item");
        self.repo.create(data).map_err(|e| {
            error!(error = %e, "Failed to create checklist item");
            e
        })
    }
}
