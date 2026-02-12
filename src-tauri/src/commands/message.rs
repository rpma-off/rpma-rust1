use crate::commands::{ApiError, AppState};
use crate::models::message::*;

/// Send a new message
#[tauri::command]
pub async fn message_send(
    request: SendMessageRequest,
    state: AppState<'_>,
) -> Result<Message, ApiError> {
    state
        .message_service
        .send_message(&request)
        .await
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "SEND_ERROR".to_string(),
            details: None,
        })
}

/// Get messages with filtering and pagination
#[tauri::command]
pub async fn message_get_list(
    query: MessageQuery,
    state: AppState<'_>,
) -> Result<MessageListResponse, ApiError> {
    state
        .message_service
        .get_messages(&query)
        .await
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        })
}

/// Mark message as read
#[tauri::command]
pub async fn message_mark_read(message_id: String, state: AppState<'_>) -> Result<(), ApiError> {
    state
        .message_service
        .mark_read(&message_id)
        .await
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "UPDATE_ERROR".to_string(),
            details: None,
        })
}

/// Get message templates
#[tauri::command]
pub async fn message_get_templates(
    category: Option<String>,
    message_type: Option<String>,
    state: AppState<'_>,
) -> Result<Vec<MessageTemplate>, ApiError> {
    state
        .message_service
        .get_templates(category.as_deref(), message_type.as_deref())
        .await
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        })
}

/// Get user notification preferences
#[tauri::command]
pub async fn message_get_preferences(
    user_id: String,
    state: AppState<'_>,
) -> Result<NotificationPreferences, ApiError> {
    state
        .message_service
        .get_preferences(&user_id)
        .await
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "FETCH_ERROR".to_string(),
            details: None,
        })
}

/// Update user notification preferences
#[tauri::command]
pub async fn message_update_preferences(
    user_id: String,
    updates: UpdateNotificationPreferencesRequest,
    state: AppState<'_>,
) -> Result<NotificationPreferences, ApiError> {
    state
        .message_service
        .update_preferences(&user_id, &updates)
        .await
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "UPDATE_ERROR".to_string(),
            details: None,
        })
}
