//! Tauri commands module
//!
//! This module contains all Tauri commands for IPC communication
//! between the frontend and backend.

pub mod compression;
pub mod correlation_helpers;
pub mod error_utils;
pub mod errors;
pub mod ipc_optimization;
pub mod log;
pub mod navigation;
pub mod performance;
// pub mod photo; // Temporarily disabled - no photo.rs or photo/ directory
pub mod streaming;
pub mod system;
pub mod ui;
pub mod websocket;
pub mod websocket_commands;

pub use crate::domains::auth::domain::models::auth::UserRole;
pub use crate::shared::app_state::{AppState, AppStateType};
pub use crate::shared::ipc::response::{ApiError, ApiResponse, CompressedApiResponse};
pub use correlation_helpers::*;
pub use error_utils::*;
pub use errors::{AppError, AppResult};

// Re-export performance commands
#[allow(unused_imports)]
pub use performance::{
    cleanup_performance_metrics, clear_application_cache, configure_cache_settings,
    get_cache_statistics, get_performance_metrics, get_performance_stats,
};

// Re-export task validation commands

// Re-export system commands
#[allow(unused_imports)]
pub use system::{
    diagnose_database, force_wal_checkpoint, get_app_info, get_database_stats, get_device_info,
    health_check,
};

use crate::domains::clients::domain::models::client::ClientWithTasks;
use crate::domains::tasks::domain::models::task::*;

pub use crate::domains::users::application::{
    CreateUserRequest, UpdateUserRequest, UserAction, UserListResponse, UserResponse,
};
use crate::domains::clients::domain::models::client::Client;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, instrument, warn};

// Import client types from models
use crate::domains::clients::infrastructure::client::ClientStats;
use crate::domains::clients::domain::models::client::{
    ClientListResponse, ClientQuery, CreateClientRequest, UpdateClientRequest,
};

/// Task action types for CRUD operations
#[derive(Deserialize, Debug)]
#[serde(tag = "action")]
pub enum TaskAction {
    Create { data: CreateTaskRequest },
    Get { id: String },
    Update { id: String, data: UpdateTaskRequest },
    Delete { id: String },
    List { filters: TaskQuery },
    GetStatistics,
}

/// Task response types
#[derive(Serialize)]
#[serde(tag = "type")]
pub enum TaskResponse {
    Created(Task),
    Found(Task),
    Updated(Task),
    Deleted,
    NotFound,
    List(TaskListResponse),
    Statistics(crate::domains::tasks::ipc::task_types::TaskStatistics),
}

/// Client action types for CRUD operations
#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "action")]
pub enum ClientAction {
    Create {
        data: CreateClientRequest,
    },
    Get {
        id: String,
    },
    GetWithTasks {
        id: String,
    },
    Update {
        id: String,
        data: UpdateClientRequest,
    },
    Delete {
        id: String,
    },
    List {
        filters: ClientQuery,
    },
    ListWithTasks {
        filters: ClientQuery,
        limit_tasks: Option<i32>,
    },
    Search {
        query: String,
        limit: i32,
    },
    Stats,
}

/// Client response types
#[derive(Serialize)]
#[serde(tag = "type")]
pub enum ClientResponse {
    Created(Client),
    Found(Client),
    FoundWithTasks(ClientWithTasks),
    Updated(Client),
    Deleted,
    NotFound,
    List(ClientListResponse),
    ListWithTasks(Vec<ClientWithTasks>),
    SearchResults(Vec<Client>),
    Stats(ClientStats),
}

/// Helper function to create a tracked command handler with automatic performance monitoring
#[macro_export]
macro_rules! tracked_command {
    ($command_name:expr, $handler:expr) => {
        |state: AppState, request: serde_json::Value| async move {
            // Extract user ID from session token if available
            let user_id = if let Ok(session_token) = serde_json::from_value::<String>(
                request
                    .get("session_token")
                    .cloned()
                    .unwrap_or(serde_json::Value::Null),
            ) {
                // Try to get user from auth service
                state
                    .auth_service
                    .validate_session(&session_token)
                    .await
                    .ok()
                    .and_then(|session| session.map(|s| s.user_id))
            } else {
                None
            };

            // Start performance tracking
            let _timer = state
                .command_performance_tracker
                .start_tracking($command_name, user_id);

            // Execute the actual handler
            $handler(state, request).await
        }
    };
}

/// Internal user CRUD handler
pub async fn user_crud(
    action: UserAction,
    session_token: String,
    state: AppState<'_>,
) -> Result<UserResponse, AppError> {
    let request = crate::domains::users::ipc::user::UserCrudRequest {
        action,
        session_token,
        correlation_id: None,
    };

    let response = crate::domains::users::ipc::user::user_crud(request, state).await?;
    response
        .data
        .ok_or_else(|| AppError::Internal("Missing user_crud response payload".to_string()))
}

/// Get database status
#[tauri::command]
#[instrument(skip(state))]
pub fn get_database_status(state: AppState) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Database status requested");

    let status =
        crate::shared::services::system::SystemService::get_database_status(&state.db).map_err(|e| {
            error!("Failed to get database status: {}", e);
            AppError::Database(e)
        })?;

    debug!("Database status retrieved successfully");
    Ok(ApiResponse::success(status))
}

/// Get database connection pool statistics
#[tauri::command]
#[instrument(skip(state))]
pub fn get_database_pool_stats(
    state: AppState,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Database pool statistics requested");

    let db = &state.db;

    let pool_stats = db.get_detailed_pool_stats();

    // Log current pool stats for monitoring
    db.log_pool_stats();

    debug!("Database pool statistics retrieved successfully");
    Ok(ApiResponse::success(pool_stats))
}

/// Get database connection pool health metrics
#[tauri::command]
#[instrument(skip(state))]
pub fn get_database_pool_health(
    state: AppState,
) -> Result<ApiResponse<crate::db::PoolHealth>, AppError> {
    debug!("Database pool health requested");

    let health = state.db.get_pool_health();

    // Log health metrics for monitoring
    if health.utilization_percentage > 80.0 {
        warn!(
            "High database connection pool utilization: {:.1}% (active: {}, max: {})",
            health.utilization_percentage, health.connections_active, health.max_connections
        );
    }

    debug!("Database pool health retrieved successfully");
    Ok(ApiResponse::success(health))
}

/// Test command for compressed responses (returns large dataset)
#[tauri::command]
#[instrument(skip(_state))]
pub fn get_large_test_data(_state: AppState) -> Result<CompressedApiResponse, AppError> {
    debug!("Large test data requested");

    // Generate a large dataset to test compression
    let large_data: Vec<TestItem> = (0..1000).map(|i| TestItem {
        id: i,
        name: format!("Test Item {}", i),
        description: format!("This is a description for test item {} with some additional text to make it larger", i),
        data: vec![i as u8; 100], // 100 bytes per item
    }).collect();

    let response = ApiResponse::success(large_data);
    response.to_compressed_if_large()
}

/// Test data structure for compression testing
#[derive(Serialize, Deserialize, Debug)]
pub struct TestItem {
    pub id: i32,
    pub name: String,
    pub description: String,
    pub data: Vec<u8>,
}

/// Vacuum database
#[tauri::command]
#[instrument(skip(state))]
pub fn vacuum_database(state: AppState) -> Result<ApiResponse<()>, AppError> {
    info!("Database vacuum operation requested");

    let db = &state.db;
    db.vacuum().map_err(|e| {
        error!("Database vacuum failed: {}", e);
        AppError::Database(e.to_string())
    })?;

    info!("Database vacuum completed successfully");
    Ok(ApiResponse::success(()))
}

/// Client request structure
#[derive(Deserialize, Debug)]
pub struct ClientCrudRequest {
    pub action: ClientAction,
    pub session_token: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_response_success_has_correlation_id_by_default() {
        let response: ApiResponse<String> = ApiResponse::success("test data".to_string());
        assert!(response.success);
        assert!(response.correlation_id.is_some());
        assert_eq!(response.data.as_deref(), Some("test data"));
    }

    #[test]
    fn test_api_response_error_has_correlation_id_by_default() {
        let response: ApiResponse<String> =
            ApiResponse::error(AppError::Validation("bad input".to_string()));
        assert!(!response.success);
        assert!(response.correlation_id.is_some());
        assert!(response.error.is_some());
    }

    #[test]
    fn test_api_response_with_correlation_id() {
        let corr_id = "req-abc123-0001-xyz".to_string();
        let response: ApiResponse<String> =
            ApiResponse::success("data".to_string()).with_correlation_id(Some(corr_id.clone()));
        assert!(response.success);
        assert_eq!(
            response.correlation_id.as_deref(),
            Some("req-abc123-0001-xyz")
        );
    }

    #[test]
    fn test_api_response_error_with_correlation_id() {
        let corr_id = "req-test-0002-abc".to_string();
        let response: ApiResponse<String> =
            ApiResponse::error(AppError::NotFound("missing".to_string()))
                .with_correlation_id(Some(corr_id.clone()));
        assert!(!response.success);
        assert_eq!(
            response.correlation_id.as_deref(),
            Some("req-test-0002-abc")
        );
        assert!(response.error.is_some());
    }

    #[test]
    fn test_api_response_with_none_correlation_id() {
        let response: ApiResponse<i32> = ApiResponse::success(42).with_correlation_id(None);
        assert!(response.success);
        assert!(response.correlation_id.is_some());
    }

    #[test]
    fn test_api_response_error_message_with_correlation_id() {
        let response: ApiResponse<String> = ApiResponse::error_message("something went wrong")
            .with_correlation_id(Some("ipc-12345-6789".to_string()));
        assert!(!response.success);
        assert_eq!(response.correlation_id.as_deref(), Some("ipc-12345-6789"));
        assert_eq!(response.error.as_ref().unwrap().code, "UNKNOWN");
    }

    #[test]
    fn test_api_response_from_app_result_ok() {
        let result: AppResult<String> = Ok("hello".to_string());
        let response: ApiResponse<String> = result.into();
        assert!(response.success);
        assert!(response.correlation_id.is_some());
    }

    #[test]
    fn test_api_response_from_app_result_err() {
        let result: AppResult<String> = Err(AppError::Internal("server error".to_string()));
        let response: ApiResponse<String> = result.into();
        assert!(!response.success);
        assert!(response.correlation_id.is_some());
    }

    #[test]
    fn test_api_response_serialization_includes_correlation_id() {
        let response: ApiResponse<String> = ApiResponse::success("test".to_string())
            .with_correlation_id(Some("req-ser-0001-abc".to_string()));
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"correlation_id\":\"req-ser-0001-abc\""));
    }

    #[test]
    fn test_api_response_serialization_includes_generated_correlation_id() {
        let response: ApiResponse<String> = ApiResponse::success("test".to_string());
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"correlation_id\":\""));
    }
}
