//! Shared error types and mapping helpers for bounded contexts.
#![allow(dead_code)]

mod app_error;

pub use app_error::{AppError, AppResult};

pub(crate) fn map_validation(message: impl Into<String>) -> AppError {
    AppError::Validation(message.into())
}

pub(crate) fn map_auth(message: impl Into<String>) -> AppError {
    AppError::Authentication(message.into())
}

pub(crate) fn map_forbidden(message: impl Into<String>) -> AppError {
    AppError::Authorization(message.into())
}

pub(crate) fn map_not_found(resource: &str, id: impl AsRef<str>) -> AppError {
    AppError::NotFound(format!("{} '{}' not found", resource, id.as_ref()))
}

pub(crate) fn map_internal(context: &str, error: impl std::fmt::Display) -> AppError {
    AppError::internal_sanitized(context, error)
}

pub(crate) fn map_internal_error(context: &str, error: impl std::fmt::Display) -> AppError {
    map_internal(context, error)
}

pub(crate) fn map_database(context: &str, error: impl std::fmt::Display) -> AppError {
    AppError::db_sanitized(context, error)
}
