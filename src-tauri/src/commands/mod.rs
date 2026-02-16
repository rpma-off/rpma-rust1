//! Tauri commands module
//!
//! This module contains all Tauri commands for IPC communication
//! between the frontend and backend.

pub mod analytics;
pub mod auth;
pub mod auth_middleware;
pub mod calendar;
pub mod client;
pub mod compression;
pub mod error_utils;
pub mod errors;
pub mod intervention;
pub mod ipc_optimization;
pub mod log;
pub mod material;
pub mod navigation;
pub mod notification;
pub mod performance;
// pub mod photo; // Temporarily disabled - no photo.rs or photo/ directory
pub mod message;
pub mod queue;
pub mod quote;
pub mod reports;
pub mod security;
pub mod settings;
pub mod status;
pub mod streaming;
pub mod sync;
pub mod system;
pub mod task;
pub mod task_types;
pub mod ui;
pub mod user;
pub mod websocket;
pub mod websocket_commands;

pub use error_utils::*;
pub use errors::{AppError, AppResult};

// Re-export intervention commands
#[allow(unused_imports)]
pub use intervention::{
    intervention_advance_step, intervention_finalize, intervention_get,
    intervention_get_active_by_task, intervention_get_latest_by_task, intervention_get_progress,
    intervention_get_step, intervention_management, intervention_progress,
    intervention_save_step_progress, intervention_start, intervention_update,
    intervention_workflow,
};

// Re-export reports commands
#[allow(unused_imports)]
pub use reports::{
    cancel_report, export_intervention_report, export_report_data, get_client_analytics_report,
    get_material_usage_report, get_overview_report, get_quality_compliance_report,
    get_report_status, get_task_completion_report, get_technician_performance_report,
};

// Re-export notification commands
#[allow(unused_imports)]
pub use notification::{
    get_notification_status, initialize_notification_service, send_notification,
    test_notification_config,
};

// Re-export performance commands
#[allow(unused_imports)]
pub use performance::{
    cleanup_performance_metrics, clear_application_cache, configure_cache_settings,
    get_cache_statistics, get_performance_metrics, get_performance_stats,
};

// Re-export task validation commands

// Re-export calendar commands
#[allow(unused_imports)]
pub use calendar::{calendar_check_conflicts, calendar_get_tasks, calendar_schedule_task};

// Re-export material commands
pub use material::{
    inventory_get_stats, material_adjust_stock, material_create, material_create_category,
    material_create_inventory_transaction, material_create_supplier, material_delete, material_get,
    material_get_by_sku, material_get_consumption_history, material_get_expired,
    material_get_expired_materials, material_get_intervention_consumption,
    material_get_intervention_summary, material_get_inventory_movement_summary,
    material_get_low_stock, material_get_low_stock_materials, material_get_stats,
    material_get_transaction_history, material_list, material_list_categories,
    material_list_suppliers, material_record_consumption, material_update, material_update_stock,
};

// Re-export system commands
#[allow(unused_imports)]
pub use system::{
    diagnose_database, force_wal_checkpoint, get_app_info, get_database_stats, get_device_info,
    health_check,
};

// Re-export analytics commands
pub use analytics::analytics_get_summary;

use crate::db::Database;
use crate::models::auth::UserRole;
use crate::models::client::ClientWithTasks;
use crate::models::task::*;

use crate::models::Client;
use crate::services::{ClientService, SettingsService, TaskService};
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::State;
use tracing::{debug, error, info, instrument, warn};
// Conditional import removed
use ts_rs::TS;

// Import authentication macros
use crate::authenticate;

// Import client types from models
use crate::models::client::{
    ClientListResponse, ClientQuery, CreateClientRequest, UpdateClientRequest,
};
use crate::services::client::ClientStats;

// User request types
#[derive(TS, Deserialize, Debug)]
pub struct CreateUserRequest {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub password: String,
}

#[derive(TS, Deserialize, Debug)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

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
    Statistics(crate::commands::task_types::TaskStatistics),
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

/// User action types for CRUD operations
#[derive(TS, Deserialize, Debug)]
#[serde(tag = "action")]
pub enum UserAction {
    Create {
        data: CreateUserRequest,
    },
    Get {
        id: String,
    },
    Update {
        id: String,
        data: UpdateUserRequest,
    },
    Delete {
        id: String,
    },
    List {
        limit: Option<i32>,
        offset: Option<i32>,
    },
    ChangePassword {
        id: String,
        new_password: String,
    },
    ChangeRole {
        id: String,
        new_role: crate::models::auth::UserRole,
    },
    Ban {
        id: String,
    },
    Unban {
        id: String,
    },
}

/// User list response
#[derive(Serialize, TS)]
pub struct UserListResponse {
    pub data: Vec<crate::models::auth::UserAccount>,
}

/// User response types
#[derive(Serialize)]
#[serde(tag = "type")]
pub enum UserResponse {
    Created(crate::models::auth::UserAccount),
    Found(crate::models::auth::UserAccount),
    Updated(crate::models::auth::UserAccount),
    Deleted,
    NotFound,
    List(UserListResponse),
    PasswordChanged,
    RoleChanged,
    UserBanned,
    UserUnbanned,
}

/// App state containing database and services
pub struct AppStateType {
    pub db: Arc<Database>,
    pub async_db: Arc<crate::db::AsyncDatabase>,
    pub repositories: Arc<crate::repositories::Repositories>,
    pub task_service: Arc<TaskService>,
    pub client_service: Arc<ClientService>,
    pub task_import_service: Arc<crate::services::task_import::TaskImportService>,
    pub dashboard_service: Arc<crate::services::DashboardService>,
    pub intervention_service: Arc<crate::services::InterventionService>,
    pub material_service: Arc<crate::services::MaterialService>,
    pub message_service: Arc<crate::services::MessageService>,
    pub photo_service: Arc<crate::services::PhotoService>,
    pub quote_service: Arc<crate::services::QuoteService>,
    pub analytics_service: Arc<crate::services::AnalyticsService>,
    pub auth_service: Arc<crate::services::auth::AuthService>,
    pub session_service: Arc<crate::services::session::SessionService>,
    pub two_factor_service: Arc<crate::services::two_factor::TwoFactorService>,
    pub settings_service: Arc<SettingsService>,
    pub cache_service: Arc<crate::services::cache::CacheService>,
    pub report_job_service: OnceLock<Arc<crate::services::report_jobs::ReportJobService>>,
    pub performance_monitor_service:
        Arc<crate::services::performance_monitor::PerformanceMonitorService>,
    pub command_performance_tracker:
        Arc<crate::services::performance_monitor::CommandPerformanceTracker>,
    pub prediction_service: Arc<crate::services::prediction::PredictionService>,
    pub sync_queue: std::sync::Arc<crate::sync::SyncQueue>,
    pub background_sync: std::sync::Arc<Mutex<crate::sync::BackgroundSyncService>>,
    pub event_bus: std::sync::Arc<crate::services::event_bus::InMemoryEventBus>,
    pub app_data_dir: std::path::PathBuf,
}

pub type AppState<'a> = State<'a, AppStateType>;

impl AppStateType {
    pub fn report_job_service(&self) -> &Arc<crate::services::report_jobs::ReportJobService> {
        self.report_job_service.get_or_init(|| {
            Arc::new(crate::services::report_jobs::ReportJobService::new(
                self.db.clone(),
                self.cache_service.clone(),
            ))
        })
    }
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

/// Standard API response format
#[derive(TS, Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub message: String,
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "JsonValue | null")]
    pub details: Option<serde_json::Value>,
}

/// Compressed API response for large payloads
#[derive(TS, Debug, Serialize, Deserialize)]
pub struct CompressedApiResponse {
    pub success: bool,
    pub compressed: bool,
    pub data: Option<String>, // base64 encoded compressed data
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
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
            data: Some(data),
            error: None,
            correlation_id: None,
        }
    }

    pub fn error(error: AppError) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(ApiError {
                message: error.to_string(),
                code: error.code().to_string(),
                details: None,
            }),
            correlation_id: None,
        }
    }

    pub fn error_message(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(ApiError {
                message: message.to_string(),
                code: "UNKNOWN".to_string(),
                details: None,
            }),
            correlation_id: None,
        }
    }

    /// Set the correlation ID on this response for end-to-end tracing
    pub fn with_correlation_id(mut self, correlation_id: Option<String>) -> Self {
        self.correlation_id = correlation_id;
        self
    }

    /// Convert to compressed response if data is large
    pub fn to_compressed_if_large(self) -> Result<CompressedApiResponse, AppError>
    where
        T: Serialize,
    {
        // Check if data should be compressed (simple heuristic: if JSON > 1KB)
        let json_size = serde_json::to_string(&self.data)
            .map(|s| s.len())
            .unwrap_or(0);

        if json_size > 1024 {
            // Compress the data
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
                compressed: true,
                data: Some(compressed_b64),
                error: self.error,
                correlation_id: self.correlation_id,
            })
        } else {
            // Return uncompressed response
            Ok(CompressedApiResponse {
                success: self.success,
                compressed: false,
                data: self
                    .data
                    .map(|d| serde_json::to_string(&d).unwrap_or_default()),
                error: self.error,
                correlation_id: self.correlation_id,
            })
        }
    }

    /// Serialize to MessagePack format
    pub fn to_msgpack(&self) -> Result<Vec<u8>, AppError>
    where
        T: Serialize,
    {
        rmp_serde::to_vec(self)
            .map_err(|e| AppError::Internal(format!("MessagePack serialization error: {}", e)))
    }
}

impl CompressedApiResponse {
    /// Deserialize compressed data back to the original type
    pub fn decompress_data<T>(&self) -> Result<Option<T>, AppError>
    where
        T: for<'de> Deserialize<'de>,
    {
        match (&self.data, self.compressed) {
            (Some(data), true) => {
                // Decompress base64 encoded gzipped data
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
                // Uncompressed JSON data
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

/// Internal user CRUD handler
pub async fn user_crud(
    action: UserAction,
    session_token: String,
    state: AppState<'_>,
) -> Result<UserResponse, AppError> {
    let current_user = authenticate!(&session_token, &state);

    match action {
        UserAction::Create { data } => {
            if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
                return Err(AppError::Authorization(
                    "Only admins and supervisors can create users".to_string(),
                ));
            }
            let role = match data.role.as_str() {
                "admin" => UserRole::Admin,
                "technician" => UserRole::Technician,
                "supervisor" => UserRole::Supervisor,
                "viewer" => UserRole::Viewer,
                _ => return Err(AppError::Validation(format!("Invalid role: {}", data.role))),
            };
            let user = state
                .auth_service
                .create_account(
                    &data.email,
                    &data.email,
                    &data.first_name,
                    &data.last_name,
                    role,
                    &data.password,
                )
                .map_db_error("User creation")?;
            Ok(UserResponse::Created(user))
        }
        UserAction::Get { id } => {
            if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor)
                && current_user.user_id != id
            {
                return Err(AppError::Authorization(
                    "You can only view your own profile".to_string(),
                ));
            }
            let user = state
                .auth_service
                .get_user(&id)
                .map_db_error("User retrieval")?;
            match user {
                Some(user) => Ok(UserResponse::Found(user)),
                None => Ok(UserResponse::NotFound),
            }
        }
        UserAction::Update { id, data } => {
            if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor)
                && current_user.user_id != id
            {
                return Err(AppError::Authorization(
                    "You can only update your own profile".to_string(),
                ));
            }
            let role = match data.role.as_ref() {
                Some(r) => Some(match r.as_str() {
                    "admin" => UserRole::Admin,
                    "technician" => UserRole::Technician,
                    "supervisor" => UserRole::Supervisor,
                    "viewer" => UserRole::Viewer,
                    _ => return Err(AppError::Validation(format!("Invalid role: {}", r))),
                }),
                None => None,
            };
            let user = state
                .auth_service
                .update_user(
                    &id,
                    data.email.as_deref(),
                    data.first_name.as_deref(),
                    data.last_name.as_deref(),
                    role,
                    data.is_active,
                )
                .map_db_error("User update")?;
            Ok(UserResponse::Updated(user))
        }
        UserAction::Delete { id } => {
            if !matches!(current_user.role, UserRole::Admin) {
                return Err(AppError::Authorization(
                    "Only admins can delete users".to_string(),
                ));
            }
            if current_user.user_id == id {
                return Err(AppError::Validation(
                    "You cannot delete your own account".to_string(),
                ));
            }
            state
                .auth_service
                .delete_user(&id)
                .map_err(|e| AppError::Database(format!("User deletion failed: {}", e)))?;
            Ok(UserResponse::Deleted)
        }
        UserAction::List { limit, offset } => {
            if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
                return Err(AppError::Authorization(
                    "Only admins and supervisors can list users".to_string(),
                ));
            }
            let users = state
                .auth_service
                .list_users(limit, offset)
                .map_err(|e| AppError::Database(format!("User listing failed: {}", e)))?;
            Ok(UserResponse::List(UserListResponse { data: users }))
        }
        UserAction::ChangePassword { id, new_password } => {
            if !matches!(current_user.role, UserRole::Admin) && current_user.user_id != id {
                return Err(AppError::Authorization(
                    "You can only change your own password".to_string(),
                ));
            }
            state
                .auth_service
                .change_password(&id, &new_password)
                .map_err(|e| AppError::Database(format!("Password change failed: {}", e)))?;
            Ok(UserResponse::PasswordChanged)
        }
        UserAction::ChangeRole { id, new_role } => {
            if !matches!(current_user.role, UserRole::Admin) {
                return Err(AppError::Authorization(
                    "Only administrators can change user roles".to_string(),
                ));
            }
            if id == current_user.user_id {
                return Err(AppError::Validation(
                    "You cannot change your own role".to_string(),
                ));
            }
            // Use UserService to change role
            let user_service = crate::services::UserService::new(state.repositories.user.clone());
            user_service
                .change_role(&id, new_role, &current_user.user_id)
                .await?;
            Ok(UserResponse::RoleChanged)
        }
        UserAction::Ban { id } => {
            if !matches!(current_user.role, UserRole::Admin) {
                return Err(AppError::Authorization(
                    "Only administrators can ban users".to_string(),
                ));
            }
            if id == current_user.user_id {
                return Err(AppError::Validation("You cannot ban yourself".to_string()));
            }
            // Use UserService to ban user
            let user_service = crate::services::UserService::new(state.repositories.user.clone());
            user_service.ban_user(&id, &current_user.user_id).await?;
            Ok(UserResponse::UserBanned)
        }
        UserAction::Unban { id } => {
            if !matches!(current_user.role, UserRole::Admin) {
                return Err(AppError::Authorization(
                    "Only administrators can unban users".to_string(),
                ));
            }
            // Use UserService to unban user
            let user_service = crate::services::UserService::new(state.repositories.user.clone());
            user_service.unban_user(&id, &current_user.user_id).await?;
            Ok(UserResponse::UserUnbanned)
        }
    }
}

/// Health check command
/// Get database status
#[tauri::command]
#[instrument(skip(state))]
pub fn get_database_status(state: AppState) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Database status requested");

    let db = &state.db;
    let is_initialized = db.is_initialized().map_err(|e| {
        error!("Failed to check database initialization: {}", e);
        AppError::Database(e.to_string())
    })?;
    let tables = db.list_tables().map_err(|e| {
        error!("Failed to list database tables: {}", e);
        AppError::Database(e.to_string())
    })?;
    let version = db.get_version().map_err(|e| {
        error!("Failed to get database version: {}", e);
        AppError::Database(e.to_string())
    })?;

    debug!("Database status retrieved successfully");
    Ok(ApiResponse::success(serde_json::json!({
        "initialized": is_initialized,
        "tables": tables,
        "version": version
    })))
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

/// Get users list
#[tauri::command]
pub async fn get_users(
    page: i32,
    page_size: i32,
    _search: Option<String>,
    _role: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, String> {
    let limit = Some(page_size);
    let offset = Some((page - 1) * page_size);

    match user_crud(UserAction::List { limit, offset }, session_token, state)
        .await
        .map_err(|e| e.to_string())?
    {
        UserResponse::List(users) => Ok(serde_json::json!({
            "users": users.data,
            "total": users.data.len(),
            "page": page,
            "page_size": page_size
        })),
        _ => Err("Unexpected response".to_string()),
    }
}

/// Create user
#[tauri::command]
pub async fn create_user(
    user_data: CreateUserRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, String> {
    match user_crud(UserAction::Create { data: user_data }, session_token, state)
        .await
        .map_err(|e| e.to_string())?
    {
        UserResponse::Created(user) => Ok(serde_json::json!(user)),
        _ => Err("Failed to create user".to_string()),
    }
}

/// Update user
#[tauri::command]
pub async fn update_user(
    user_id: String,
    user_data: UpdateUserRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, String> {
    match user_crud(
        UserAction::Update {
            id: user_id,
            data: user_data,
        },
        session_token,
        state,
    )
    .await
    .map_err(|e| e.to_string())?
    {
        UserResponse::Updated(user) => Ok(serde_json::json!(user)),
        _ => Err("Failed to update user".to_string()),
    }
}

/// Update user status
#[tauri::command]
pub async fn update_user_status(
    user_id: String,
    is_active: bool,
    session_token: String,
    state: AppState<'_>,
) -> Result<(), String> {
    let update_data = UpdateUserRequest {
        email: None,
        first_name: None,
        last_name: None,
        role: None,
        is_active: Some(is_active),
    };

    match user_crud(
        UserAction::Update {
            id: user_id,
            data: update_data,
        },
        session_token,
        state,
    )
    .await
    .map_err(|e| e.to_string())?
    {
        UserResponse::Updated(_) => Ok(()),
        _ => Err("Failed to update user status".to_string()),
    }
}

/// Delete user
#[tauri::command]
pub async fn delete_user(
    user_id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<(), String> {
    match user_crud(UserAction::Delete { id: user_id }, session_token, state)
        .await
        .map_err(|e| e.to_string())?
    {
        UserResponse::Deleted => Ok(()),
        _ => Err("Failed to delete user".to_string()),
    }
}
