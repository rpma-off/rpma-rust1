//! User preferences settings operations
//!
//! This module handles user interface and behavior preferences
//! including appearance, general settings, and performance preferences.

use crate::commands::settings::core::{authenticate_user, handle_settings_error, update_app_settings, get_app_settings};
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
pub struct UpdateAppearanceSettingsRequest {
    pub session_token: String,
    pub theme: Option<String>,
    pub font_size: Option<String>,
    pub color_scheme: Option<String>,
    pub sidebar_position: Option<String>,
    pub compact_mode: Option<bool>,
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
        return Err(AppError::Authorization("Only administrators can update general settings".to_string()));
    }

    let mut app_settings = get_app_settings()
        .map_err(|e| AppError::Database(e))?;

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

/// Update appearance settings
#[tauri::command]

pub async fn update_appearance_settings(
    request: UpdateAppearanceSettingsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating appearance settings");

    let user = authenticate!(&request.session_token, &state);

    // Only admins can update system-wide appearance settings
    if !matches!(user.role, crate::models::auth::UserRole::Admin) {
        return Err(AppError::Authorization("Only administrators can update appearance settings".to_string()));
    }

    let mut app_settings = get_app_settings()
        .map_err(|e| AppError::Database(e))?;

    if let Some(theme) = request.theme {
        app_settings.appearance.dark_mode = theme == "dark";
    }
    if let Some(color_scheme) = request.color_scheme {
        app_settings.appearance.primary_color = color_scheme;
    }
    if let Some(font_size) = request.font_size {
        app_settings.appearance.font_size = font_size;
    }
    if let Some(compact_mode) = request.compact_mode {
        app_settings.appearance.compact_view = compact_mode;
    }

    update_app_settings(app_settings)
        .map(|_| ApiResponse::success("Appearance settings updated successfully".to_string()))
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

    let preferences = UserPreferences {
        email_notifications: request.email_notifications.unwrap_or(true),
        push_notifications: request.push_notifications.unwrap_or(true),
        task_assignments: request.task_assignments.unwrap_or(true),
        task_updates: request.task_updates.unwrap_or(true),
        system_alerts: request.system_alerts.unwrap_or(true),
        weekly_reports: request.weekly_reports.unwrap_or(false),
        theme: request.theme.unwrap_or_else(|| "system".to_string()),
        language: request.language.unwrap_or_else(|| "en".to_string()),
        date_format: request.date_format.unwrap_or_else(|| "DD/MM/YYYY".to_string()),
        time_format: request.time_format.unwrap_or_else(|| "24h".to_string()),
        high_contrast: request.high_contrast.unwrap_or(false),
        large_text: request.large_text.unwrap_or(false),
        reduce_motion: request.reduce_motion.unwrap_or(false),
        screen_reader: request.screen_reader.unwrap_or(false),
        auto_refresh: request.auto_refresh.unwrap_or(true),
        refresh_interval: request.refresh_interval.unwrap_or(30)
    };

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