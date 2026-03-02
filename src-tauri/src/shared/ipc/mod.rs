//! Shared IPC transport contracts and helpers.

pub mod correlation;
pub mod errors;
pub mod response;

pub use errors::{AppError, AppResult};
pub use response::ApiResponse;
