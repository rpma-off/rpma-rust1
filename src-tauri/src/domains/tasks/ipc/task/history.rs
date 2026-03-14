//! Task history IPC commands

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::domain::models::task::TaskHistory;
use crate::resolve_context;
use serde::Deserialize;
use tracing::{debug, info};

/// TODO: document
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct GetTaskHistoryRequest {
    pub task_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
/// ADR-018: Thin IPC layer
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn get_task_history(
    request: GetTaskHistoryRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<TaskHistory>>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Getting task history");

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

    Ok(ApiResponse::success(history).with_correlation_id(Some(ctx.correlation_id.clone())))
}
