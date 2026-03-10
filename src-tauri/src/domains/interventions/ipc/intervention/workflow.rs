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
use crate::shared::auth_middleware::AuthMiddleware;
use tracing::instrument;

async fn workflow_ctx(
    state: &AppState<'_>,
    session_token: &str,
    correlation_id: &Option<String>,
) -> Result<crate::shared::ipc::CommandContext, AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(session_token, state, None, correlation_id).await?;
    tracing::Span::current().record("user_id", &ctx.session.user_id.as_str());
    Ok(ctx)
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(task_id = %request.task_id, user_id))]
pub async fn intervention_start(
    request: StartInterventionRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::intervention::Intervention>,
    AppError,
> {
    let ctx = workflow_ctx(&state, &session_token, &request.correlation_id).await?;
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
#[instrument(skip(state, session_token, data), fields(user_id))]
pub async fn intervention_update(
    id: String,
    data: serde_json::Value,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::intervention::Intervention>,
    AppError,
> {
    let ctx = workflow_ctx(&state, &session_token, &correlation_id).await?;
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
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_delete(
    id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = workflow_ctx(&state, &session_token, &correlation_id).await?;
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
#[instrument(skip(state, session_token, request), fields(intervention_id = %request.intervention_id, user_id, correlation_id))]
pub async fn intervention_finalize(
    request: FinalizeInterventionRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::infrastructure::intervention_types::FinalizeInterventionResponse>,
    AppError,
>{
    let ctx = workflow_ctx(&state, &session_token, &request.correlation_id).await?;
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
            Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, session_token, action), fields(user_id, correlation_id))]
pub async fn intervention_workflow(
    action: InterventionWorkflowAction,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let ctx = workflow_ctx(&state, &session_token, &correlation_id).await?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    let command = match action {
        InterventionWorkflowAction::Start { data } => {
            InterventionsCommand::WorkflowStart { request: data }
        }
        InterventionWorkflowAction::Get { id } => InterventionsCommand::WorkflowGet { id },
        InterventionWorkflowAction::GetActiveByTask { task_id } => {
            InterventionsCommand::WorkflowGetActiveByTask { task_id }
        }
        InterventionWorkflowAction::Update { id, data } => {
            InterventionsCommand::WorkflowUpdate { id, data }
        }
        InterventionWorkflowAction::Delete { id } => InterventionsCommand::WorkflowDelete { id },
        InterventionWorkflowAction::Finalize { data } => {
            InterventionsCommand::WorkflowFinalize { request: data }
        }
    };

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
