//! Notification settings operations
//!
//! This module handles user notification preferences including
//! email, push, and SMS notification settings.

use crate::commands::settings::core::{
    handle_settings_error, load_app_settings, update_app_settings,
};
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
    #[serde(default)]
    pub correlation_id: Option<String>,
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
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub digest_frequency: Option<String>,
    pub batch_notifications: Option<bool>,
    pub sound_enabled: Option<bool>,
    pub sound_volume: Option<u32>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Update notification settings (system-wide)
#[tauri::command]

pub async fn update_notification_settings(
    request: UpdateNotificationSettingsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating notification settings");

    let correlation_id = request.correlation_id.clone();
    let user = authenticate!(&request.session_token, &state);

    // Only admins can update system notification settings
    if !matches!(user.role, crate::models::auth::UserRole::Admin) {
        return Err(AppError::Authorization(
            "Only administrators can update notification settings".to_string(),
        ));
    }

    let mut app_settings = load_app_settings().map_err(|e| AppError::Database(e))?;

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
        .map(|_| ApiResponse::success("Notification settings updated successfully".to_string()).with_correlation_id(correlation_id.clone()))
        .map_err(|e| AppError::Database(e))
}

/// Update user notification settings
#[tauri::command]

pub async fn update_user_notifications(
    request: UpdateUserNotificationsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating user notification settings");

    let correlation_id = request.correlation_id.clone();
    let user = authenticate!(&request.session_token, &state);

    let mut notification_settings: UserNotificationSettings = state
        .settings_service
        .get_user_settings(&user.id)
        .map_err(|e| handle_settings_error(e, "Load user notification settings"))?
        .notifications;

    if let Some(value) = request.email_enabled {
        notification_settings.email_enabled = value;
    }
    if let Some(value) = request.push_enabled {
        notification_settings.push_enabled = value;
    }
    if let Some(value) = request.in_app_enabled {
        notification_settings.in_app_enabled = value;
    }
    if let Some(value) = request.task_assigned {
        notification_settings.task_assigned = value;
    }
    if let Some(value) = request.task_updated {
        notification_settings.task_updated = value;
    }
    if let Some(value) = request.task_completed {
        notification_settings.task_completed = value;
    }
    if let Some(value) = request.task_overdue {
        notification_settings.task_overdue = value;
    }
    if let Some(value) = request.system_alerts {
        notification_settings.system_alerts = value;
    }
    if let Some(value) = request.maintenance {
        notification_settings.maintenance = value;
    }
    if let Some(value) = request.security_alerts {
        notification_settings.security_alerts = value;
    }
    if let Some(value) = request.quiet_hours_enabled {
        notification_settings.quiet_hours_enabled = value;
    }
    if let Some(value) = request.quiet_hours_start {
        notification_settings.quiet_hours_start = value;
    }
    if let Some(value) = request.quiet_hours_end {
        notification_settings.quiet_hours_end = value;
    }
    if let Some(value) = request.digest_frequency {
        notification_settings.digest_frequency = value;
    }
    if let Some(value) = request.batch_notifications {
        notification_settings.batch_notifications = value;
    }
    if let Some(value) = request.sound_enabled {
        notification_settings.sound_enabled = value;
    }
    if let Some(value) = request.sound_volume {
        notification_settings.sound_volume = value;
    }

    state
        .settings_service
        .update_user_notifications(&user.id, &notification_settings)
        .map(|_| ApiResponse::success("Notification settings updated successfully".to_string()).with_correlation_id(correlation_id.clone()))
        .map_err(|e| handle_settings_error(e, "Update user notifications"))
}
