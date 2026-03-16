//! Tauri commands module
//!
//! This module contains all Tauri commands for IPC communication
//! between the frontend and backend.

pub mod correlation_helpers;
pub mod error_utils;
pub mod errors;
pub mod log;
pub mod navigation;
pub mod system;
pub mod ui;
pub mod user {
    pub use crate::domains::users::ipc::user::{
        bootstrap_first_admin, has_admins, user_crud, BootstrapFirstAdminRequest, UserCrudRequest,
    };
}
pub mod client {
    pub use crate::domains::clients::client_handler::ClientCrudRequest;
    pub use crate::domains::clients::client_handler::client_crud;
}
pub mod auth {
    use crate::shared::app_state::AppState;
    use crate::shared::ipc::{ApiResponse, AppError};
    use serde::Deserialize;

    pub use crate::domains::auth::ipc::auth::{
        auth_create_account, auth_login, auth_logout, auth_validate_session, LoginRequest,
        SignupRequest,
    };

    #[derive(Debug, Deserialize)]
    pub struct RefreshTokenRequest {
        pub refresh_token: String,
        #[serde(default)]
        pub correlation_id: Option<String>,
    }

/// ADR-018: Thin IPC layer
#[tracing::instrument(skip(_state))]
    #[tauri::command]
    pub async fn auth_refresh_token(
        _request: RefreshTokenRequest,
        _state: AppState<'_>,
    ) -> Result<ApiResponse<crate::domains::auth::domain::models::auth::UserSession>, AppError>
    {
        Ok(ApiResponse::error(AppError::Validation(
            "Token refresh is not supported in this build".to_string(),
        )))
    }
}

pub mod inventory {
    pub use crate::domains::inventory::domain::models::material::{
        Material, MaterialType, UnitOfMeasure,
    };
    pub use crate::domains::inventory::infrastructure::material::{
        CreateMaterialRequest, RecordConsumptionRequest, UpdateStockRequest,
    };
    pub use crate::domains::inventory::ipc::material::{
        material_create, material_delete, material_get, material_list,
    };
}

pub mod quote {
    pub use crate::domains::quotes::application::QuoteCreateRequest;
    pub use crate::domains::quotes::ipc::quote::quote_create;
}

pub use crate::shared::app_state::{AppState, AppStateType};
pub use crate::shared::contracts::auth::UserRole;
pub use crate::shared::ipc::response::ApiResponse;
pub use correlation_helpers::*;
pub use errors::{AppError, AppResult};
use crate::resolve_context;

// Re-export system commands
#[allow(unused_imports)]
pub use system::{
    diagnose_database, force_wal_checkpoint, get_app_info, get_database_stats, get_device_info,
    health_check, system_health_check,
};

use crate::domains::clients::client_handler::{Client, ClientWithTasks};
use crate::domains::tasks::domain::models::task::*;
pub use crate::domains::users::application::{UserAction, UserResponse};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, instrument, warn};

// Import client types from models
use crate::domains::clients::client_handler::{
    ClientListResponse, ClientQuery, ClientStats, CreateClientRequest, UpdateClientRequest,
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
    ListWithTasks { data: Vec<ClientWithTasks> },
    SearchResults { data: Vec<Client> },
    Stats(ClientStats),
}

/// Internal user CRUD handler
pub async fn user_crud(
    action: UserAction,
    state: AppState<'_>,
) -> Result<UserResponse, AppError> {
    let request = crate::domains::users::ipc::user::UserCrudRequest {
        action,
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
pub async fn get_database_status(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    debug!("Database status requested");

    let status = crate::shared::services::system::SystemService::get_database_status(&state.db)
        .map_err(|e| {
            error!("Failed to get database status: {}", e);
            AppError::Database(e)
        })?;

    debug!("Database status retrieved successfully");
    Ok(ApiResponse::success(status).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get database connection pool statistics
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_database_pool_stats(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    debug!("Database pool statistics requested");

    let db = &state.db;

    let pool_stats = db.get_detailed_pool_stats();

    // Log current pool stats for monitoring
    db.log_pool_stats();

    debug!("Database pool statistics retrieved successfully");
    Ok(ApiResponse::success(pool_stats).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get database connection pool health metrics
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_database_pool_health(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<crate::db::PoolHealth>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
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
    Ok(ApiResponse::success(health).with_correlation_id(Some(ctx.correlation_id)))
}

/// Vacuum database
#[tauri::command]
#[instrument(skip(state))]
pub async fn vacuum_database(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    info!("Database vacuum operation requested");

    let db = &state.db;
    db.vacuum().map_err(|e| {
        error!("Database vacuum failed: {}", e);
        AppError::Database(e.to_string())
    })?;

    info!("Database vacuum completed successfully");
    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
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
