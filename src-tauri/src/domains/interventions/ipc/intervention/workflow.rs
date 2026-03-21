//! Intervention workflow operations
//!
//! Thin IPC adapters delegating workflow operations to the interventions facade.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::interventions::application::{
    FinalizeInterventionRequest, InterventionWorkflowAction, InterventionWorkflowResponse,
    StartInterventionRequest,
};
use crate::domains::interventions::{
    InterventionsCommand, InterventionsFacade, InterventionsResponse,
};
use crate::resolve_context;
use tracing::instrument;

fn workflow_ctx(
    state: &AppState<'_>,
    correlation_id: &Option<String>,
) -> Result<crate::shared::context::RequestContext, AppError> {
    let ctx = resolve_context!(state, correlation_id);
    tracing::Span::current().record("user_id", ctx.user_id());
    Ok(ctx)
}

/// TODO: document
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state, request), fields(task_id = %request.task_id, user_id))]
pub async fn intervention_start(
    request: StartInterventionRequest,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::intervention::Intervention>,
    AppError,
> {
    let ctx = workflow_ctx(&state, &request.correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .execute(
            InterventionsCommand::Start { request },
            &ctx,
            state.task_service.as_ref(),
        )
        .await?
    {
        InterventionsResponse::Intervention(intervention) => {
            Ok(ApiResponse::success(intervention).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, data), fields(user_id))]
pub async fn intervention_update(
    id: String,
    data: serde_json::Value,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::intervention::Intervention>,
    AppError,
> {
    let ctx = workflow_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .execute(
            InterventionsCommand::Update { id, data },
            &ctx,
            state.task_service.as_ref(),
        )
        .await?
    {
        InterventionsResponse::Intervention(intervention) => {
            Ok(ApiResponse::success(intervention).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn intervention_delete(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = workflow_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .execute(
            InterventionsCommand::Delete { id },
            &ctx,
            state.task_service.as_ref(),
        )
        .await?
    {
        InterventionsResponse::Deleted => Ok(ApiResponse::success(
            "Intervention deleted successfully".to_string(),
        )
        .with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, request), fields(intervention_id = %request.intervention_id, user_id, correlation_id))]
pub async fn intervention_finalize(
    request: FinalizeInterventionRequest,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::infrastructure::intervention_types::FinalizeInterventionResponse>,
    AppError,
>{
    let ctx = workflow_ctx(&state, &request.correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .execute(
            InterventionsCommand::Finalize { request },
            &ctx,
            state.task_service.as_ref(),
        )
        .await?
    {
        InterventionsResponse::Finalized(result) => {
            // ADR-016 saga: consolidate inventory transactions synchronously in
            // the application layer instead of relying on the event handler.
            let finalized_event = crate::shared::contracts::events::InterventionFinalized {
                intervention_id: result.intervention.id.clone(),
                task_id: result.intervention.task_id.clone(),
                technician_id: result
                    .intervention
                    .technician_id
                    .clone()
                    .unwrap_or_else(|| ctx.user_id().to_string()),
                completed_at_ms: result
                    .intervention
                    .completed_at
                    .inner()
                    .unwrap_or_else(crate::shared::contracts::common::now),
            };
            if let Err(e) = state
                .inventory_service
                .consolidate_intervention_finalized(&finalized_event)
            {
                tracing::warn!(
                    intervention_id = %finalized_event.intervention_id,
                    error = %e,
                    "Failed to consolidate inventory transactions after intervention finalization"
                );
            }

            Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, action), fields(user_id, correlation_id))]
pub async fn intervention_workflow(
    action: InterventionWorkflowAction,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = workflow_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    let command = InterventionsCommand::from(action);

    match facade
        .execute(command, &ctx, state.task_service.as_ref())
        .await?
    {
        InterventionsResponse::Workflow(response) => {
            Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}
