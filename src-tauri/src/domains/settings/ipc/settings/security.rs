//! Security and authentication settings operations
//!
//! This module handles security-related settings including
//! authentication configuration, password policies, and security preferences.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::settings::domain::models::settings::UserSecuritySettings;
use crate::domains::settings::ipc::settings::core::{
    handle_settings_error, load_app_settings, update_app_settings,
};

use tracing::info;

// Import authentication macros
use crate::authenticate;
use crate::domains::settings::application::{
    UpdateSecuritySettingsRequest, UpdateUserSecurityRequest,
};

/// Update security settings (system-wide)
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn update_security_settings(
    request: UpdateSecuritySettingsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating security settings");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&user.user_id);

    // Only admins can update system security settings
    if !matches!(user.role, crate::shared::contracts::auth::UserRole::Admin) {
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
        .map(|_| {
            ApiResponse::success("Security settings updated successfully".to_string())
                .with_correlation_id(Some(correlation_id.clone()))
        })
        .map_err(|e| AppError::Database(e))
}

/// Update user security settings
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn update_user_security(
    request: UpdateUserSecurityRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating user security settings");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&user.user_id);

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
        .map(|_| {
            ApiResponse::success("Security settings updated successfully".to_string())
                .with_correlation_id(Some(correlation_id.clone()))
        })
        .map_err(|e| handle_settings_error(e, "Update user security"))
}
