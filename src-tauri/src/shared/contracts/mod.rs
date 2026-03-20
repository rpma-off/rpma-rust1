pub mod auth;
pub mod client_ops;
pub mod common;
pub mod events;
pub mod intervention_enums;
pub mod location;
pub mod notification;
pub mod photo;
pub mod prediction;
pub mod sync;
pub mod task_assignment;
pub mod task_scheduler;
pub mod task_status;
pub mod timestamp;
pub mod user_account;

// Re-exported so domain/ files can import shared types via the single allowed path.
pub use crate::shared::error::AppError;
pub use crate::shared::repositories::base::RepoResult;
