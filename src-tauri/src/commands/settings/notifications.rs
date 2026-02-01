//! Notification settings operations
//!
//! This module handles user notification preferences including
//! email, push, and SMS notification settings.

use crate::commands::settings::core::{handle_settings_error, update_app_settings, get_app_settings};
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::settings::UserNotificationSettings;

use serde::Deserialize;
use tracing::info;

// Import authentication macros
use crate::authenticate;

#[derive(Deserialize)]
pub struct UpdateNotificationSettingsRequest {
    pub session_token: String,
    pub push_notifications: Option<bool>,
    pub email_notifications: Option<bool>,
    pub sms_notifications: Option<bool>,
    pub task_assignments: Option<bool>,
    pub task_completions: Option<bool>,
    pub system_alerts: Option<bool>,
    pub daily_digest: Option<bool>,
}

#[derive(Deserialize)]
pub struct UpdateUserNotificationsRequest {
    pub session_token: String,
    pub email_enabled: Option<bool>,
    pub push_enabled: Option<bool>,
    pub in_app_enabled: Option<bool>,
    pub task_assigned: Option<bool>,
    pub task_updated: Option<bool>,
    pub task_completed: Option<bool>,
    pub task_overdue: Option<bool>,
    pub system_alerts: Option<bool>,
    pub maintenance: Option<bool>,
    pub security_alerts: Option<bool>,
    pub quiet_hours_enabled: Option<bool>,
    pub batch_notifications: Option<bool>,
}

/// Update notification settings (system-wide)
#[tauri::command]

pub async fn update_notification_settings(
    request: UpdateNotificationSettingsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating notification settings");

    let user = authenticate!(&request.session_token, &state);

    // Only admins can update system notification settings
    if !matches!(user.role, crate::models::auth::UserRole::Admin) {
        return Err(AppError::Authorization("Only administrators can update notification settings".to_string()));
    }

    let mut app_settings = get_app_settings()
        .map_err(|e| AppError::Database(e))?;

    if let Some(push_notifications) = request.push_notifications {
        app_settings.notifications.push_notifications = push_notifications;
    }
    if let Some(email_notifications) = request.email_notifications {
        app_settings.notifications.email_notifications = email_notifications;
    }
    if let Some(sms_notifications) = request.sms_notifications {
        app_settings.notifications.sms_notifications = sms_notifications;
    }
    if let Some(task_assignments) = request.task_assignments {
        app_settings.notifications.task_assignments = task_assignments;
    }
    if let Some(task_completions) = request.task_completions {
        app_settings.notifications.task_completions = task_completions;
    }
    if let Some(system_alerts) = request.system_alerts {
        app_settings.notifications.system_alerts = system_alerts;
    }
    if let Some(daily_digest) = request.daily_digest {
        app_settings.notifications.daily_digest = daily_digest;
    }

    update_app_settings(app_settings)
        .map(|_| ApiResponse::success("Notification settings updated successfully".to_string()))
        .map_err(|e| AppError::Database(e))
}

/// Update user notification settings
#[tauri::command]

pub async fn update_user_notifications(
    request: UpdateUserNotificationsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating user notification settings");

    let user = authenticate!(&request.session_token, &state);

    let notification_settings = UserNotificationSettings {
        email_enabled: request.email_enabled.unwrap_or(true),
        push_enabled: request.push_enabled.unwrap_or(true),
        in_app_enabled: request.in_app_enabled.unwrap_or(true),
        task_assigned: request.task_assigned.unwrap_or(true),
        task_updated: request.task_updated.unwrap_or(true),
        task_completed: request.task_completed.unwrap_or(false),
        task_overdue: request.task_overdue.unwrap_or(true),
        system_alerts: request.system_alerts.unwrap_or(true),
        maintenance: request.maintenance.unwrap_or(false),
        security_alerts: request.security_alerts.unwrap_or(true),
        quiet_hours_enabled: request.quiet_hours_enabled.unwrap_or(false),
        quiet_hours_start: "22:00".to_string(), // Default quiet hours
        quiet_hours_end: "08:00".to_string(),
        digest_frequency: "daily".to_string(), // Default digest frequency
        batch_notifications: request.batch_notifications.unwrap_or(false),
        sound_enabled: true, // Default sound enabled
        sound_volume: 50, // Default volume
    };

    state
        .settings_service
        .update_user_notifications(&user.id, &notification_settings)
        .map(|_| ApiResponse::success("Notification settings updated successfully".to_string()))
        .map_err(|e| handle_settings_error(e, "Update user notifications"))
}