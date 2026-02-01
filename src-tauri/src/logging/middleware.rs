//! IPC command logging middleware
//!
//! This module provides middleware for logging IPC command entries and exits
//! with correlation ID tracking and performance monitoring.

use crate::logging::{LogDomain, RPMARequestLogger};
use serde_json::Value;
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::time::Instant;

/// Middleware function type for IPC commands
pub type MiddlewareFn<T, E> = Box<
    dyn Fn(
            String,
            Option<String>,
            &Value,
            Pin<Box<dyn Future<Output = Result<T, E>> + Send>>,
        ) -> Pin<Box<dyn Future<Output = Result<T, E>> + Send>>
        + Send
        + Sync,
>;

/// Create logging middleware for IPC commands
pub fn create_logging_middleware<T, E>(domain: LogDomain) -> MiddlewareFn<T, E>
where
    T: serde::Serialize + Send + Sync + 'static,
    E: std::error::Error + Send + Sync + 'static,
{
    Box::new(
        move |correlation_id: String,
              user_id: Option<String>,
              args: &Value,
              f: Pin<Box<dyn Future<Output = Result<T, E>> + Send>>| {
            let domain = domain.clone();
            let correlation_id = correlation_id.clone();
            let user_id = user_id.clone();
            let args = args.clone();

            Box::pin(async move {
                let logger = RPMARequestLogger::new(correlation_id, user_id, domain);

                // Log command entry
                let mut context = HashMap::new();
                context.insert("command_args".to_string(), args.clone());
                logger.info("IPC command started", Some(context));

                let start_time = Instant::now();

                // Execute the command
                let result: Result<T, E> = f.await;
                let duration = start_time.elapsed().as_millis() as u64;

                match &result {
                    Ok(response) => {
                        let mut context = HashMap::new();
                        context.insert("duration_ms".to_string(), Value::from(duration));
                        context.insert(
                            "response_size".to_string(),
                            Value::from(serde_json::to_string(response).unwrap_or_default().len()),
                        );
                        logger.info("IPC command completed successfully", Some(context));
                    }
                    Err(error) => {
                        let mut context = HashMap::new();
                        context.insert("duration_ms".to_string(), Value::from(duration));
                        context.insert("error_message".to_string(), Value::from(error.to_string()));
                        logger.error("IPC command failed", Some(error), Some(context));
                    }
                }

                result
            })
        },
    )
}

/// Helper function to extract correlation ID from IPC request
pub fn extract_correlation_id(args: &Value) -> String {
    if let Some(obj) = args.as_object() {
        if let Some(Value::String(corr_id)) = obj.get("correlation_id") {
            return corr_id.clone();
        }
    }
    // Generate a new correlation ID if not provided
    format!(
        "ipc-{}-{}",
        chrono::Utc::now().timestamp_millis(),
        rand::random::<u32>()
    )
}

/// Helper function to extract user ID from IPC request
pub fn extract_user_id(args: &Value) -> Option<String> {
    if let Some(obj) = args.as_object() {
        if let Some(Value::String(user_id)) = obj.get("user_id") {
            return Some(user_id.clone());
        }
    }
    None
}

/// Database operation logging
pub struct DatabaseLogger {
    logger: RPMARequestLogger,
}

impl DatabaseLogger {
    pub fn new(correlation_id: String, user_id: Option<String>) -> Self {
        Self {
            logger: RPMARequestLogger::new(correlation_id, user_id, LogDomain::System),
        }
    }

    pub async fn log_query(&self, query: &str, params: Option<&[Value]>, duration_ms: u64) {
        let mut context = HashMap::new();
        context.insert("query".to_string(), Value::from(query));
        context.insert("duration_ms".to_string(), Value::from(duration_ms));

        if let Some(params) = params {
            context.insert("param_count".to_string(), Value::from(params.len()));
            // Don't log actual parameter values for security
        }

        self.logger.debug("Database query executed", Some(context));
    }

    pub async fn log_transaction(&self, operation: &str, duration_ms: u64, success: bool) {
        let mut context = HashMap::new();
        context.insert("operation".to_string(), Value::from(operation));
        context.insert("duration_ms".to_string(), Value::from(duration_ms));
        context.insert("success".to_string(), Value::from(success));

        if success {
            self.logger
                .info("Database transaction completed", Some(context));
        } else {
            self.logger
                .error("Database transaction failed", None, Some(context));
        }
    }
}
