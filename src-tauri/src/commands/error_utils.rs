//! Error handling utilities for commands
//!
//! This module provides common error handling patterns to reduce duplication
//! across command handlers. All utilities ensure that internal error details
//! are logged server-side but never leaked to the frontend.

use crate::commands::AppError;

/// Convert a database error into a sanitized AppError::Database.
///
/// The raw error is logged internally but the message returned to the frontend
/// is generic to prevent leaking database details.
pub fn db_error<E: std::fmt::Display>(operation: &str, error: E) -> AppError {
    tracing::error!(operation = operation, error = %error, "Database operation failed");
    AppError::Database(format!("{} failed", operation))
}

/// Convert a database error into a sanitized AppError::Database with a standard message format.
pub fn db_op_error<E: std::fmt::Display>(operation: &str, error: E) -> AppError {
    tracing::error!(operation = operation, error = %error, "Database operation failed");
    AppError::Database(format!("Database operation '{}' failed", operation))
}

/// Create a validation error (safe to return — contains user-actionable info)
pub fn validation_error<E: std::fmt::Display>(field: &str, error: E) -> AppError {
    AppError::Validation(format!("Validation failed for '{}': {}", field, error))
}

/// Create an authorization error (safe to return — contains user-actionable info)
pub fn auth_error<E: std::fmt::Display>(operation: &str, error: E) -> AppError {
    AppError::Authorization(format!(
        "Authorization failed for '{}': {}",
        operation, error
    ))
}

/// Create a not found error (safe to return — contains user-actionable info)
pub fn not_found_error(resource: &str, id: &str) -> AppError {
    AppError::NotFound(format!("{} with id '{}' not found", resource, id))
}

/// Create a sanitized internal error that logs the raw details.
pub fn internal_error<E: std::fmt::Display>(operation: &str, error: E) -> AppError {
    tracing::error!(operation = operation, error = %error, "Internal operation failed");
    AppError::Internal("An internal error occurred. Please try again.".to_string())
}

/// Extension trait for Result types to provide convenient error mapping
pub trait ResultExt<T, E> {
    fn map_db_error(self, operation: &str) -> Result<T, AppError>
    where
        E: std::fmt::Display;
}

impl<T, E> ResultExt<T, E> for Result<T, E> {
    fn map_db_error(self, operation: &str) -> Result<T, AppError>
    where
        E: std::fmt::Display,
    {
        self.map_err(|e| db_op_error(operation, e))
    }
}
