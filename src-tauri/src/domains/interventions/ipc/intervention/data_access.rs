//! Intervention data access operations
//!
//! This module handles simple intervention data retrieval operations:
//! - Getting individual interventions
//! - Getting active interventions by task
//! - Getting latest interventions by task
//! - Getting individual intervention steps

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::interventions::{
    InterventionsCommand, InterventionsFacade, InterventionsResponse,
};
use crate::shared::auth_middleware::AuthMiddleware;
use tracing::{error, info, instrument};

/// Get a specific intervention by ID
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_get(
    id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::intervention::Intervention>,
    AppError,
> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;
    tracing::Span::current().record("user_id", &ctx.session.user_id.as_str());

    info!(intervention_id = %id, "Getting intervention");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    let response = facade
        .execute(
            InterventionsCommand::Get {
                intervention_id: id.clone(),
            },
            &ctx,
            state.task_service.as_ref(),
        )
        .await;
    match response {
        Ok(InterventionsResponse::Intervention(intervention)) => {
            Ok(ApiResponse::success(intervention).with_correlation_id(Some(ctx.correlation_id)))
        }
        Ok(_) => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
        Err(e) => {
            error!(error = %e, intervention_id = %id, "Failed to get intervention");
            Err(e)
        }
    }
}

/// Get active interventions for a specific task
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_get_active_by_task(
    task_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<Vec<crate::domains::interventions::domain::models::intervention::Intervention>>,
    AppError,
> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;
    tracing::Span::current().record("user_id", &ctx.session.user_id.as_str());

    info!(task_id = %task_id, "Getting active interventions for task");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    match facade
        .execute(
            InterventionsCommand::GetActiveByTask {
                task_id: task_id.clone(),
            },
            &ctx,
            state.task_service.as_ref(),
        )
        .await
    {
        Ok(InterventionsResponse::InterventionList(items)) => {
            Ok(ApiResponse::success(items).with_correlation_id(Some(ctx.correlation_id)))
        }
        Ok(_) => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
        Err(e) => {
            error!(error = %e, task_id = %task_id, "Failed to get active interventions");
            Err(e)
        }
    }
}

/// Get the latest intervention for a specific task
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_get_latest_by_task(
    task_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<Option<crate::domains::interventions::domain::models::intervention::Intervention>>,
    AppError,
> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;
    tracing::Span::current().record("user_id", &ctx.session.user_id.as_str());

    info!(task_id = %task_id, "Getting latest intervention for task");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    match facade
        .execute(
            InterventionsCommand::GetLatestByTask {
                task_id: task_id.clone(),
            },
            &ctx,
            state.task_service.as_ref(),
        )
        .await
    {
        Ok(InterventionsResponse::OptionalIntervention(value)) => {
            Ok(ApiResponse::success(value).with_correlation_id(Some(ctx.correlation_id)))
        }
        Ok(_) => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
        Err(e) => {
            error!(error = %e, task_id = %task_id, "Failed to get latest intervention");
            Err(e)
        }
    }
}

/// Get a specific intervention step
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_get_step(
    intervention_id: String,
    step_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::step::InterventionStep>,
    AppError,
> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;
    tracing::Span::current().record("user_id", &ctx.session.user_id.as_str());

    info!(intervention_id = %intervention_id, step_id = %step_id, "Getting intervention step");

    let facade = InterventionsFacade::new(state.intervention_service.clone());
    match facade
        .execute(
            InterventionsCommand::GetStep {
                intervention_id: intervention_id.clone(),
                step_id: step_id.clone(),
            },
            &ctx,
            state.task_service.as_ref(),
        )
        .await
    {
        Ok(InterventionsResponse::Step(step)) => {
            Ok(ApiResponse::success(step).with_correlation_id(Some(ctx.correlation_id)))
        }
        Ok(_) => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
        Err(e) => {
            error!(error = %e, step_id = %step_id, "Failed to get intervention step");
            Err(e)
        }
    }
}
