//! Security and authentication settings operations
//!
//! This module handles security-related settings including
//! authentication configuration, password policies, and security preferences.

use crate::commands::settings::core::{
    authenticate_user, handle_settings_error, load_app_settings, update_app_settings,
};
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::settings::UserSecuritySettings;

use serde::Deserialize;
use tracing::info;

#[derive(Deserialize)]
pub struct UpdateUserSecurityRequest {
    pub session_token: String,
    pub two_factor_enabled: Option<bool>,
    pub session_timeout: Option<u32>,
}

#[derive(Deserialize)]
pub struct UpdateSecuritySettingsRequest {
    pub session_token: String,
    pub two_factor_enabled: Option<bool>,
    pub session_timeout: Option<u32>,
    pub password_min_length: Option<u8>,
    pub password_require_special_chars: Option<bool>,
    pub password_require_numbers: Option<bool>,
    pub login_attempts_max: Option<u8>,
}

/// Update security settings (system-wide)
#[tauri::command]

pub async fn update_security_settings(
    request: UpdateSecuritySettingsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating security settings");

    let user = authenticate_user(&request.session_token, &state)?;

    // Only admins can update system security settings
    if !matches!(user.role, crate::models::auth::UserRole::Admin) {
        return Err(AppError::Authorization(
            "Only administrators can update security settings".to_string(),
        ));
    }

    let mut app_settings = load_app_settings().map_err(|e| AppError::Database(e))?;

    if let Some(two_factor_enabled) = request.two_factor_enabled {
        app_settings.security.two_factor_enabled = two_factor_enabled;
    }
    if let Some(session_timeout) = request.session_timeout {
        app_settings.security.session_timeout = session_timeout;
    }
    if let Some(password_min_length) = request.password_min_length {
        app_settings.security.password_min_length = password_min_length;
    }
    if let Some(password_require_special_chars) = request.password_require_special_chars {
        app_settings.security.password_require_special_chars = password_require_special_chars;
    }
    if let Some(password_require_numbers) = request.password_require_numbers {
        app_settings.security.password_require_numbers = password_require_numbers;
    }
    if let Some(login_attempts_max) = request.login_attempts_max {
        app_settings.security.login_attempts_max = login_attempts_max;
    }

    update_app_settings(app_settings)
        .map(|_| ApiResponse::success("Security settings updated successfully".to_string()))
        .map_err(|e| AppError::Database(e))
}

/// Update user security settings
#[tauri::command]

pub async fn update_user_security(
    request: UpdateUserSecurityRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating user security settings");

    let user = authenticate_user(&request.session_token, &state)?;

    let mut security_settings: UserSecuritySettings = state
        .settings_service
        .get_user_settings(&user.id)
        .map_err(|e| handle_settings_error(e, "Load user security settings"))?
        .security;

    if let Some(value) = request.two_factor_enabled {
        security_settings.two_factor_enabled = value;
    }
    if let Some(value) = request.session_timeout {
        security_settings.session_timeout = value;
    }

    state
        .settings_service
        .update_user_security(&user.id, &security_settings)
        .map(|_| ApiResponse::success("Security settings updated successfully".to_string()))
        .map_err(|e| handle_settings_error(e, "Update user security"))
}
