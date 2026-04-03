//! Intervention workflow operations
//!
//! Thin IPC adapters delegating workflow operations to the interventions facade.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::interventions::application::{
    FinalizeInterventionRequest, InterventionWorkflowAction, InterventionWorkflowResponse,
    StartInterventionRequest,
};
use crate::domains::interventions::infrastructure::intervention_types::UpdateInterventionRequest;
use crate::domains::interventions::InterventionsFacade;
use crate::resolve_context;
use crate::shared::contracts::integration_sink::{
    IntegrationDispatchRequest, IntegrationEventSink,
};
use tracing::instrument;

fn workflow_ctx(
    state: &AppState<'_>,
    correlation_id: &Option<String>,
) -> Result<crate::shared::context::RequestContext, AppError> {
    let ctx = resolve_context!(state, correlation_id);
    tracing::Span::current().record("user_id", ctx.user_id());
    Ok(ctx)
}

/// Build a facade wired with the production rules engine.
fn facade(state: &AppState<'_>) -> InterventionsFacade {
    InterventionsFacade::new(state.intervention_service.clone()).with_rules_engine(
        state.rules_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::rules_engine::BlockingRuleEngine>,
    )
}

#[tauri::command]
#[instrument(skip(state, request), fields(task_id = %request.task_id, user_id))]
pub async fn intervention_start(
    request: StartInterventionRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = workflow_ctx(&state, &request.correlation_id)?;
    let response = facade(&state)
        .workflow_start(request, &ctx, state.task_service.as_ref())
        .await?;

    let _ = state
        .integrations_service
        .enqueue(IntegrationDispatchRequest {
            event_name: "intervention_started".to_string(),
            payload: serde_json::json!({ "response": &response }),
            correlation_id: ctx.correlation_id.clone(),
            requested_integration_ids: None,
        })
        .await;

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state, data), fields(user_id))]
pub async fn intervention_update(
    id: String,
    data: UpdateInterventionRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = workflow_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade.workflow_update(id, data, &ctx).await {
        Ok(res) => Ok(ApiResponse::success(res).with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => Err(e),
    }
}

#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn intervention_delete(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = workflow_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade.workflow_delete(id, &ctx).await {
        Ok(res) => Ok(ApiResponse::success(res).with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => Err(e),
    }
}

#[tauri::command]
#[instrument(skip(state, request), fields(intervention_id = %request.intervention_id, user_id, correlation_id))]
pub async fn intervention_finalize(
    request: FinalizeInterventionRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = workflow_ctx(&state, &request.correlation_id)?;
    let response = facade(&state).workflow_finalize(request, &ctx).await?;

    let _ = state
        .integrations_service
        .enqueue(IntegrationDispatchRequest {
            event_name: "intervention_finalized".to_string(),
            payload: serde_json::json!({ "response": &response }),
            correlation_id: ctx.correlation_id.clone(),
            requested_integration_ids: None,
        })
        .await;

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state, action), fields(user_id, correlation_id))]
pub async fn intervention_workflow(
    action: InterventionWorkflowAction,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = workflow_ctx(&state, &correlation_id)?;
    let facade = facade(&state);

    let response = match action {
        InterventionWorkflowAction::Start { data } => {
            facade
                .workflow_start(data, &ctx, state.task_service.as_ref())
                .await
        }
        InterventionWorkflowAction::Get { id } => facade.workflow_get(id, &ctx).await,
        InterventionWorkflowAction::GetActiveByTask { task_id } => {
            facade.workflow_get_active_by_task(task_id, &ctx).await
        }
        InterventionWorkflowAction::Update { id, data } => {
            facade.workflow_update(id, data, &ctx).await
        }
        InterventionWorkflowAction::Delete { id } => facade.workflow_delete(id, &ctx).await,
        InterventionWorkflowAction::Finalize { data } => facade.workflow_finalize(data, &ctx).await,
    };

    match response {
        Ok(res) => Ok(ApiResponse::success(res).with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => Err(e),
    }
}
