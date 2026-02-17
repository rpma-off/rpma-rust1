//! Tasks domain — task CRUD, status transitions, assignments.

// Public facade
pub use crate::services::task::TaskService;

// Models
pub(crate) use crate::models::task::{Task, TaskPriority, TaskStatus};

// Services
pub(crate) use crate::services::task_creation::TaskCreationService;
pub(crate) use crate::services::task_crud::TaskCrudService;
pub(crate) use crate::services::task_deletion::TaskDeletionService;
pub(crate) use crate::services::task_update::TaskUpdateService;
pub(crate) use crate::services::task_validation::TaskValidationService;
