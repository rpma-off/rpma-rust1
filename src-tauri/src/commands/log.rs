//! Logging commands for debugging
//!
//! This module provides IPC commands to send backend logs to the frontend console
//! for simultaneous debugging of frontend and backend.

use serde::Deserialize;
use tauri::command;
use tracing::{debug, error, info, warn};

use super::ApiResponse;

/// Log level enum
#[derive(Deserialize, Debug)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

/// Log message structure
#[derive(Deserialize, Debug)]
pub struct LogMessage {
    pub level: LogLevel,
    pub message: String,
    pub context: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Send a log message to frontend console
#[command]
#[tracing::instrument]
pub async fn send_log_to_frontend(log_message: LogMessage) -> Result<(), String> {
    // Initialize correlation context
    let _correlation_id =
        crate::commands::init_correlation_context(&log_message.correlation_id, None);

    let level_str = match log_message.level {
        LogLevel::Debug => "DEBUG",
        LogLevel::Info => "INFO",
        LogLevel::Warn => "WARN",
        LogLevel::Error => "ERROR",
    };

    let full_message = if let Some(context) = log_message.context {
        format!(
            "[BACKEND {}] {} - {}",
            level_str, log_message.message, context
        )
    } else {
        format!("[BACKEND {}] {}", level_str, log_message.message)
    };

    // Log to backend console/file
    match log_message.level {
        LogLevel::Debug => debug!("{}", full_message),
        LogLevel::Info => info!("{}", full_message),
        LogLevel::Warn => warn!("{}", full_message),
        LogLevel::Error => error!("{}", full_message),
    }

    // Return the message so frontend can log it to console
    // The frontend will receive this and can console.log it
    Ok(())
}

/// Log task creation debug request
#[derive(Deserialize, Debug)]
pub struct LogTaskCreationDebugRequest {
    pub task_data: serde_json::Value,
    pub step: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Log task creation debug info
#[command]
#[tracing::instrument]
pub fn log_task_creation_debug(
    request: LogTaskCreationDebugRequest,
) -> Result<ApiResponse<()>, String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    let correlation_id = request.correlation_id.clone();
    debug!(
        "Task creation debug - Step: {}, Data keys: {:?}",
        request.step,
        request
            .task_data
            .as_object()
            .map(|o| o.keys().collect::<Vec<_>>())
    );

    // Return success - frontend can log the data
    Ok(ApiResponse::success(()).with_correlation_id(correlation_id.clone()))
}

/// Log client creation debug request
#[derive(Deserialize, Debug)]
pub struct LogClientCreationDebugRequest {
    pub client_data: serde_json::Value,
    pub step: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Log client creation debug info
#[command]
#[tracing::instrument]
pub fn log_client_creation_debug(
    request: LogClientCreationDebugRequest,
) -> Result<ApiResponse<()>, String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    let correlation_id = request.correlation_id.clone();
    debug!(
        "Client creation debug - Step: {}, Data: {:?}",
        request.step, request.client_data
    );

    // Return success - frontend can log the data
    Ok(ApiResponse::success(()).with_correlation_id(correlation_id.clone()))
}
