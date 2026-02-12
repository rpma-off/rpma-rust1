use crate::commands::{ApiError, AppState};
use crate::models::status::{StatusDistribution, StatusTransitionRequest};
use crate::models::task::Task;

/// Transition a task to a new status with validation
#[tauri::command]
pub async fn task_transition_status(
    request: StatusTransitionRequest,
    state: AppState<'_>,
) -> Result<Task, ApiError> {
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
    state: AppState<'_>,
) -> Result<StatusDistribution, ApiError> {
    state
        .task_service
        .get_status_distribution()
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        })
}
