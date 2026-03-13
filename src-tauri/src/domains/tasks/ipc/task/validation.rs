//! Task validation functions
//!
//! This module handles task assignment validation and availability checking.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::application::services::task_policy_service;
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

/// Check task assignment eligibility
/// ADR-018: Thin IPC layer
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn check_task_assignment(
    request: CheckTaskAssignmentRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<AssignmentCheckResponse>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Checking task assignment eligibility");

    task_policy_service::ensure_assignment_management_role(&ctx.auth)?;

    let task = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| AppError::db_sanitized("tasks.assignment.fetch_task", e))?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    let max_tasks_per_user = state
        .settings_repository
        .get_max_tasks_per_user()
        .map_err(|e| AppError::db_sanitized("get_settings", &e))?
        as usize;

    let facade = TasksFacade::new(
        state.task_service.clone(),
        state.task_import_service.clone(),
    );
    let response = facade
        .evaluate_assignment_eligibility(&task, &request.user_id, max_tasks_per_user)
        .await?;

    info!(
        "Task assignment check completed for task {} and user {}",
        request.task_id, request.user_id
    );

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Check task availability
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn check_task_availability(
    request: CheckTaskAvailabilityRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<AvailabilityCheckResponse>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Checking task availability");

    let task = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| AppError::NotFound(format!("Task not found: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    let facade = TasksFacade::new(
        state.task_service.clone(),
        state.task_import_service.clone(),
    );
    let response = facade.evaluate_task_availability(&task)?;

    info!(
        "Task availability check completed for task {}",
        request.task_id
    );

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Validate task assignment change
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn validate_task_assignment_change(
    request: ValidateTaskAssignmentChangeRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ValidationResult>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Validating task assignment change");

    task_policy_service::ensure_assignment_management_role(&ctx.auth)?;

    let task = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| AppError::db_sanitized("tasks.assignment_change.fetch_task", e))?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    let max_tasks_per_user = state
        .settings_repository
        .get_max_tasks_per_user()
        .map_err(|e| AppError::db_sanitized("get_settings", &e))?
        as usize;

    let facade = TasksFacade::new(
        state.task_service.clone(),
        state.task_import_service.clone(),
    );
    let validation_result = facade.evaluate_assignment_change(
        &task,
        request.old_user_id.as_deref(),
        &request.new_user_id,
        max_tasks_per_user,
    )?;

    info!(
        "Task assignment change validation completed for task {}",
        request.task_id
    );

    Ok(ApiResponse::success(validation_result).with_correlation_id(Some(ctx.correlation_id.clone())))
}
