use crate::commands::{ApiError, AppState};
use crate::models::status::{StatusDistribution, StatusTransitionRequest};
use crate::models::task::Task;
use tracing;

/// Transition a task to a new status with validation
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn task_transition_status(
    session_token: String,
    request: StatusTransitionRequest,
    state: AppState<'_>,
) -> Result<Task, ApiError> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    let auth_service = state.auth_service.clone();
    let current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state
        .task_service
        .transition_status(
            &request.task_id,
            &request.new_status,
            request.reason.as_deref(),
        )
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "TRANSITION_ERROR".to_string(),
            details: None,
        })
}

/// Get status distribution for all tasks
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn task_get_status_distribution(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<StatusDistribution, ApiError> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let auth_service = state.auth_service.clone();
    let current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| ApiError {
            message: format!("Authentication failed: {}", e),
            code: "AUTH_ERROR".to_string(),
            details: None,
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state.task_service.get_status_distribution().map_err(
        |e: crate::shared::ipc::errors::AppError| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        },
    )
}
