//! Core settings operations and shared utilities
//!
//! This module provides the foundation for settings operations,
//! including shared utilities, authentication helpers, and common patterns.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::settings::{AppSettings, SystemConfiguration};

use std::sync::Mutex;

// Global settings storage (in production, this would be persisted to database/file)
static APP_SETTINGS: Mutex<Option<AppSettings>> = Mutex::new(None);
static SYSTEM_CONFIG: Mutex<Option<SystemConfiguration>> = Mutex::new(None);

/// Initialize app settings from database or defaults
pub fn initialize_app_settings() -> Result<(), String> {
    // This would load settings from database in a real implementation
    Ok(())
}

/// Get app settings with lazy initialization
pub fn load_app_settings() -> Result<AppSettings, String> {
    let mut settings = APP_SETTINGS.lock().map_err(|_| "Failed to lock app settings")?;

    if settings.is_none() {
        // Initialize with defaults - in production this would load from DB
        *settings = Some(AppSettings::default());
    }

    settings.clone().ok_or_else(|| "Failed to get app settings".to_string())
}

/// Update app settings
pub fn update_app_settings(new_settings: AppSettings) -> Result<(), String> {
    let mut settings = APP_SETTINGS.lock().map_err(|_| "Failed to lock app settings")?;
    *settings = Some(new_settings);
    Ok(())
}

/// Get app settings (command)
#[tauri::command]
pub async fn get_app_settings(
    session_token: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    if let Some(token) = session_token {
        if !token.is_empty() {
            // Require a valid session when token is provided.
            authenticate_user(&token, &state)?;
        }
    }

    let settings = load_app_settings().map_err(AppError::Database)?;
    Ok(ApiResponse::success(settings))
}

/// Get system configuration with lazy initialization
pub fn get_system_config() -> Result<SystemConfiguration, String> {
    let mut config = SYSTEM_CONFIG.lock().map_err(|_| "Failed to lock system config")?;

    if config.is_none() {
        // Initialize with defaults - in production this would load from DB
        *config = Some(SystemConfiguration::default());
    }

    config.clone().ok_or_else(|| "Failed to get system config".to_string())
}

/// Update system configuration
pub fn update_system_config(new_config: SystemConfiguration) -> Result<(), String> {
    let mut config = SYSTEM_CONFIG.lock().map_err(|_| "Failed to lock system config")?;
    *config = Some(new_config);
    Ok(())
}

/// Common authentication helper for settings operations
pub fn authenticate_user(session_token: &str, state: &AppState) -> Result<crate::models::auth::UserSession, AppError> {
    state.auth_service.validate_session(session_token)
        .map_err(|e| AppError::Authentication(format!("Session validation failed: {}", e)))
}

/// Validate settings update permissions
pub fn validate_settings_permissions(user: &crate::models::auth::UserSession, required_role: crate::models::auth::UserRole) -> Result<(), AppError> {
    if !matches!(user.role, crate::models::auth::UserRole::Admin) && user.role != required_role {
        return Err(AppError::Authorization("Insufficient permissions to modify settings".to_string()));
    }
    Ok(())
}

/// Common error handling for settings operations
pub fn handle_settings_error<E: std::fmt::Display>(error: E, operation: &str) -> AppError {
    tracing::error!("Settings operation '{}' failed: {}", operation, error);
    AppError::Database(format!("{} failed: {}", operation, error))
}
