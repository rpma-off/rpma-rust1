use std::sync::Arc;

use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::domain::models::task::TaskStatus;
use crate::shared::ipc::errors::AppError;

/// Facade for the Tasks bounded context.
///
/// Provides input validation, business-rule enforcement, and error mapping
/// on top of the underlying infrastructure services. IPC handlers should
/// prefer going through the facade for any operation that requires
/// domain-level validation.
#[derive(Debug)]
pub struct TasksFacade {
    task_service: Arc<TaskService>,
    import_service: Arc<TaskImportService>,
}

impl TasksFacade {
    pub fn new(task_service: Arc<TaskService>, import_service: Arc<TaskImportService>) -> Self {
        Self {
            task_service,
            import_service,
        }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying task service for operations that do not need
    /// additional facade-level validation.
    pub fn task_service(&self) -> &Arc<TaskService> {
        &self.task_service
    }

    /// Access the underlying import service.
    pub fn import_service(&self) -> &Arc<TaskImportService> {
        &self.import_service
    }

    /// Validate and parse a status string, returning a domain-level error on
    /// invalid input.
    pub fn parse_status(&self, status: &str) -> Result<TaskStatus, AppError> {
        TaskStatus::from_str(status)
            .ok_or_else(|| AppError::Validation(format!("Invalid task status: {}", status)))
    }

    /// Validate that a task note is non-empty and within acceptable length.
    pub fn validate_note(&self, note: &str) -> Result<String, AppError> {
        let trimmed = note.trim();
        if trimmed.is_empty() {
            return Err(AppError::Validation(
                "Task note cannot be empty".to_string(),
            ));
        }
        if trimmed.len() > 5000 {
            return Err(AppError::Validation(
                "Task note exceeds maximum length of 5000 characters".to_string(),
            ));
        }
        Ok(trimmed.to_string())
    }

    /// Validate that a task ID is present and well-formed.
    pub fn validate_task_id(&self, task_id: &str) -> Result<(), AppError> {
        if task_id.trim().is_empty() {
            return Err(AppError::Validation("task_id is required".to_string()));
        }
        Ok(())
    }
}
