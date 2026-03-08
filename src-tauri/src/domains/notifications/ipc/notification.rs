//! Notification commands for Tauri

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::notifications::application::{
    build_notification_config, SendNotificationRequest, UpdateNotificationConfigRequest,
};
use crate::domains::notifications::domain::models::notification::{
    NotificationChannel, NotificationType, TemplateVariables,
};
use crate::domains::notifications::infrastructure::notification::NotificationService;
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::sync::Mutex;
// Conditional import removed
use tracing::{error, info, instrument};

lazy_static! {
    static ref NOTIFICATION_SERVICE: Arc<Mutex<Option<NotificationService>>> =
        Arc::new(Mutex::new(None));
}

/// Initialize the notification service with configuration
#[tauri::command]
#[instrument(skip(config, state, session_token))]
pub async fn initialize_notification_service(
    config: UpdateNotificationConfigRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&config.correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Build config via application layer
    let notification_config = build_notification_config(&config).map_err(|e| {
        error!(error = %e, "Failed to build notification config");
        AppError::Validation(e)
    })?;

    let service = NotificationService::new(notification_config);
    let mut global_service = NOTIFICATION_SERVICE.lock().await;
    *global_service = Some(service);

    info!("Notification service initialized");
    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}

/// Send a notification
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id = %request.user_id))]
pub async fn send_notification(
    request: SendNotificationRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let service_guard = NOTIFICATION_SERVICE.lock().await;
    let service = service_guard.as_ref().ok_or(AppError::Configuration(
        "Notification service not initialized".to_string(),
    ))?;

    service
        .send_notification(
            request.user_id,
            request.notification_type,
            request.recipient,
            request.variables,
        )
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to send notification");
            AppError::Internal(e)
        })?;

    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}

/// Test notification configuration
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn test_notification_config(
    recipient: String,
    channel: NotificationChannel,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let service_guard = NOTIFICATION_SERVICE.lock().await;
    let service = service_guard.as_ref().ok_or(AppError::Configuration(
        "Notification service not initialized".to_string(),
    ))?;

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
            return Err(AppError::NotImplemented(
                "Push notifications not implemented yet".to_string(),
            ))
        }
    };

    service
        .send_notification(
            "test-user".to_string(),
            notification_type,
            recipient,
            test_variables,
        )
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to send test notification");
            AppError::Internal(e)
        })?;

    Ok(
        ApiResponse::success("Test notification sent successfully".to_string())
            .with_correlation_id(Some(correlation_id)),
    )
}

/// Get notification service status
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn get_notification_status(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

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

    Ok(ApiResponse::success(config).with_correlation_id(Some(correlation_id)))
}
