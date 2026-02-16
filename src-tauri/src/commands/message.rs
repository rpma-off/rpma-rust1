use crate::commands::{ApiError, AppState};
use crate::models::message::*;

/// Send a new message
#[tauri::command]
pub async fn message_send(
    request: SendMessageRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<Message, ApiError> {
    let _correlation_id = request.correlation_id.clone();
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

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
    session_token: String,
    state: AppState<'_>,
) -> Result<MessageListResponse, ApiError> {
    let _correlation_id = query.correlation_id.clone();
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

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
pub async fn message_mark_read(
    message_id: String,
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<(), ApiError> {
    let _correlation_id = correlation_id;
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

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
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<Vec<MessageTemplate>, ApiError> {
    let _correlation_id = correlation_id;
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

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
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<NotificationPreferences, ApiError> {
    let _correlation_id = correlation_id;
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

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
    session_token: String,
    state: AppState<'_>,
) -> Result<NotificationPreferences, ApiError> {
    let _correlation_id = updates.correlation_id.clone();
    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

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
