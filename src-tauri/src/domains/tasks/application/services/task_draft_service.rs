//! Application-layer service for task draft operations (ADR-018).
//!
//! Encapsulates draft persistence logic that was previously inlined in
//! `ipc/task/draft.rs` command handlers, so IPC handlers remain thin
//! adapters per ADR-018.

use std::sync::Arc;

use tracing::{debug, instrument};

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::infrastructure::task_draft_repository::TaskDraftRepository;

/// Orchestrates task draft persistence through the infrastructure repository.
pub struct TaskDraftService {
    repo: TaskDraftRepository,
}

impl TaskDraftService {
    /// Construct a per-request service from the shared database handle.
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repo: TaskDraftRepository::new(db),
        }
    }

    /// Persist (insert or replace) a draft for the given user.
    #[instrument(skip(self, form_data))]
    pub fn save(&self, user_id: &str, form_data: &str) -> Result<(), AppError> {
        debug!(user_id = %user_id, "Saving task draft");
        self.repo.save(user_id, form_data)
    }

    /// Retrieve the raw JSON blob for a user's draft, or `None` if absent.
    #[instrument(skip(self))]
    pub fn get(&self, user_id: &str) -> Result<Option<String>, AppError> {
        debug!(user_id = %user_id, "Getting task draft");
        self.repo.get(user_id)
    }

    /// Delete the draft for a user (e.g. after successful task creation).
    #[instrument(skip(self))]
    pub fn delete(&self, user_id: &str) -> Result<(), AppError> {
        debug!(user_id = %user_id, "Deleting task draft");
        self.repo.delete(user_id)
    }
}
