use crate::commands::{ApiError, AppState};
use crate::models::status::{StatusDistribution, StatusTransitionRequest};
use crate::models::task::Task;

/// Transition a task to a new status with validation
#[tauri::command]
pub async fn task_transition_status(
    session_token: String,
    request: StatusTransitionRequest,
    state: AppState<'_>,
) -> Result<Task, ApiError> {
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
#[tauri::command]
pub async fn task_get_status_distribution(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<StatusDistribution, ApiError> {
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
        .task_service
        .get_status_distribution()
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        })
}
