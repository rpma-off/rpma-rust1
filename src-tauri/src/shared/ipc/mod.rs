//! Shared IPC transport contracts and helpers.

pub mod correlation;
pub mod errors;
pub mod response;

pub use correlation::{
    ensure_correlation_id, error_with_correlation, init_correlation_context,
    update_correlation_context_user, with_correlation_context,
};
pub use errors::{AppError, AppResult};
pub use response::{ApiError, ApiResponse, CompressedApiResponse};
