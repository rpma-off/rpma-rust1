use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;
use crate::domains::notifications::domain::models::message::*;
use tracing;

/// Send a new message
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_send(
    request: SendMessageRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Message>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let msg = state
        .message_service
        .send_message(&request)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(ApiResponse::success(msg).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get messages with filtering and pagination
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_list(
    query: MessageQuery,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<MessageListResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let list = state
        .message_service
        .get_messages(&query)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(ApiResponse::success(list).with_correlation_id(Some(ctx.correlation_id)))
}

/// Mark message as read
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_mark_read(
    message_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    state
        .message_service
        .mark_read(&message_id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get message templates
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_templates(
    category: Option<String>,
    message_type: Option<String>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<MessageTemplate>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let templates = state
        .message_service
        .get_templates(category.as_deref(), message_type.as_deref())
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(ApiResponse::success(templates).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get user notification preferences
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_preferences(
    user_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<NotificationPreferences>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let prefs = state
        .message_service
        .get_preferences(&user_id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(ApiResponse::success(prefs).with_correlation_id(Some(ctx.correlation_id)))
}

/// Update user notification preferences
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_update_preferences(
    user_id: String,
    updates: UpdateNotificationPreferencesRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<NotificationPreferences>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let prefs = state
        .message_service
        .update_preferences(&user_id, &updates)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(ApiResponse::success(prefs).with_correlation_id(Some(ctx.correlation_id)))
}
