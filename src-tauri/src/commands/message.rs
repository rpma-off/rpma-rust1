use tracing;
use crate::commands::{ApiError, AppState};
use crate::models::message::*;

/// Send a new message
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_send(
    request: SendMessageRequest,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<Message, ApiError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_list(
    query: MessageQuery,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<MessageListResponse, ApiError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_mark_read(
    message_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<(), ApiError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_templates(
    category: Option<String>,
    message_type: Option<String>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<Vec<MessageTemplate>, ApiError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_preferences(
    user_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<NotificationPreferences, ApiError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_update_preferences(
    user_id: String,
    updates: UpdateNotificationPreferencesRequest,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<NotificationPreferences, ApiError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let auth_service = state.auth_service.clone();
    let _current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
