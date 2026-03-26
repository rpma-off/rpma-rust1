//! Intervention data access operations
//!
//! This module handles simple intervention data retrieval operations:
//! - Getting individual interventions
//! - Getting active interventions by task
//! - Getting latest interventions by task
//! - Getting individual intervention steps

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::interventions::application::InterventionWorkflowResponse;
use crate::domains::interventions::InterventionsFacade;
use crate::resolve_context;
use serde::Deserialize;
use tracing::{error, info, instrument};

/// Request for listing interventions with optional filters.
#[derive(Debug, Deserialize)]
pub struct ListInterventionsRequest {
    pub status: Option<String>,
    pub technician_id: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub correlation_id: Option<String>,
}

/// List interventions with optional filters.
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn intervention_list(
    request: ListInterventionsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    tracing::Span::current().record("user_id", ctx.user_id());

    info!("Listing interventions");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    facade.ensure_management_access(&ctx)?;

    match state
        .intervention_service
        .list_interventions(
            request.status.as_deref(),
            request.technician_id.as_deref(),
            request.limit,
            request.offset,
        )
    {
        Ok((interventions, _total)) => Ok(ApiResponse::success(
            InterventionWorkflowResponse::ActiveByTask { interventions },
        )
        .with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => {
            error!(error = %e, "Failed to list interventions");
            Err(AppError::Database(format!("Failed to list interventions: {e}")))
        }
    }
}

/// Get a specific intervention by ID
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn intervention_get(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    tracing::Span::current().record("user_id", ctx.user_id());

    info!(intervention_id = %id, "Getting intervention");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    let response = facade.get(id.clone(), &ctx).await;
    match response {
        Ok(intervention) => Ok(ApiResponse::success(InterventionWorkflowResponse::Retrieved {
            intervention,
        })
        .with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => {
            error!(error = %e, intervention_id = %id, "Failed to get intervention");
            Err(e)
        }
    }
}

/// Get active interventions for a specific task
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn intervention_get_active_by_task(
    task_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    tracing::Span::current().record("user_id", ctx.user_id());

    info!(task_id = %task_id, "Getting active interventions for task");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    match facade
        .get_active_by_task(task_id.clone(), &ctx, state.task_service.as_ref())
        .await
    {
        Ok(interventions) => Ok(ApiResponse::success(InterventionWorkflowResponse::ActiveByTask {
            interventions,
        })
        .with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => {
            error!(error = %e, task_id = %task_id, "Failed to get active interventions");
            Err(e)
        }
    }
}

/// Get the latest intervention for a specific task
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn intervention_get_latest_by_task(
    task_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    tracing::Span::current().record("user_id", ctx.user_id());

    info!(task_id = %task_id, "Getting latest intervention for task");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    match facade
        .get_latest_by_task(task_id.clone(), &ctx, state.task_service.as_ref())
        .await
    {
        Ok(maybe_intervention) => {
            Ok(ApiResponse::success(InterventionWorkflowResponse::ActiveByTask {
                interventions: maybe_intervention.into_iter().collect(),
            })
            .with_correlation_id(Some(ctx.correlation_id)))
        }
        Err(e) => {
            error!(error = %e, task_id = %task_id, "Failed to get latest intervention");
            Err(e)
        }
    }
}
/// Get a specific intervention step by ID
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn intervention_get_step(
    step_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::domains::interventions::domain::models::step::InterventionStep>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    tracing::Span::current().record("user_id", ctx.user_id());

    info!(step_id = %step_id, "Getting intervention step");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    match facade.get_step(step_id.clone(), &ctx).await {
        Ok(step) => Ok(ApiResponse::success(step).with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => {
            error!(error = %e, step_id = %step_id, "Failed to get intervention step");
            Err(e)
        }
    }
}
