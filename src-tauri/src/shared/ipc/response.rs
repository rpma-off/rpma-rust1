//! Shared IPC response envelopes and serialization helpers.

use super::errors::{AppError, AppResult};
use crate::shared::logging::correlation::generate_correlation_id;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Standard API error envelope returned to the frontend.
#[derive(TS, Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub message: String,
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "JsonValue | null")]
    pub details: Option<serde_json::Value>,
}

/// Standard API response envelope.
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
}

impl<T> ApiResponse<T> {
    /// Creates a successful API response with a generated correlation ID. Clears error fields.
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            message: None,
            error_code: None,
            data: Some(data),
            error: None,
            correlation_id: Some(generate_correlation_id()),
        }
    }

    /// Creates a successful API response and overrides the correlation ID when one is available.
    pub fn success_with_correlation(data: T, correlation_id: impl Into<Option<String>>) -> Self {
        Self::success(data).with_correlation_id(correlation_id.into())
    }

    /// Creates a failed API response from an application error. Sanitizes backend details before returning them.
    pub fn error(error: AppError) -> Self {
        let error_code = error.code().to_string();
        let sanitized = error.sanitize_for_frontend();
        let message = sanitized.to_string();
        Self {
            success: false,
            message: Some(message.clone()),
            error_code: Some(error_code.clone()),
            data: None,
            error: Some(ApiError {
                message,
                code: error_code,
                details: None,
            }),
            correlation_id: Some(generate_correlation_id()),
        }
    }

    /// Creates a failed API response from a plain message. Uses the `UNKNOWN` error code.
    pub fn error_message(message: &str) -> Self {
        Self {
            success: false,
            message: Some(message.to_string()),
            error_code: Some("UNKNOWN".to_string()),
            data: None,
            error: Some(ApiError {
                message: message.to_string(),
                code: "UNKNOWN".to_string(),
                details: None,
            }),
            correlation_id: Some(generate_correlation_id()),
        }
    }

    /// Replaces or generates the response correlation ID. Ensures callers always receive one.
    pub fn with_correlation_id(mut self, correlation_id: Option<String>) -> Self {
        self.correlation_id = correlation_id.or_else(|| Some(generate_correlation_id()));
        self
    }
}

impl<T> From<AppResult<T>> for ApiResponse<T> {
    fn from(result: AppResult<T>) -> Self {
        match result {
            Ok(data) => Self::success(data),
            Err(error) => Self::error(error),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_response_error_includes_flat_envelope_fields() {
        let response: ApiResponse<()> =
            ApiResponse::error(AppError::Validation("invalid".to_string()));
        assert!(!response.success);
        assert_eq!(
            response.message.as_deref(),
            Some("Validation error: invalid")
        );
        assert_eq!(response.error_code.as_deref(), Some("VALIDATION_ERROR"));
    }

    #[test]
    fn api_response_success_includes_message_and_no_error_code() {
        let response = ApiResponse::success("ok");
        assert!(response.success);
        assert_eq!(response.message, None);
        assert_eq!(response.error_code, None);
    }

    #[test]
    fn api_response_success_with_correlation_preserves_provided_value() {
        let response = ApiResponse::success_with_correlation("ok", Some("corr-123".to_string()));
        assert!(response.success);
        assert_eq!(response.correlation_id.as_deref(), Some("corr-123"));
    }

    #[test]
    fn api_response_error_sanitizes_database_errors() {
        let response: ApiResponse<()> = ApiResponse::error(AppError::Database(
            "SQLITE_BUSY: database is locked".to_string(),
        ));
        assert!(!response.success);
        let msg = response.message.as_deref().unwrap();
        assert!(
            !msg.contains("SQLITE_BUSY"),
            "Database error leaked internals in response: {}",
            msg
        );
        assert_eq!(response.error_code.as_deref(), Some("DATABASE_ERROR"));
    }

    #[test]
    fn api_response_error_sanitizes_internal_errors() {
        let response: ApiResponse<()> = ApiResponse::error(AppError::Internal(
            "thread 'main' panicked at src/services/auth.rs:42".to_string(),
        ));
        assert!(!response.success);
        let msg = response.message.as_deref().unwrap();
        assert!(
            !msg.contains("panicked"),
            "Internal error leaked stack trace in response: {}",
            msg
        );
        assert_eq!(response.error_code.as_deref(), Some("INTERNAL_ERROR"));
    }

    #[test]
    fn api_response_error_preserves_client_errors() {
        let response: ApiResponse<()> =
            ApiResponse::error(AppError::NotFound("Task #42 not found".to_string()));
        assert!(!response.success);
        let msg = response.message.as_deref().unwrap();
        assert!(
            msg.contains("Task #42 not found"),
            "Client error should preserve message: {}",
            msg
        );
    }
}
