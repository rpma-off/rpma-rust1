//! Task history IPC commands

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::domain::models::task::TaskHistory;
use serde::Deserialize;
use tracing::{debug, info};

#[derive(Deserialize, Debug)]
pub struct GetTaskHistoryRequest {
    pub session_token: String,
    pub task_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn get_task_history(
    request: GetTaskHistoryRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<TaskHistory>>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    debug!("Getting task history");

    let session = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);

    let task = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?;

    if task.is_none() {
        return Err(AppError::NotFound(format!(
            "Task not found: {}",
            request.task_id
        )));
    }

    let history = state
        .repositories
        .task_history
        .find_by_task_id(request.task_id.clone())
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch task history: {}", e)))?;

    info!("Retrieved {} history entries for task", history.len());

    Ok(ApiResponse::success(history).with_correlation_id(Some(correlation_id)))
}
