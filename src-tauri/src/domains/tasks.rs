//! Tasks domain — task CRUD, status transitions, assignments
//!
//! This module re-exports all task-related components across layers.

// Models
pub use crate::models::task::{Task, TaskPriority, TaskStatus};

// Services
pub use crate::services::task::TaskService;
pub use crate::services::task_creation::TaskCreationService;
pub use crate::services::task_crud::TaskCrudService;
pub use crate::services::task_deletion::TaskDeletionService;
pub use crate::services::task_update::TaskUpdateService;
pub use crate::services::task_validation::TaskValidationService;
