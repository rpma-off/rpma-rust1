//! In-app notification commands for Tauri

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::notifications::application::notification_in_app::NotificationInAppService;
use crate::domains::notifications::domain::models::notification::Notification;
use serde::{Deserialize, Serialize};
use tracing::{error, info, instrument};

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

/// Get notifications for the current user
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn get_notifications(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<GetNotificationsResponse>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let app_service =
        NotificationInAppService::new(state.db.clone(), state.repositories.cache.clone());
    let notifications = app_service
        .find_by_user(&current_user.user_id, 50)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to get notifications");
            AppError::Database("Failed to get notifications".to_string())
        })?;

    let unread_count = app_service
        .count_unread(&current_user.user_id)
        .await
        .unwrap_or(0);

    info!(
        user_id = %current_user.user_id,
        count = notifications.len(),
        unread = unread_count,
        "Retrieved notifications"
    );

    Ok(ApiResponse::success(GetNotificationsResponse {
        notifications,
        unread_count,
    })
    .with_correlation_id(Some(correlation_id)))
}

/// Mark a notification as read
#[tauri::command]
#[instrument(skip(state, session_token), fields(notification_id = %id))]
pub async fn mark_notification_read(
    id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let _current_user = authenticate!(&session_token, &state);

    let app_service =
        NotificationInAppService::new(state.db.clone(), state.repositories.cache.clone());
    app_service.mark_read(&id).await.map_err(|e| {
        error!(error = %e, notification_id = %id, "Failed to mark notification as read");
        AppError::Database("Failed to mark notification as read".to_string())
    })?;

    info!(notification_id = %id, "Notification marked as read");

    Ok(ApiResponse::success(SuccessResponse { success: true })
        .with_correlation_id(Some(correlation_id)))
}

/// Mark all notifications as read for the current user
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn mark_all_notifications_read(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let app_service =
        NotificationInAppService::new(state.db.clone(), state.repositories.cache.clone());
    app_service.mark_all_read(&current_user.user_id).await.map_err(|e| {
        error!(error = %e, user_id = %current_user.user_id, "Failed to mark all notifications as read");
        AppError::Database("Failed to mark all notifications as read".to_string())
    })?;

    info!(user_id = %current_user.user_id, "All notifications marked as read");

    Ok(ApiResponse::success(SuccessResponse { success: true })
        .with_correlation_id(Some(correlation_id)))
}

/// Delete a notification
#[tauri::command]
#[instrument(skip(state, session_token), fields(notification_id = %id))]
pub async fn delete_notification(
    id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let _current_user = authenticate!(&session_token, &state);

    let app_service =
        NotificationInAppService::new(state.db.clone(), state.repositories.cache.clone());
    app_service.delete(&id).await.map_err(|e| {
        error!(error = %e, notification_id = %id, "Failed to delete notification");
        AppError::Database("Failed to delete notification".to_string())
    })?;

    info!(notification_id = %id, "Notification deleted");

    Ok(ApiResponse::success(SuccessResponse { success: true })
        .with_correlation_id(Some(correlation_id)))
}

/// Create a notification (used by other domains)
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn create_notification(
    request: CreateNotificationRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Notification>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    let user_id = request.user_id.clone();
    let notification_type = request.r#type.clone();

    let notification = Notification::new(
        user_id.clone(),
        notification_type.clone(),
        request.title,
        request.message,
        request.entity_type,
        request.entity_id,
        request.entity_url,
    );

    let app_service =
        NotificationInAppService::new(state.db.clone(), state.repositories.cache.clone());
    let created = app_service.save(notification).await.map_err(|e| {
        error!(error = %e, user_id = %user_id, "Failed to create notification");
        AppError::Database("Failed to create notification".to_string())
    })?;

    info!(
        user_id = %user_id,
        notification_type = %notification_type,
        notification_id = %created.id,
        "Notification created"
    );

    Ok(ApiResponse::success(created).with_correlation_id(Some(correlation_id)))
}
