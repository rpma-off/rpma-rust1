//! Comprehensive logging system for RPMA backend
//!
//! This module provides structured logging with correlation ID support,
//! tracing integration, and performance monitoring.
//!
//! # Log Field Standard
//!
//! All tracing spans and log events across IPC commands MUST use the
//! following structured fields for consistency and searchability:
//!
//! | Field              | Type            | Description                                       |
//! |--------------------|-----------------|---------------------------------------------------|
//! | `correlation_id`   | `String`        | Unique request identifier (format: `req-*`, `ipc-*`) |
//! | `user_id`          | `String`        | Authenticated user performing the operation        |
//! | `task_id`          | `String`        | Task being operated on (when applicable)           |
//! | `intervention_id`  | `String`        | Intervention being operated on (when applicable)   |
//! | `operation`        | `String`        | Human-readable name of the operation               |
//! | `error`            | `Display`       | Internal error details (logged server-side only)   |
//!
//! ## Guidelines
//!
//! - **`#[instrument]`**: Every `#[tauri::command]` function MUST have a
//!   `#[instrument(skip(state, session_token, ...))]` attribute that skips
//!   sensitive parameters (state, tokens, passwords, request bodies).
//! - **Structured fields**: Use `tracing::Span::current().record("user_id", …)`
//!   to attach the `user_id` after authentication.
//! - **Error sanitization**: Server-side errors (Database, Internal, Io, Network,
//!   Sync, Configuration) MUST be sanitized via `AppError::sanitize_for_frontend()`
//!   or the `AppError::db_sanitized()` / `AppError::internal_sanitized()` helpers
//!   before being returned to the frontend. Raw error details are logged
//!   server-side at `error!` level with the internal details.
//! - **Correlation IDs**: Propagate the `correlation_id` from the request when
//!   available; otherwise generate one via `generate_correlation_id()`.

pub mod correlation;
pub mod middleware;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{debug, error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLayer {
    Frontend,
    IPC,
    Backend,
    Database,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogDomain {
    Auth,
    Task,
    Client,
    Photo,
    Sync,
    UI,
    API,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogSeverity {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub correlation_id: String,
    pub layer: LogLayer,
    pub domain: LogDomain,
    pub severity: LogSeverity,
    pub operation: String,
    pub user_id: Option<String>,
    pub context_data: Option<HashMap<String, serde_json::Value>>,
    pub duration_ms: Option<u64>,
    pub error: Option<LogError>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogError {
    pub name: String,
    pub message: String,
    pub code: Option<String>,
    pub stack: Option<String>,
}

#[derive(Clone)]
pub struct RPMARequestLogger {
    correlation_id: String,
    user_id: Option<String>,
    domain: LogDomain,
}

impl RPMARequestLogger {
    pub fn new(correlation_id: String, user_id: Option<String>, domain: LogDomain) -> Self {
        Self {
            correlation_id,
            user_id,
            domain,
        }
    }

    pub fn trace(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.log(LogSeverity::Trace, operation, context, None, None);
    }

    pub fn debug(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.log(LogSeverity::Debug, operation, context, None, None);
    }

    pub fn info(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.log(LogSeverity::Info, operation, context, None, None);
    }

    pub fn warn(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.log(LogSeverity::Warn, operation, context, None, None);
    }

    pub fn error(
        &self,
        operation: &str,
        error: Option<&dyn std::error::Error>,
        context: Option<HashMap<String, serde_json::Value>>,
    ) {
        let log_error = error.map(|e| LogError {
            name: std::any::type_name_of_val(e).to_string(),
            message: e.to_string(),
            code: None,
            stack: None,
        });

        self.log(LogSeverity::Error, operation, context, log_error, None);
    }

    pub fn fatal(
        &self,
        operation: &str,
        error: Option<&dyn std::error::Error>,
        context: Option<HashMap<String, serde_json::Value>>,
    ) {
        let log_error = error.map(|e| LogError {
            name: std::any::type_name_of_val(e).to_string(),
            message: e.to_string(),
            code: None,
            stack: None,
        });

        self.log(LogSeverity::Fatal, operation, context, log_error, None);
    }

    pub fn time_operation<F, T>(&self, operation: &str, f: F) -> T
    where
        F: FnOnce() -> T,
    {
        let start = std::time::Instant::now();
        let result = f();
        let duration = start.elapsed().as_millis() as u64;

        let mut context = HashMap::new();
        context.insert("duration_ms".to_string(), serde_json::json!(duration));

        self.info(&format!("{} completed", operation), Some(context));
        result
    }

    fn log(
        &self,
        severity: LogSeverity,
        operation: &str,
        context: Option<HashMap<String, serde_json::Value>>,
        error: Option<LogError>,
        metadata: Option<HashMap<String, serde_json::Value>>,
    ) {
        let span = tracing::span!(
            tracing::Level::INFO,
            "rpma_log",
            correlation_id = %self.correlation_id,
            user_id = self.user_id.as_deref().unwrap_or(""),
            domain = ?self.domain,
            operation = operation
        );

        let _enter = span.enter();

        let log_data = serde_json::json!({
            "correlation_id": self.correlation_id,
            "layer": LogLayer::Backend,
            "domain": self.domain,
            "severity": severity,
            "operation": operation,
            "user_id": self.user_id,
            "context_data": context,
            "error": error,
            "metadata": metadata
        });

        match severity {
            LogSeverity::Trace => debug!("{}", log_data),
            LogSeverity::Debug => debug!("{}", log_data),
            LogSeverity::Info => info!("{}", log_data),
            LogSeverity::Warn => warn!("{}", log_data),
            LogSeverity::Error => error!("{}", log_data),
            LogSeverity::Fatal => error!("{}", log_data),
        }
    }
}

// Global logger instance
lazy_static::lazy_static! {
    pub static ref GLOBAL_LOGGER: std::sync::Mutex<Option<RPMARequestLogger>> = std::sync::Mutex::new(None);
}

pub fn set_global_logger(logger: RPMARequestLogger) {
    *GLOBAL_LOGGER.lock().expect("Global logger mutex poisoned") = Some(logger);
}

pub fn get_global_logger() -> Option<RPMARequestLogger> {
    GLOBAL_LOGGER
        .lock()
        .expect("Global logger mutex poisoned")
        .clone()
}

pub fn clear_global_logger() {
    *GLOBAL_LOGGER.lock().expect("Global logger mutex poisoned") = None;
}

/// Service-level logging helper that reads correlation context from thread-local storage
/// Use this in service methods to add structured logging with correlation tracking
pub struct ServiceLogger {
    logger: RPMARequestLogger,
}

impl ServiceLogger {
    /// Create a new ServiceLogger with correlation context from thread-local storage
    /// Falls back to generating a new correlation_id if none is set
    pub fn new(domain: LogDomain) -> Self {
        let context = correlation::get_correlation_context()
            .unwrap_or_else(|| correlation::CorrelationContext::default());

        Self {
            logger: RPMARequestLogger::new(
                context.get_correlation_id().to_string(),
                context.get_user_id().map(|s| s.to_string()),
                domain,
            ),
        }
    }

    pub fn trace(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.logger.trace(operation, context);
    }

    pub fn debug(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.logger.debug(operation, context);
    }

    pub fn info(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.logger.info(operation, context);
    }

    pub fn warn(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.logger.warn(operation, context);
    }

    pub fn error(
        &self,
        operation: &str,
        error: Option<&dyn std::error::Error>,
        context: Option<HashMap<String, serde_json::Value>>,
    ) {
        self.logger.error(operation, error, context);
    }
}

/// Repository-level logging helper that reads correlation context from thread-local storage
/// Use this in repository methods to add structured logging with correlation tracking
pub struct RepositoryLogger {
    logger: RPMARequestLogger,
}

impl RepositoryLogger {
    /// Create a new RepositoryLogger with correlation context from thread-local storage
    /// Falls back to generating a new correlation_id if none is set
    pub fn new() -> Self {
        let context = correlation::get_correlation_context()
            .unwrap_or_else(|| correlation::CorrelationContext::default());

        Self {
            logger: RPMARequestLogger::new(
                context.get_correlation_id().to_string(),
                context.get_user_id().map(|s| s.to_string()),
                LogDomain::System,
            ),
        }
    }

    pub fn trace(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.logger.trace(operation, context);
    }

    pub fn debug(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.logger.debug(operation, context);
    }

    pub fn info(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.logger.info(operation, context);
    }

    pub fn warn(&self, operation: &str, context: Option<HashMap<String, serde_json::Value>>) {
        self.logger.warn(operation, context);
    }

    pub fn error(
        &self,
        operation: &str,
        error: Option<&dyn std::error::Error>,
        context: Option<HashMap<String, serde_json::Value>>,
    ) {
        self.logger.error(operation, error, context);
    }
}
