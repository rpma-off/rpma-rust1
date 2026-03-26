//! Unified notifications handler: repositories, services, helpers, and IPC commands.

pub mod helper;
pub mod event_handler;
pub mod message_repository;
pub mod message_service;
pub mod notification_repository;
pub mod notification_service;
pub mod preferences_repository;
pub mod template_repository;

pub use helper::*;
pub use event_handler::*;
pub use message_repository::*;
pub use message_service::*;
pub use notification_repository::*;
pub use notification_service::*;
pub use preferences_repository::*;
pub use template_repository::*;

use serde::{Deserialize, Serialize};
use tracing::{error, info, instrument};
use ts_rs::TS;

use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;

use super::models::*;

// ── IPC command structs ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct UpdateNotificationConfigRequest {
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub timezone: Option<String>,
    pub correlation_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetNotificationsResponse {
    pub notifications: Vec<Notification>,
    pub unread_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SuccessResponse {
    pub success: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub user_id: String,
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub entity_type: String,
    pub entity_id: String,
    pub entity_url: String,
    pub correlation_id: Option<String>,
}

// ── IPC commands ──────────────────────────────────────────────────────────────
//
// Each command authenticates the caller, then delegates to `NotificationsFacade`
// — direct use of `NotificationRepository` or `MessageService` is forbidden here.

fn notifications_facade(state: &AppState<'_>) -> super::facade::NotificationsFacade {
    super::facade::NotificationsFacade::new(
        state.db.clone(),
        state.repositories.cache.clone(),
        state.message_service.clone(),
        state.event_bus.clone(),
    )
}

/// ADR-018: Thin IPC layer
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_send(
    request: SendMessageRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Message>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let msg = notifications_facade(&state).send_message(&request).await?;
    Ok(ApiResponse::success(msg).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_list(
    query: MessageQuery,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<MessageListResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let list = notifications_facade(&state).get_messages(&query).await?;
    Ok(ApiResponse::success(list).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_mark_read(
    message_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    notifications_facade(&state)
        .mark_message_read(&message_id)
        .await?;
    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_templates(
    category: Option<String>,
    message_type: Option<String>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<MessageTemplate>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let templates = notifications_facade(&state)
        .get_message_templates(category.as_deref(), message_type.as_deref())
        .await?;
    Ok(ApiResponse::success(templates).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_preferences(
    _user_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<NotificationPreferences>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let prefs = notifications_facade(&state)
        .get_preferences(&ctx.auth.user_id)
        .await?;
    Ok(ApiResponse::success(prefs).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_update_preferences(
    _user_id: String,
    updates: UpdateNotificationPreferencesRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<NotificationPreferences>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let prefs = notifications_facade(&state)
        .update_preferences(&ctx.auth.user_id, &updates)
        .await?;
    Ok(ApiResponse::success(prefs).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(config, state))]
pub async fn initialize_notification_service(
    config: UpdateNotificationConfigRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &config.correlation_id);
    NotificationService::initialize_global(NotificationConfig {
        quiet_hours_start: config.quiet_hours_start,
        quiet_hours_end: config.quiet_hours_end,
        timezone: config.timezone.unwrap_or_else(|| "Europe/Paris".to_string()),
    })
    .await;
    info!("Notification service initialized (in-app only)");
    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_notification_status(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let status = NotificationService::get_global_status().await;
    Ok(ApiResponse::success(status).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_notifications(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<GetNotificationsResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let result = notifications_facade(&state)
        .get_notifications(&ctx.auth.user_id, 50)
        .await
        .map_err(|e: AppError| {
            error!(error = %e, "Failed to get notifications");
            e
        })?;
    info!(
        user_id = %ctx.auth.user_id,
        count = result.notifications.len(),
        unread = result.unread_count,
        "Retrieved notifications"
    );
    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state), fields(notification_id = %id))]
pub async fn mark_notification_read(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    notifications_facade(&state)
        .mark_notification_read(&id)
        .await
        .map_err(|e| {
            error!(error = %e, notification_id = %id, "Failed to mark as read");
            e
        })?;
    info!(notification_id = %id, "Notification marked as read");
    Ok(ApiResponse::success(SuccessResponse { success: true })
        .with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn mark_all_notifications_read(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    notifications_facade(&state)
        .mark_all_notifications_read(&ctx.auth.user_id)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to mark all as read");
            e
        })?;
    info!(user_id = %ctx.auth.user_id, "All notifications marked as read");
    Ok(ApiResponse::success(SuccessResponse { success: true })
        .with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state), fields(notification_id = %id))]
pub async fn delete_notification(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    notifications_facade(&state)
        .delete_notification(&id)
        .await
        .map_err(|e| {
            error!(error = %e, notification_id = %id, "Failed to delete");
            e
        })?;
    info!(notification_id = %id, "Notification deleted");
    Ok(ApiResponse::success(SuccessResponse { success: true })
        .with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state, request))]
pub async fn create_notification(
    request: CreateNotificationRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Notification>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    let user_id = request.user_id.clone();
    let notification_type = request.r#type.clone();
    let created = notifications_facade(&state)
        .create_notification_from_parts(
            user_id.clone(),
            notification_type.clone(),
            request.title,
            request.message,
            request.entity_type,
            request.entity_id,
            request.entity_url,
        )
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %user_id, "Failed to create notification");
            e
        })?;
    info!(
        user_id = %user_id,
        notification_type = %notification_type,
        notification_id = %created.id,
        "Notification created"
    );
    Ok(ApiResponse::success(created).with_correlation_id(Some(ctx.correlation_id)))
}

/// Send a notification — accepts the TS-exported `SendNotificationRequest` shape.
///
/// ADR-018: Thin IPC layer. Delegates to `create_notification` logic via the shared facade.
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn send_notification(
    request: crate::domains::notifications::models::SendNotificationRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Notification>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    let user_id = request.user_id.clone();
    let notification_type = request.notification_type.clone();
    let created = notifications_facade(&state)
        .create_notification_from_parts(
            user_id.clone(),
            notification_type.clone(),
            request.title,
            request.message,
            request.entity_type,
            request.entity_id,
            request.entity_url,
        )
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %user_id, "Failed to send notification");
            e
        })?;
    info!(
        user_id = %user_id,
        notification_type = %notification_type,
        notification_id = %created.id,
        "Notification sent"
    );
    Ok(ApiResponse::success(created).with_correlation_id(Some(ctx.correlation_id)))
}
