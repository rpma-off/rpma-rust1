//! Shared error mapping helpers for bounded contexts.

use crate::commands::AppError;

pub(crate) fn map_internal_error(context: &str, error: impl std::fmt::Display) -> AppError {
    AppError::internal_sanitized(context, &error)
}
