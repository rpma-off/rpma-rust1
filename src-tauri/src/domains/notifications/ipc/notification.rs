//! Notification commands for Tauri
//!
//! Only in-app notifications are functional. External delivery channels
//! (Push/Email/SMS) are not implemented — see the in-app notification and
//! message sub-modules for the working notification surface.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;
use crate::domains::notifications::application::UpdateNotificationConfigRequest;
use crate::domains::notifications::domain::models::notification::NotificationConfig;
use crate::domains::notifications::infrastructure::notification::NotificationService;
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, instrument};

lazy_static! {
    static ref NOTIFICATION_SERVICE: Arc<Mutex<Option<NotificationService>>> =
        Arc::new(Mutex::new(None));
}

/// Initialize the notification service with configuration.
///
/// Only in-app notification configuration is stored. External delivery
/// channels are not implemented.
#[tauri::command]
#[instrument(skip(config, state))]
pub async fn initialize_notification_service(
    config: UpdateNotificationConfigRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &config.correlation_id);

    let notification_config = NotificationConfig {
        email: None,
        sms: None,
        push_enabled: false,
        quiet_hours_start: config.quiet_hours_start.clone(),
        quiet_hours_end: config.quiet_hours_end.clone(),
        timezone: config
            .timezone
            .clone()
            .unwrap_or_else(|| "Europe/Paris".to_string()),
    };

    let service = NotificationService::new(notification_config);
    let mut global_service = NOTIFICATION_SERVICE.lock().await;
    *global_service = Some(service);

    info!("Notification service initialized (in-app only)");
    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get notification service status.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_notification_status(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let service_guard = NOTIFICATION_SERVICE.lock().await;

    let config = if service_guard.is_some() {
        serde_json::json!({
            "initialized": true,
            "channels": ["in_app"],
        })
    } else {
        serde_json::json!({
            "initialized": false
        })
    };

    Ok(ApiResponse::success(config).with_correlation_id(Some(ctx.correlation_id)))
}
