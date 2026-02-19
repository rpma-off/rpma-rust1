//! Shared error mapping helpers for bounded contexts.

pub use crate::shared::ipc::errors::{AppError, AppResult};

pub(crate) fn map_internal_error(context: &str, error: impl std::fmt::Display) -> AppError {
    AppError::internal_sanitized(context, &error)
}
