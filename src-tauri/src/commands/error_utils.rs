//! Error handling utilities for commands
//!
//! This module provides common error handling patterns to reduce duplication
//! across command handlers.

use crate::commands::AppError;

/// Convert a database error into an AppError::Database with a custom message
pub fn db_error<E: std::fmt::Display>(operation: &str, error: E) -> AppError {
    AppError::Database(format!("{} failed: {}", operation, error))
}

/// Convert a database error into an AppError::Database with a standard message format
pub fn db_op_error<E: std::fmt::Display>(operation: &str, error: E) -> AppError {
    AppError::Database(format!(
        "Database operation '{}' failed: {}",
        operation, error
    ))
}

/// Create a validation error
pub fn validation_error<E: std::fmt::Display>(field: &str, error: E) -> AppError {
    AppError::Validation(format!("Validation failed for '{}': {}", field, error))
}

/// Create an authorization error
pub fn auth_error<E: std::fmt::Display>(operation: &str, error: E) -> AppError {
    AppError::Authorization(format!(
        "Authorization failed for '{}': {}",
        operation, error
    ))
}

/// Create a not found error
pub fn not_found_error(resource: &str, id: &str) -> AppError {
    AppError::NotFound(format!("{} with id '{}' not found", resource, id))
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
