//! Intervention query operations
//!
//! Thin IPC adapters delegating progress/query operations to the interventions facade.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::interventions::InterventionsFacade;
use crate::resolve_context;
use serde::{Deserialize, Serialize};
use tracing::instrument;
use ts_rs::TS;

fn default_collected_data() -> serde_json::Value {
    serde_json::Value::Null
}

fn default_quality_check_passed() -> bool {
    true
}

/// TODO: document
#[derive(Deserialize, Debug)]
#[serde(tag = "action")]
pub enum InterventionProgressAction {
    Get {
        intervention_id: String,
    },
    AdvanceStep {
        intervention_id: String,
        step_id: String,
        #[serde(default = "default_collected_data")]
        collected_data: serde_json::Value,
        #[serde(default)]
        photos: Option<Vec<String>>,
        notes: Option<String>,
        #[serde(default = "default_quality_check_passed")]
        quality_check_passed: bool,
        #[serde(default)]
        issues: Option<Vec<String>>,
    },
    #[serde(alias = "SaveProgress")]
    SaveStepProgress {
        step_id: String,
        #[serde(default)]
        intervention_id: Option<String>,
        #[serde(default = "default_collected_data")]
        collected_data: serde_json::Value,
        notes: Option<String>,
        #[serde(default)]
        photos: Option<Vec<String>>,
    },
}

/// Discriminated-union response for intervention progress/step IPC commands.
///
/// Variants correspond to the action requested:
/// - `Retrieved` — current progress and all steps for an intervention
/// - `StepAdvanced` — result after advancing to the next step
/// - `StepProgressSaved` — confirmation that step progress was persisted
#[derive(Serialize, TS)]
#[ts(export)]
#[serde(tag = "type")]
pub enum InterventionProgressResponse {
    Retrieved {
        progress: crate::domains::interventions::domain::models::intervention::InterventionProgress,
        steps: Vec<crate::domains::interventions::domain::models::step::InterventionStep>,
    },
    StepAdvanced {
        step: Box<crate::domains::interventions::domain::models::step::InterventionStep>,
        next_step: Option<crate::domains::interventions::domain::models::step::InterventionStep>,
        progress_percentage: f32,
        requirements_completed: Vec<String>,
    },
    StepProgressSaved {
        step: Box<crate::domains::interventions::domain::models::step::InterventionStep>,
    },
}

fn intervention_ctx(
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
#[instrument(skip(state), fields(user_id, correlation_id))]
pub async fn intervention_get_progress(
    intervention_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionProgressResponse>, AppError> {
    let ctx = intervention_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade.get_progress_with_steps(intervention_id, &ctx).await {
        Ok((progress, steps)) => Ok(ApiResponse::success(
            InterventionProgressResponse::Retrieved { progress, steps },
        )
        .with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => Err(e),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state), fields(user_id, correlation_id))]
pub async fn intervention_advance_step(
    intervention_id: String,
    step_id: String,
    collected_data: Option<serde_json::Value>,
    photos: Option<Vec<String>>,
    notes: Option<String>,
    issues: Option<Vec<String>>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::step::InterventionStep>,
    AppError,
> {
    let ctx = intervention_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .advance_step(
            intervention_id,
            step_id,
            collected_data.unwrap_or(serde_json::Value::Null),
            photos,
            notes,
            true,
            issues,
            &ctx,
        )
        .await
    {
        Ok(response) => {
            Ok(ApiResponse::success(response.step).with_correlation_id(Some(ctx.correlation_id)))
        }
        Err(e) => Err(e),
    }
}

use crate::domains::interventions::infrastructure::intervention_types::SaveStepProgressRequest;

/// TODO: document
#[tauri::command]
#[instrument(skip(state, data), fields(user_id, correlation_id))]
pub async fn intervention_save_step_progress(
    data: SaveStepProgressRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::domains::interventions::domain::models::step::InterventionStep>, AppError> {
    let ctx = intervention_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .save_step_progress(
            data.step_id,
            None, // intervention_id is not in SaveStepProgressRequest
            data.collected_data,
            data.notes,
            data.photos,
            &ctx,
        )
        .await
    {
        Ok(step) => Ok(ApiResponse::success(step).with_correlation_id(Some(ctx.correlation_id))),
        Err(e) => Err(e),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, action), fields(user_id, correlation_id))]
pub async fn intervention_progress(
    action: InterventionProgressAction,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionProgressResponse>, AppError> {
    let ctx = intervention_ctx(&state, &correlation_id)?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match action {
        InterventionProgressAction::Get { intervention_id } => {
            match facade.get_progress_with_steps(intervention_id, &ctx).await {
                Ok((progress, steps)) => Ok(ApiResponse::success(
                    InterventionProgressResponse::Retrieved { progress, steps },
                )
                .with_correlation_id(Some(ctx.correlation_id))),
                Err(e) => Err(e),
            }
        }
        InterventionProgressAction::AdvanceStep {
            intervention_id,
            step_id,
            collected_data,
            photos,
            notes,
            quality_check_passed,
            issues,
        } => match facade
            .advance_step(
                intervention_id,
                step_id,
                collected_data,
                photos,
                notes,
                quality_check_passed,
                issues,
                &ctx,
            )
            .await
        {
            Ok(response) => Ok(ApiResponse::success(
                InterventionProgressResponse::StepAdvanced {
                    step: Box::new(response.step),
                    next_step: response.next_step,
                    progress_percentage: response.progress_percentage,
                    requirements_completed: response.requirements_completed,
                },
            )
            .with_correlation_id(Some(ctx.correlation_id))),
            Err(e) => Err(e),
        },
        InterventionProgressAction::SaveStepProgress {
            step_id,
            intervention_id,
            collected_data,
            notes,
            photos,
        } => match facade
            .save_step_progress(
                step_id,
                intervention_id,
                collected_data,
                notes,
                photos,
                &ctx,
            )
            .await
        {
            Ok(step) => Ok(ApiResponse::success(
                InterventionProgressResponse::StepProgressSaved {
                    step: Box::new(step),
                },
            )
            .with_correlation_id(Some(ctx.correlation_id))),
            Err(e) => Err(e),
        },
    }
}
