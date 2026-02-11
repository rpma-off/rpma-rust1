//! Notification commands for Tauri

use crate::commands::AppState;
use crate::models::notification::{
    EmailConfig, EmailProvider, NotificationChannel, NotificationConfig, NotificationType,
    SmsConfig, SmsProvider, TemplateVariables,
};
use crate::services::notification::NotificationService;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
// Conditional import removed
use ts_rs::TS;

lazy_static! {
    static ref NOTIFICATION_SERVICE: Arc<Mutex<Option<NotificationService>>> =
        Arc::new(Mutex::new(None));
}

#[derive(Debug, Serialize, Deserialize, TS)]
pub struct SendNotificationRequest {
    pub user_id: String,
    pub notification_type: NotificationType,
    pub recipient: String, // email or phone
    pub variables: TemplateVariables,
}

#[derive(Debug, Serialize, Deserialize, TS)]
pub struct UpdateNotificationConfigRequest {
    pub email_provider: Option<String>,
    pub email_api_key: Option<String>,
    pub email_from_email: Option<String>,
    pub email_from_name: Option<String>,
    pub sms_provider: Option<String>,
    pub sms_api_key: Option<String>,
    pub sms_from_number: Option<String>,
    pub push_enabled: Option<bool>,
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub timezone: Option<String>,
}

/// Initialize the notification service with configuration
#[tauri::command]
pub async fn initialize_notification_service(
    config: UpdateNotificationConfigRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<(), String> {
    // Validate session
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;

    let email_config = if let (Some(provider), Some(api_key), Some(from_email), Some(from_name)) = (
        config.email_provider,
        config.email_api_key,
        config.email_from_email,
        config.email_from_name,
    ) {
        let email_provider = match provider.as_str() {
            "sendgrid" => EmailProvider::SendGrid,
            "mailgun" => EmailProvider::Mailgun,
            "smtp" => EmailProvider::Smtp,
            _ => return Err("Invalid email provider".to_string()),
        };

        Some(EmailConfig {
            provider: email_provider,
            api_key,
            from_email,
            from_name,
        })
    } else {
        None
    };

    let sms_config = if let (Some(provider), Some(api_key), Some(from_number)) = (
        config.sms_provider,
        config.sms_api_key,
        config.sms_from_number,
    ) {
        let sms_provider = match provider.as_str() {
            "twilio" => SmsProvider::Twilio,
            "aws_sns" => SmsProvider::AwsSns,
            _ => return Err("Invalid SMS provider".to_string()),
        };

        Some(SmsConfig {
            provider: sms_provider,
            api_key,
            from_number,
        })
    } else {
        None
    };

    let notification_config = NotificationConfig {
        email: email_config,
        sms: sms_config,
        push_enabled: config.push_enabled.unwrap_or(true),
        quiet_hours_start: config.quiet_hours_start,
        quiet_hours_end: config.quiet_hours_end,
        timezone: config
            .timezone
            .unwrap_or_else(|| "Europe/Paris".to_string()),
    };

    let service = NotificationService::new(notification_config);
    let mut global_service = NOTIFICATION_SERVICE.lock().await;
    *global_service = Some(service);

    Ok(())
}

/// Send a notification
#[tauri::command]
pub async fn send_notification(
    request: SendNotificationRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<(), String> {
    // Validate session
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;

    let service_guard = NOTIFICATION_SERVICE.lock().await;
    let service = service_guard
        .as_ref()
        .ok_or("Notification service not initialized")?;

    service
        .send_notification(
            request.user_id,
            request.notification_type,
            request.recipient,
            request.variables,
        )
        .await
}

/// Test notification configuration
#[tauri::command]
pub async fn test_notification_config(
    recipient: String,
    channel: NotificationChannel,
    session_token: String,
    state: AppState<'_>,
) -> Result<String, String> {
    // Validate session
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;

    let service_guard = NOTIFICATION_SERVICE.lock().await;
    let service = service_guard
        .as_ref()
        .ok_or("Notification service not initialized")?;

    let test_variables = TemplateVariables {
        user_name: Some("Test User".to_string()),
        task_title: Some("Test Task".to_string()),
        task_id: Some("TEST-001".to_string()),
        client_name: Some("Test Client".to_string()),
        due_date: Some("2024-12-31".to_string()),
        status: Some("Pending".to_string()),
        priority: Some("High".to_string()),
        assignee_name: Some("Test Assignee".to_string()),
        system_message: Some("This is a test notification".to_string()),
    };

    let notification_type = match channel {
        NotificationChannel::Email => NotificationType::SystemAlert,
        NotificationChannel::Sms => NotificationType::SystemAlert,
        NotificationChannel::Push => {
            return Err("Push notifications not implemented yet".to_string())
        }
    };

    service
        .send_notification(
            "test-user".to_string(),
            notification_type,
            recipient,
            test_variables,
        )
        .await?;

    Ok("Test notification sent successfully".to_string())
}

/// Get notification service status
#[tauri::command]
pub async fn get_notification_status(
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, String> {
    // Validate session
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;

    let service_guard = NOTIFICATION_SERVICE.lock().await;
    let _is_initialized = service_guard.is_some();

    let config = if let Some(service) = service_guard.as_ref() {
        let config = service.get_config().await;
        serde_json::json!({
            "initialized": true,
            "email_configured": config.email.is_some(),
            "sms_configured": config.sms.is_some(),
            "push_enabled": config.push_enabled,
            "quiet_hours_start": config.quiet_hours_start,
            "quiet_hours_end": config.quiet_hours_end,
            "timezone": config.timezone
        })
    } else {
        serde_json::json!({
            "initialized": false
        })
    };

    Ok(config)
}
