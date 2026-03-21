//! Task validation IPC commands — thin adapters (ADR-018).
//!
//! Each handler resolves context, builds the facade, and delegates to a
//! single facade method. All orchestration (RBAC, fetch, settings lookup)
//! lives inside the facade.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::domain::models::task::{
    AssignmentCheckResponse, AvailabilityCheckResponse, ValidationResult,
};
use crate::domains::tasks::TasksFacade;
use crate::resolve_context;
use tracing::{debug, info};

/// Request for checking task assignment eligibility
#[derive(serde::Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct CheckTaskAssignmentRequest {
    pub task_id: String,
    pub user_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for checking task availability
#[derive(serde::Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct CheckTaskAvailabilityRequest {
    pub task_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for validating task assignment changes
#[derive(serde::Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidateTaskAssignmentChangeRequest {
    pub task_id: String,
    pub old_user_id: Option<String>,
    pub new_user_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Construct a per-request [`TasksFacade`] from shared application state.
fn facade(state: &AppState<'_>) -> TasksFacade {
    TasksFacade::new(
        state.task_service.clone(),
        state.task_import_service.clone(),
    )
}

/// Check task assignment eligibility
/// ADR-018: Thin IPC layer — resolve context, delegate to facade
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn check_task_assignment(
    request: CheckTaskAssignmentRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<AssignmentCheckResponse>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Checking task assignment eligibility");

    let response = facade(&state)
        .check_assignment(&ctx, &request.task_id, &request.user_id)
        .await?;

    info!(
        "Task assignment check completed for task {} and user {}",
        request.task_id, request.user_id
    );

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Check task availability
/// ADR-018: Thin IPC layer — resolve context, delegate to facade
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn check_task_availability(
    request: CheckTaskAvailabilityRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<AvailabilityCheckResponse>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Checking task availability");

    let response = facade(&state)
        .check_availability(&request.task_id)
        .await?;

    info!(
        "Task availability check completed for task {}",
        request.task_id
    );

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Validate task assignment change
/// ADR-018: Thin IPC layer — resolve context, delegate to facade
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn validate_task_assignment_change(
    request: ValidateTaskAssignmentChangeRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ValidationResult>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Validating task assignment change");

    let validation_result = facade(&state)
        .validate_assignment_change(
            &ctx,
            &request.task_id,
            request.old_user_id.as_deref(),
            &request.new_user_id,
        )
        .await?;

    info!(
        "Task assignment change validation completed for task {}",
        request.task_id
    );

    Ok(ApiResponse::success(validation_result)
        .with_correlation_id(Some(ctx.correlation_id.clone())))
}
