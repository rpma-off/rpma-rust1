//! Structured error handling for IPC commands
//!
//! This module provides standardized error types that can be properly
//! serialized and sent to the frontend for consistent error handling.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Application error types for consistent error handling
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AppError {
    /// Authentication-related errors
    Authentication(String),

    /// Authorization/permission errors
    Authorization(String),

    /// Input validation errors
    Validation(String),

    /// Database operation errors
    Database(String),

    /// Resource not found errors
    NotFound(String),

    /// Internal server errors
    Internal(String),

    /// Network/service communication errors
    Network(String),

    /// File system I/O errors
    Io(String),

    /// Configuration errors
    Configuration(String),

    /// Rate limiting errors
    RateLimit(String),

    /// Synchronization errors
    Sync(String),

    /// Intervention-specific errors
    InterventionAlreadyActive(String),
    InterventionInvalidState(String),
    InterventionStepNotFound(String),
    InterventionValidationFailed(String),
    InterventionConcurrentModification(String),
    InterventionTimeout(String),
    InterventionStepOutOfOrder(String),

    /// Task-specific errors
    TaskInvalidTransition(String),
    TaskDuplicateNumber(String),
    TaskAssignmentConflict(String),

    /// Feature not yet implemented
    NotImplemented(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Authentication(msg) => write!(f, "Authentication error: {}", msg),
            AppError::Authorization(msg) => write!(f, "Authorization error: {}", msg),
            AppError::Validation(msg) => write!(f, "Validation error: {}", msg),
            AppError::Database(msg) => write!(f, "Database error: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::Internal(msg) => write!(f, "Internal error: {}", msg),
            AppError::Network(msg) => write!(f, "Network error: {}", msg),
            AppError::Io(msg) => write!(f, "I/O error: {}", msg),
            AppError::Configuration(msg) => write!(f, "Configuration error: {}", msg),
            AppError::RateLimit(msg) => write!(f, "Rate limit exceeded: {}", msg),
            AppError::Sync(msg) => write!(f, "Synchronization error: {}", msg),
            AppError::InterventionAlreadyActive(msg) => {
                write!(f, "Intervention already active: {}", msg)
            }
            AppError::InterventionInvalidState(msg) => {
                write!(f, "Intervention invalid state: {}", msg)
            }
            AppError::InterventionStepNotFound(msg) => {
                write!(f, "Intervention step not found: {}", msg)
            }
            AppError::InterventionValidationFailed(msg) => {
                write!(f, "Intervention validation failed: {}", msg)
            }
            AppError::InterventionConcurrentModification(msg) => {
                write!(f, "Intervention concurrent modification: {}", msg)
            }
            AppError::InterventionTimeout(msg) => write!(f, "Intervention timeout: {}", msg),
            AppError::InterventionStepOutOfOrder(msg) => {
                write!(f, "Intervention step out of order: {}", msg)
            }
            AppError::TaskInvalidTransition(msg) => {
                write!(f, "Invalid task status transition: {}", msg)
            }
            AppError::TaskDuplicateNumber(msg) => {
                write!(f, "Duplicate task number: {}", msg)
            }
            AppError::TaskAssignmentConflict(msg) => {
                write!(f, "Task assignment conflict: {}", msg)
            }
            AppError::NotImplemented(msg) => write!(f, "Not implemented: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl AppError {
    /// Get error code for frontend handling
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Authentication(_) => "AUTH_INVALID",
            AppError::Authorization(_) => "AUTH_FORBIDDEN",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Internal(_) => "INTERNAL_ERROR",
            AppError::Network(_) => "NETWORK_ERROR",
            AppError::Io(_) => "IO_ERROR",
            AppError::Configuration(_) => "CONFIG_ERROR",
            AppError::RateLimit(_) => "RATE_LIMIT",
            AppError::Sync(_) => "SYNC_ERROR",
            AppError::InterventionAlreadyActive(_) => "INTERVENTION_ALREADY_ACTIVE",
            AppError::InterventionInvalidState(_) => "INTERVENTION_INVALID_STATE",
            AppError::InterventionStepNotFound(_) => "INTERVENTION_STEP_NOT_FOUND",
            AppError::InterventionValidationFailed(_) => "INTERVENTION_VALIDATION_FAILED",
            AppError::InterventionConcurrentModification(_) => {
                "INTERVENTION_CONCURRENT_MODIFICATION"
            }
            AppError::InterventionTimeout(_) => "INTERVENTION_TIMEOUT",
            AppError::InterventionStepOutOfOrder(_) => "INTERVENTION_STEP_OUT_OF_ORDER",
            AppError::TaskInvalidTransition(_) => "TASK_INVALID_TRANSITION",
            AppError::TaskDuplicateNumber(_) => "TASK_DUPLICATE_NUMBER",
            AppError::TaskAssignmentConflict(_) => "TASK_ASSIGNMENT_CONFLICT",
            AppError::NotImplemented(_) => "NOT_IMPLEMENTED",
        }
    }

    /// Get HTTP status code equivalent
    pub fn http_status(&self) -> u16 {
        match self {
            AppError::Authentication(_) => 401,
            AppError::Authorization(_) => 403,
            AppError::Validation(_) => 400,
            AppError::NotFound(_) => 404,
            AppError::RateLimit(_) => 429,
            AppError::InterventionAlreadyActive(_)
            | AppError::InterventionInvalidState(_)
            | AppError::InterventionStepNotFound(_)
            | AppError::InterventionValidationFailed(_)
            | AppError::InterventionConcurrentModification(_)
            | AppError::InterventionStepOutOfOrder(_) => 400,
            AppError::InterventionTimeout(_) => 408,
            AppError::TaskInvalidTransition(_)
            | AppError::TaskDuplicateNumber(_)
            | AppError::TaskAssignmentConflict(_) => 409,
            AppError::NotImplemented(_) => 501,
            AppError::Database(_)
            | AppError::Internal(_)
            | AppError::Network(_)
            | AppError::Io(_)
            | AppError::Configuration(_)
            | AppError::Sync(_) => 500,
        }
    }

    /// Check if error is client-side (4xx)
    pub fn is_client_error(&self) -> bool {
        matches!(
            self,
            AppError::Authentication(_)
                | AppError::Authorization(_)
                | AppError::Validation(_)
                | AppError::NotFound(_)
                | AppError::RateLimit(_)
                | AppError::InterventionAlreadyActive(_)
                | AppError::InterventionInvalidState(_)
                | AppError::InterventionStepNotFound(_)
                | AppError::InterventionValidationFailed(_)
                | AppError::InterventionConcurrentModification(_)
                | AppError::InterventionStepOutOfOrder(_)
                | AppError::InterventionTimeout(_)
                | AppError::TaskInvalidTransition(_)
                | AppError::TaskDuplicateNumber(_)
                | AppError::TaskAssignmentConflict(_)
        )
    }

    /// Check if error is server-side (5xx)
    pub fn is_server_error(&self) -> bool {
        !self.is_client_error()
    }

    /// Sanitize error for frontend display.
    ///
    /// Server-side errors (Database, Internal, Io, Network, Sync, Configuration)
    /// are replaced with generic messages so that internal details (SQL errors,
    /// file paths, stack traces) are never exposed to the frontend.
    /// Client-side errors (Validation, NotFound, Auth, etc.) are passed through
    /// because they carry user-actionable information.
    pub fn sanitize_for_frontend(self) -> Self {
        match self {
            AppError::Database(ref msg) => {
                tracing::error!(internal_error = %msg, "Database error (sanitized for frontend)");
                AppError::Database("A database error occurred. Please try again.".to_string())
            }
            AppError::Internal(ref msg) => {
                tracing::error!(internal_error = %msg, "Internal error (sanitized for frontend)");
                AppError::Internal("An internal error occurred. Please try again.".to_string())
            }
            AppError::Io(ref msg) => {
                tracing::error!(internal_error = %msg, "I/O error (sanitized for frontend)");
                AppError::Io("A file operation error occurred.".to_string())
            }
            AppError::Network(ref msg) => {
                tracing::error!(internal_error = %msg, "Network error (sanitized for frontend)");
                AppError::Network(
                    "A network error occurred. Please check your connection.".to_string(),
                )
            }
            AppError::Sync(ref msg) => {
                tracing::error!(internal_error = %msg, "Sync error (sanitized for frontend)");
                AppError::Sync("Synchronization failed. Please try again.".to_string())
            }
            AppError::Configuration(ref msg) => {
                tracing::error!(internal_error = %msg, "Configuration error (sanitized for frontend)");
                AppError::Configuration("A configuration error occurred.".to_string())
            }
            // Client errors pass through — they contain user-actionable messages
            other => other,
        }
    }

    /// Create a sanitized database error, logging the raw details internally.
    pub fn db_sanitized(operation: &str, raw_error: impl std::fmt::Display) -> Self {
        tracing::error!(
            operation = operation,
            error = %raw_error,
            "Database operation failed"
        );
        AppError::Database("A database error occurred. Please try again.".to_string())
    }

    /// Create a sanitized internal error, logging the raw details internally.
    pub fn internal_sanitized(operation: &str, raw_error: impl std::fmt::Display) -> Self {
        tracing::error!(
            operation = operation,
            error = %raw_error,
            "Internal operation failed"
        );
        AppError::Internal("An internal error occurred. Please try again.".to_string())
    }
}

/// Conversion from rusqlite::Error
impl From<rusqlite::Error> for AppError {
    fn from(error: rusqlite::Error) -> Self {
        tracing::error!(error = %error, "Database error occurred");
        match error {
            rusqlite::Error::QueryReturnedNoRows => {
                AppError::NotFound("Record not found".to_string())
            }
            _ => AppError::Database("Database operation failed".to_string()),
        }
    }
}

/// Conversion from std::io::Error
impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        tracing::error!(error = %error, "I/O error occurred");
        AppError::Io("I/O operation failed".to_string())
    }
}

/// Conversion from serde_json::Error
impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        tracing::error!(error = %error, "JSON serialization error occurred");
        AppError::Validation("Data format error".to_string())
    }
}

/// Conversion from String
impl From<String> for AppError {
    fn from(error: String) -> Self {
        AppError::Internal(error)
    }
}

/// Conversion from &str
impl From<&str> for AppError {
    fn from(error: &str) -> Self {
        AppError::Internal(error.to_string())
    }
}

/// Conversion from chrono::ParseError
impl From<chrono::ParseError> for AppError {
    fn from(error: chrono::ParseError) -> Self {
        AppError::Validation(format!("Date/time parsing failed: {}", error))
    }
}

/// Result type alias for convenience
pub type AppResult<T> = Result<T, AppError>;

/// Trait for converting domain-specific errors to AppError
pub trait IntoAppError<T> {
    fn into_app_error(self) -> AppResult<T>;
}

/// Implement conversion for Option<T>
impl<T> IntoAppError<T> for Option<T> {
    fn into_app_error(self) -> AppResult<T> {
        self.ok_or_else(|| AppError::NotFound("Expected value not found".to_string()))
    }
}

/// Macro for creating validation errors
#[macro_export]
macro_rules! validation_error {
    ($($arg:tt)*) => {
        AppError::Validation(format!($($arg)*))
    };
}

/// Macro for creating authentication errors
#[macro_export]
macro_rules! auth_error {
    ($($arg:tt)*) => {
        AppError::Authentication(format!($($arg)*))
    };
}

/// Macro for creating authorization errors
#[macro_export]
macro_rules! authz_error {
    ($($arg:tt)*) => {
        AppError::Authorization(format!($($arg)*))
    };
}

/// Macro for creating not found errors
#[macro_export]
macro_rules! not_found_error {
    ($($arg:tt)*) => {
        AppError::NotFound(format!($($arg)*))
    };
}

/// Macro for creating internal errors
#[macro_export]
macro_rules! internal_error {
    ($($arg:tt)*) => {
        AppError::Internal(format!($($arg)*))
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        assert_eq!(
            AppError::Authentication("test".to_string()).code(),
            "AUTH_INVALID"
        );
        assert_eq!(
            AppError::Authorization("test".to_string()).code(),
            "AUTH_FORBIDDEN"
        );
        assert_eq!(
            AppError::Validation("test".to_string()).code(),
            "VALIDATION_ERROR"
        );
        assert_eq!(AppError::NotFound("test".to_string()).code(), "NOT_FOUND");
    }

    #[test]
    fn test_http_status_codes() {
        assert_eq!(
            AppError::Authentication("test".to_string()).http_status(),
            401
        );
        assert_eq!(
            AppError::Authorization("test".to_string()).http_status(),
            403
        );
        assert_eq!(AppError::Validation("test".to_string()).http_status(), 400);
        assert_eq!(AppError::NotFound("test".to_string()).http_status(), 404);
        assert_eq!(AppError::Internal("test".to_string()).http_status(), 500);
    }

    #[test]
    fn test_error_classification() {
        assert!(AppError::Authentication("test".to_string()).is_client_error());
        assert!(AppError::Authorization("test".to_string()).is_client_error());
        assert!(AppError::Validation("test".to_string()).is_client_error());
        assert!(AppError::NotFound("test".to_string()).is_client_error());
        assert!(AppError::Internal("test".to_string()).is_server_error());
        assert!(AppError::Database("test".to_string()).is_server_error());
    }

    #[test]
    fn test_sanitize_for_frontend_strips_server_errors() {
        // Database errors should be sanitized
        let db_err =
            AppError::Database("Query execution failed for user lookup: SQLITE_BUSY".to_string());
        let sanitized = db_err.sanitize_for_frontend();
        match &sanitized {
            AppError::Database(msg) => assert!(
                !msg.contains("Query execution"),
                "Database error leaked internals: {}",
                msg
            ),
            _ => panic!("Expected Database variant"),
        }

        // Internal errors should be sanitized
        let internal_err =
            AppError::Internal("thread 'main' panicked at src/services/auth.rs:42".to_string());
        let sanitized = internal_err.sanitize_for_frontend();
        match &sanitized {
            AppError::Internal(msg) => assert!(
                !msg.contains("panicked"),
                "Internal error leaked stack trace: {}",
                msg
            ),
            _ => panic!("Expected Internal variant"),
        }

        // I/O errors should be sanitized
        let io_err = AppError::Io("/home/user/.config/rpma/rpma.db: permission denied".to_string());
        let sanitized = io_err.sanitize_for_frontend();
        match &sanitized {
            AppError::Io(msg) => assert!(
                !msg.contains("/home"),
                "I/O error leaked file path: {}",
                msg
            ),
            _ => panic!("Expected Io variant"),
        }

        // Network errors should be sanitized
        let net_err = AppError::Network("Connection to 192.168.1.100:5432 refused".to_string());
        let sanitized = net_err.sanitize_for_frontend();
        match &sanitized {
            AppError::Network(msg) => {
                assert!(!msg.contains("192.168"), "Network error leaked IP: {}", msg)
            }
            _ => panic!("Expected Network variant"),
        }
    }

    #[test]
    fn test_sanitize_for_frontend_preserves_client_errors() {
        // Validation errors should pass through
        let validation_err = AppError::Validation("Email format is invalid".to_string());
        let sanitized = validation_err.sanitize_for_frontend();
        match &sanitized {
            AppError::Validation(msg) => assert_eq!(msg, "Email format is invalid"),
            _ => panic!("Expected Validation variant"),
        }

        // NotFound errors should pass through
        let not_found = AppError::NotFound("Task not found".to_string());
        let sanitized = not_found.sanitize_for_frontend();
        match &sanitized {
            AppError::NotFound(msg) => assert_eq!(msg, "Task not found"),
            _ => panic!("Expected NotFound variant"),
        }

        // Authentication errors should pass through
        let auth_err = AppError::Authentication("Invalid credentials".to_string());
        let sanitized = auth_err.sanitize_for_frontend();
        match &sanitized {
            AppError::Authentication(msg) => assert_eq!(msg, "Invalid credentials"),
            _ => panic!("Expected Authentication variant"),
        }
    }

    #[test]
    fn test_db_sanitized_does_not_leak_details() {
        let err = AppError::db_sanitized("get_user", "no such table: users");
        match &err {
            AppError::Database(msg) => {
                assert!(
                    !msg.contains("no such table"),
                    "db_sanitized leaked raw error: {}",
                    msg
                );
            }
            _ => panic!("Expected Database variant"),
        }
    }

    #[test]
    fn test_internal_sanitized_does_not_leak_details() {
        let err = AppError::internal_sanitized(
            "process_payment",
            "Stripe API key invalid: sk_test_abc123",
        );
        match &err {
            AppError::Internal(msg) => {
                assert!(
                    !msg.contains("sk_test"),
                    "internal_sanitized leaked API key: {}",
                    msg
                );
            }
            _ => panic!("Expected Internal variant"),
        }
    }

    #[test]
    fn test_task_error_codes() {
        assert_eq!(
            AppError::TaskInvalidTransition("test".to_string()).code(),
            "TASK_INVALID_TRANSITION"
        );
        assert_eq!(
            AppError::TaskDuplicateNumber("test".to_string()).code(),
            "TASK_DUPLICATE_NUMBER"
        );
        assert_eq!(
            AppError::TaskAssignmentConflict("test".to_string()).code(),
            "TASK_ASSIGNMENT_CONFLICT"
        );
    }

    #[test]
    fn test_task_error_http_status() {
        assert_eq!(
            AppError::TaskInvalidTransition("test".to_string()).http_status(),
            409
        );
        assert_eq!(
            AppError::TaskDuplicateNumber("test".to_string()).http_status(),
            409
        );
        assert_eq!(
            AppError::TaskAssignmentConflict("test".to_string()).http_status(),
            409
        );
    }

    #[test]
    fn test_task_errors_are_client_errors() {
        assert!(AppError::TaskInvalidTransition("test".to_string()).is_client_error());
        assert!(AppError::TaskDuplicateNumber("test".to_string()).is_client_error());
        assert!(AppError::TaskAssignmentConflict("test".to_string()).is_client_error());
    }
}
