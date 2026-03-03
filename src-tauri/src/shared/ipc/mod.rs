//! Shared IPC transport contracts and helpers.

pub mod auth_guard;
pub mod command_context;
pub mod correlation;
pub mod errors;
pub mod response;

pub use auth_guard::AuthGuard;
pub use command_context::CommandContext;
pub use errors::{AppError, AppResult};
pub use response::ApiResponse;
