//! Task draft persistence IPC commands.
//!
//! Three thin Tauri commands that replace the localStorage workaround in
//! `useTaskForm.ts`:
//! - `task_draft_save`   — upsert draft JSON for the calling user
//! - `task_draft_get`    — retrieve draft JSON (returns null if absent)
//! - `task_draft_delete` — remove draft after successful submission

use serde::Deserialize;
use tracing::{debug, instrument};

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::infrastructure::task_draft_repository::TaskDraftRepository;
use crate::resolve_context;

/// Request body for saving a draft.
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct TaskDraftSaveRequest {
    /// Serialised TaskFormData JSON string.
    pub form_data: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request body for getting / deleting a draft (no extra fields needed).
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct TaskDraftRequest {
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Upsert the calling user's task draft.
#[tauri::command]
#[instrument(skip(state))]
pub async fn task_draft_save(
    request: TaskDraftSaveRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let user_id = ctx.user_id().to_string();

    debug!(user_id = %user_id, "task_draft_save");
    let repo = TaskDraftRepository::new(state.db.clone());
    match repo.save(&user_id, &request.form_data) {
        Ok(()) => Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id))),
        Err(e) => Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id))),
    }
}

/// Retrieve the calling user's task draft JSON (null if none).
#[tauri::command]
#[instrument(skip(state))]
pub async fn task_draft_get(
    request: TaskDraftRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<String>>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let user_id = ctx.user_id().to_string();

    debug!(user_id = %user_id, "task_draft_get");
    let repo = TaskDraftRepository::new(state.db.clone());
    match repo.get(&user_id) {
        Ok(data) => Ok(ApiResponse::success(data).with_correlation_id(Some(correlation_id))),
        Err(e) => Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id))),
    }
}

/// Delete the calling user's task draft (called after successful submission).
#[tauri::command]
#[instrument(skip(state))]
pub async fn task_draft_delete(
    request: TaskDraftRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let user_id = ctx.user_id().to_string();

    debug!(user_id = %user_id, "task_draft_delete");
    let repo = TaskDraftRepository::new(state.db.clone());
    match repo.delete(&user_id) {
        Ok(()) => Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id))),
        Err(e) => Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id))),
    }
}
