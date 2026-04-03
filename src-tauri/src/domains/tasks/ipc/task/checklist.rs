//! Task checklist item IPC commands.
//!
//! Exposes three thin Tauri commands (ADR-018):
//! - `task_checklist_items_get`  — list all items for a task
//! - `task_checklist_item_update` — toggle completion state
//! - `task_checklist_item_create` — add a new item
//!
//! All business logic is delegated to the application-layer
//! [`TaskChecklistService`] so that IPC handlers remain thin adapters.

use serde::{Deserialize, Serialize};
use tracing::{debug, error, instrument};

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::application::services::task_checklist_service::TaskChecklistService;
use crate::domains::tasks::domain::models::task::{
    ChecklistItem, CreateChecklistItemRequest, UpdateChecklistItemRequest,
};
use crate::resolve_context;

// ---------------------------------------------------------------------------
// Helper: construct a per-request application service from shared state
// ---------------------------------------------------------------------------

/// Build a [`TaskChecklistService`] from the shared `AppState`.
fn checklist_service(state: &AppState<'_>) -> TaskChecklistService {
    TaskChecklistService::new(state.db.clone())
}

/// Wrap a synchronous service result in an [`ApiResponse`] with the given
/// correlation ID, logging the error message when the call fails.
///
/// All three checklist handlers share this pattern verbatim.  Extracting it
/// here means the error-logging strategy can be changed in one place.
fn into_response<T: Serialize>(
    result: Result<T, AppError>,
    correlation_id: &str,
    error_context: &str,
) -> Result<ApiResponse<T>, AppError> {
    match result {
        Ok(val) => Ok(ApiResponse::success(val).with_correlation_id(Some(correlation_id.to_owned()))),
        Err(e) => {
            error!(error = %e, "{}", error_context);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.to_owned())))
        }
    }
}

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

/// Request to list checklist items for a task.
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct TaskChecklistItemsGetRequest {
    pub task_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request to update a single checklist item.
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct TaskChecklistItemUpdateRequest {
    pub item_id: String,
    pub task_id: String,
    pub data: UpdateChecklistItemRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request to create a new checklist item.
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct TaskChecklistItemCreateRequest {
    pub data: CreateChecklistItemRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

// ---------------------------------------------------------------------------
// IPC command handlers (thin adapters — ADR-018)
// ---------------------------------------------------------------------------

/// List all checklist items for a task.
#[tauri::command]
#[instrument(skip(state))]
pub async fn task_checklist_items_get(
    request: TaskChecklistItemsGetRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<ChecklistItem>>, AppError> {
    debug!(task_id = %request.task_id, "task_checklist_items_get");
    let ctx = resolve_context!(&state, &request.correlation_id);

    let service = checklist_service(&state);
    into_response(
        service.list_for_task(&request.task_id),
        &ctx.correlation_id,
        "Failed to list checklist items",
    )
}

/// Toggle the completion state of a checklist item.
#[tauri::command]
#[instrument(skip(state))]
pub async fn task_checklist_item_update(
    request: TaskChecklistItemUpdateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ChecklistItem>, AppError> {
    debug!(item_id = %request.item_id, task_id = %request.task_id, "task_checklist_item_update");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let user_id = ctx.user_id().to_string();

    let service = checklist_service(&state);
    into_response(
        service.update_item(&request.item_id, &request.task_id, &user_id, request.data),
        &ctx.correlation_id,
        "Failed to update checklist item",
    )
}

/// Create a new checklist item for a task.
#[tauri::command]
#[instrument(skip(state))]
pub async fn task_checklist_item_create(
    request: TaskChecklistItemCreateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ChecklistItem>, AppError> {
    debug!(task_id = %request.data.task_id, "task_checklist_item_create");
    let ctx = resolve_context!(&state, &request.correlation_id);

    let service = checklist_service(&state);
    into_response(
        service.create_item(request.data),
        &ctx.correlation_id,
        "Failed to create checklist item",
    )
}
