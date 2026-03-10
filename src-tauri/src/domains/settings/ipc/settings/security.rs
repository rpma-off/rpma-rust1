//! Security and authentication settings operations
//!
//! This module handles security-related settings including
//! authentication configuration, password policies, and security preferences.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::settings::domain::models::settings::UserSecuritySettings;
use crate::domains::settings::ipc::settings::core::{handle_settings_error, settings_user_id};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;

use tracing::info;

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
    let ctx = resolve_context!(&request.session_token, &state, &request.correlation_id, UserRole::Admin);
    info!("Updating security settings");

    let mut app_settings = state
        .settings_service
        .get_app_settings_db()
        .map_err(|e| handle_settings_error(e, "Load app settings"))?;

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

    state
        .settings_service
        .save_app_settings_db(&app_settings, settings_user_id(&ctx.auth))
        .map(|_| {
            ApiResponse::success("Security settings updated successfully".to_string())
                .with_correlation_id(Some(ctx.correlation_id.clone()))
        })
        .map_err(|e| handle_settings_error(e, "Update security settings"))
}

/// Update user security settings
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn update_user_security(
    request: UpdateUserSecurityRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&request.session_token, &state, &request.correlation_id);
    info!("Updating user security settings");

    let mut security_settings: UserSecuritySettings = state
        .settings_service
        .get_user_settings(settings_user_id(&ctx.auth))
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
        .update_user_security(settings_user_id(&ctx.auth), &security_settings)
        .map(|_| {
            ApiResponse::success("Security settings updated successfully".to_string())
                .with_correlation_id(Some(ctx.correlation_id.clone()))
        })
        .map_err(|e| handle_settings_error(e, "Update user security"))
}
