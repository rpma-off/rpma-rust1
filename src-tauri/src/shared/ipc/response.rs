//! Shared IPC response envelopes and serialization helpers.

use super::errors::{AppError, AppResult};
use crate::shared::logging::correlation::generate_correlation_id;
use base64::{engine::general_purpose, Engine as _};
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

/// Compressed API envelope for large payloads.
#[derive(TS, Debug, Serialize, Deserialize)]
pub struct CompressedApiResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    pub compressed: bool,
    pub data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
}

/// Standard API response envelope.
#[derive(Debug, Serialize, Deserialize)]
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

    pub fn with_correlation_id(mut self, correlation_id: Option<String>) -> Self {
        self.correlation_id = correlation_id.or_else(|| Some(generate_correlation_id()));
        self
    }

    pub fn to_compressed_if_large(self) -> Result<CompressedApiResponse, AppError>
    where
        T: Serialize,
    {
        let json_size = serde_json::to_string(&self.data)
            .map(|s| s.len())
            .unwrap_or(0);

        if json_size > 1024 {
            let data_json = serde_json::to_vec(&self.data)
                .map_err(|e| AppError::Internal(format!("Serialization error: {}", e)))?;

            use flate2::write::GzEncoder;
            use flate2::Compression;
            use std::io::Write;

            let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
            encoder
                .write_all(&data_json)
                .map_err(|e| AppError::Internal(format!("Compression error: {}", e)))?;
            let compressed = encoder
                .finish()
                .map_err(|e| AppError::Internal(format!("Compression finish error: {}", e)))?;

            let compressed_b64 = general_purpose::STANDARD.encode(&compressed);

            Ok(CompressedApiResponse {
                success: self.success,
                message: self.message,
                error_code: self.error_code,
                compressed: true,
                data: Some(compressed_b64),
                error: self.error,
                correlation_id: self.correlation_id,
            })
        } else {
            Ok(CompressedApiResponse {
                success: self.success,
                message: self.message,
                error_code: self.error_code,
                compressed: false,
                data: self
                    .data
                    .map(|d| serde_json::to_string(&d).unwrap_or_default()),
                error: self.error,
                correlation_id: self.correlation_id,
            })
        }
    }

    pub fn to_msgpack(&self) -> Result<Vec<u8>, AppError>
    where
        T: Serialize,
    {
        rmp_serde::to_vec(self)
            .map_err(|e| AppError::Internal(format!("MessagePack serialization error: {}", e)))
    }
}

impl CompressedApiResponse {
    pub fn decompress_data<T>(&self) -> Result<Option<T>, AppError>
    where
        T: for<'de> Deserialize<'de>,
    {
        match (&self.data, self.compressed) {
            (Some(data), true) => {
                let compressed = general_purpose::STANDARD
                    .decode(data)
                    .map_err(|e| AppError::Internal(format!("Base64 decode error: {}", e)))?;

                use flate2::read::GzDecoder;
                use std::io::Read;

                let mut decoder = GzDecoder::new(&compressed[..]);
                let mut decompressed = Vec::new();
                decoder
                    .read_to_end(&mut decompressed)
                    .map_err(|e| AppError::Internal(format!("Decompression error: {}", e)))?;

                let value: T = serde_json::from_slice(&decompressed).map_err(|e| {
                    AppError::Internal(format!("JSON deserialization error: {}", e))
                })?;

                Ok(Some(value))
            }
            (Some(data), false) => {
                let value: T = serde_json::from_str(data).map_err(|e| {
                    AppError::Internal(format!("JSON deserialization error: {}", e))
                })?;
                Ok(Some(value))
            }
            _ => Ok(None),
        }
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
