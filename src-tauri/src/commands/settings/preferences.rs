//! User preferences settings operations
//!
//! This module handles user interface and behavior preferences
//! including appearance, general settings, and performance preferences.

use crate::commands::settings::core::{
    authenticate_user, handle_settings_error, load_app_settings, update_app_settings,
};
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::settings::UserPreferences;

use serde::Deserialize;
use tracing::info;

// Import authentication macros
use crate::authenticate;

#[derive(Deserialize)]
pub struct UpdateGeneralSettingsRequest {
    pub session_token: String,
    pub auto_save: Option<bool>,
    pub language: Option<String>,
    pub timezone: Option<String>,
    pub date_format: Option<String>,
    pub currency: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateUserPreferencesRequest {
    pub session_token: String,
    pub email_notifications: Option<bool>,
    pub push_notifications: Option<bool>,
    pub task_assignments: Option<bool>,
    pub task_updates: Option<bool>,
    pub system_alerts: Option<bool>,
    pub weekly_reports: Option<bool>,
    pub theme: Option<String>,
    pub language: Option<String>,
    pub date_format: Option<String>,
    pub time_format: Option<String>,
    pub high_contrast: Option<bool>,
    pub large_text: Option<bool>,
    pub reduce_motion: Option<bool>,
    pub screen_reader: Option<bool>,
    pub auto_refresh: Option<bool>,
    pub refresh_interval: Option<u32>,
}

/// Update general settings (system-wide)
#[tauri::command]

pub async fn update_general_settings(
    request: UpdateGeneralSettingsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating general settings");

    let user = authenticate!(&request.session_token, &state);

    // Only admins can update system-wide settings
    if !matches!(user.role, crate::models::auth::UserRole::Admin) {
        return Err(AppError::Authorization(
            "Only administrators can update general settings".to_string(),
        ));
    }

    let mut app_settings = load_app_settings().map_err(|e| AppError::Database(e))?;

    if let Some(auto_save) = request.auto_save {
        app_settings.general.auto_save = auto_save;
    }
    if let Some(language) = request.language {
        app_settings.general.language = language;
    }
    if let Some(timezone) = request.timezone {
        app_settings.general.timezone = timezone;
    }
    if let Some(date_format) = request.date_format {
        app_settings.general.date_format = date_format;
    }
    if let Some(currency) = request.currency {
        app_settings.general.currency = currency;
    }

    update_app_settings(app_settings)
        .map(|_| ApiResponse::success("General settings updated successfully".to_string()))
        .map_err(|e| AppError::Database(e))
}

/// Update user preferences
#[tauri::command]

pub async fn update_user_preferences(
    request: UpdateUserPreferencesRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating user preferences");

    let user = authenticate_user(&request.session_token, &state)?;

    let mut preferences: UserPreferences = state
        .settings_service
        .get_user_settings(&user.id)
        .map_err(|e| handle_settings_error(e, "Load user preferences"))?
        .preferences;

    if let Some(value) = request.email_notifications {
        preferences.email_notifications = value;
    }
    if let Some(value) = request.push_notifications {
        preferences.push_notifications = value;
    }
    if let Some(value) = request.task_assignments {
        preferences.task_assignments = value;
    }
    if let Some(value) = request.task_updates {
        preferences.task_updates = value;
    }
    if let Some(value) = request.system_alerts {
        preferences.system_alerts = value;
    }
    if let Some(value) = request.weekly_reports {
        preferences.weekly_reports = value;
    }
    if let Some(value) = request.theme {
        preferences.theme = value;
    }
    if let Some(value) = request.language {
        preferences.language = value;
    }
    if let Some(value) = request.date_format {
        preferences.date_format = value;
    }
    if let Some(value) = request.time_format {
        preferences.time_format = value;
    }
    if let Some(value) = request.high_contrast {
        preferences.high_contrast = value;
    }
    if let Some(value) = request.large_text {
        preferences.large_text = value;
    }
    if let Some(value) = request.reduce_motion {
        preferences.reduce_motion = value;
    }
    if let Some(value) = request.screen_reader {
        preferences.screen_reader = value;
    }
    if let Some(value) = request.auto_refresh {
        preferences.auto_refresh = value;
    }
    if let Some(value) = request.refresh_interval {
        preferences.refresh_interval = value;
    }

    state
        .settings_service
        .update_user_preferences(&user.id, &preferences)
        .map(|_| ApiResponse::success("User preferences updated successfully".to_string()))
        .map_err(|e| handle_settings_error(e, "Update user preferences"))
}

/// Update user performance settings
#[tauri::command]

pub async fn update_user_performance(
    request: crate::models::settings::UserPerformanceSettings,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating user performance settings");

    let user = authenticate_user(&session_token, &state)?;

    state
        .settings_service
        .update_user_performance(&user.id, &request)
        .map(|_| ApiResponse::success("Performance settings updated successfully".to_string()))
        .map_err(|e| handle_settings_error(e, "Update user performance"))
}
