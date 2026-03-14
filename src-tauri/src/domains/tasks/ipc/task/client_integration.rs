//! Task-client relationship management
//!
//! ADR-018: Thin IPC layer — business logic delegated to
//! [`TaskClientService`](crate::domains::tasks::application::services::task_client_service::TaskClientService).

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::application::services::task_client_service::TaskClientService;
use crate::domains::tasks::domain::models::task::Task;
use crate::domains::tasks::ipc::task_types::TaskFilter;

use crate::resolve_context;
use serde::Deserialize;
use tracing::debug;

/// Request for getting tasks with detailed client information
#[derive(Deserialize, Debug)]
pub struct TasksWithClientsRequest {
    pub filter: Option<TaskFilter>,
    pub include_client_details: Option<bool>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Enhanced task with client details
#[derive(serde::Serialize, Debug)]
pub struct TaskWithClientDetails {
    pub task: Task,
    pub client_name: String,
    pub client_contact: Option<String>,
    pub client_region: Option<String>,
    pub client_priority: Option<String>,
    pub relationship_status: String,
}

/// Construct a per-request [`TaskClientService`] from shared application state.
fn client_service(state: &AppState<'_>) -> TaskClientService {
    TaskClientService::new(state.task_service.clone(), state.client_service.clone())
}

/// Get tasks with comprehensive client information
/// ADR-018: Thin IPC layer — delegated to TaskClientService
#[tracing::instrument(skip(state))]
pub async fn get_tasks_with_client_details(
    request: TasksWithClientsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<TaskWithClientDetails>>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Getting tasks with detailed client information");

    let enhanced_tasks = client_service(&state)
        .get_tasks_with_client_details(
            request.filter,
            request.include_client_details.unwrap_or(false),
            request.page,
            request.limit,
            &ctx,
        )
        .await?;

    Ok(ApiResponse::success(enhanced_tasks).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Validate task-client relationship
/// ADR-018: Thin IPC layer — delegated to TaskClientService
pub async fn validate_task_client_relationship(
    task_id: &str,
    client_id: &str,
    state: &AppState<'_>,
) -> Result<(), AppError> {
    client_service(state)
        .validate_task_client_relationship(task_id, client_id)
        .await
}

/// Get client task summary
/// ADR-018: Thin IPC layer — permission check delegated to TaskClientService
#[tracing::instrument(skip(state))]
pub async fn get_client_task_summary(
    client_id: &str,
    state: &AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<crate::shared::services::cross_domain::ClientStat>, AppError> {
    let ctx = resolve_context!(state, &correlation_id);
    debug!("Getting task summary for client {}", client_id);

    TaskClientService::check_client_data_permission(&ctx.auth.role)?;

    let summary = state
        .client_service
        .get_client_task_summary(client_id)
        .await
        .map_err(|e| {
            debug!("Failed to get client task summary: {}", e);
            AppError::db_sanitized("get_client_task_summary", &e)
        })?;

    Ok(ApiResponse::success(summary).with_correlation_id(Some(ctx.correlation_id.clone())))
}
