//! Intervention query operations
//!
//! Thin IPC adapters delegating progress/query operations to the interventions facade.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::interventions::{
    InterventionsCommand, InterventionsFacade, InterventionsResponse,
};
use crate::shared::auth_middleware::AuthMiddleware;
use serde::{Deserialize, Serialize};
use tracing::instrument;

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

/// TODO: document
#[derive(Serialize)]
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

async fn intervention_ctx(
    state: &AppState<'_>,
    session_token: &str,
    correlation_id: &Option<String>,
) -> Result<crate::shared::ipc::CommandContext, AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(session_token, state, None, correlation_id).await?;
    super::ensure_intervention_permission(&ctx.session)?;
    tracing::Span::current().record("user_id", &ctx.session.user_id.as_str());
    Ok(ctx)
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id, correlation_id))]
pub async fn intervention_get_progress(
    intervention_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::intervention::InterventionProgress>,
    AppError,
> {
    let ctx = intervention_ctx(&state, &session_token, &correlation_id).await?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .execute(
            InterventionsCommand::GetProgress { intervention_id },
            &ctx,
            state.task_service.as_ref(),
        )
        .await?
    {
        InterventionsResponse::Progress(progress) => {
            Ok(ApiResponse::success(progress).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id, correlation_id))]
pub async fn intervention_advance_step(
    intervention_id: String,
    step_id: String,
    collected_data: Option<serde_json::Value>,
    photos: Option<Vec<String>>,
    notes: Option<String>,
    issues: Option<Vec<String>>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::step::InterventionStep>,
    AppError,
> {
    let ctx = intervention_ctx(&state, &session_token, &correlation_id).await?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .execute(
            InterventionsCommand::AdvanceStep {
                intervention_id,
                step_id,
                collected_data: collected_data.unwrap_or(serde_json::Value::Null),
                photos,
                notes,
                quality_check_passed: true,
                issues,
            },
            &ctx,
            state.task_service.as_ref(),
        )
        .await?
    {
        InterventionsResponse::AdvancedStep(response) => {
            Ok(ApiResponse::success(response.step).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(
    skip(state, session_token, progress_data),
    fields(user_id, correlation_id)
)]
pub async fn intervention_save_step_progress(
    intervention_id: String,
    step_id: String,
    progress_data: serde_json::Value,
    notes: Option<String>,
    photos: Option<Vec<String>>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = intervention_ctx(&state, &session_token, &correlation_id).await?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match facade
        .execute(
            InterventionsCommand::SaveStepProgress {
                step_id,
                intervention_id: Some(intervention_id),
                collected_data: progress_data,
                notes,
                photos,
            },
            &ctx,
            state.task_service.as_ref(),
        )
        .await
    {
        Ok(InterventionsResponse::SavedStep(_)) => Ok(ApiResponse::success(
            "Step progress saved successfully".to_string(),
        )
        .with_correlation_id(Some(ctx.correlation_id))),
        Ok(_) => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
        Err(e) => Err(AppError::Database(format!(
            "Failed to save step progress: {e}"
        ))),
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, session_token, action), fields(user_id, correlation_id))]
pub async fn intervention_progress(
    action: InterventionProgressAction,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionProgressResponse>, AppError> {
    let ctx = intervention_ctx(&state, &session_token, &correlation_id).await?;
    let facade = InterventionsFacade::new(state.intervention_service.clone());

    let command = match action {
        InterventionProgressAction::Get { intervention_id } => {
            InterventionsCommand::GetProgressWithSteps { intervention_id }
        }
        InterventionProgressAction::AdvanceStep {
            intervention_id,
            step_id,
            collected_data,
            photos,
            notes,
            quality_check_passed,
            issues,
        } => InterventionsCommand::AdvanceStep {
            intervention_id,
            step_id,
            collected_data,
            photos,
            notes,
            quality_check_passed,
            issues,
        },
        InterventionProgressAction::SaveStepProgress {
            step_id,
            intervention_id,
            collected_data,
            notes,
            photos,
        } => InterventionsCommand::SaveStepProgress {
            step_id,
            intervention_id,
            collected_data,
            notes,
            photos,
        },
    };

    match facade
        .execute(command, &ctx, state.task_service.as_ref())
        .await?
    {
        InterventionsResponse::ProgressWithSteps { progress, steps } => Ok(ApiResponse::success(
            InterventionProgressResponse::Retrieved { progress, steps },
        )
        .with_correlation_id(Some(ctx.correlation_id))),
        InterventionsResponse::AdvancedStep(response) => Ok(ApiResponse::success(
            InterventionProgressResponse::StepAdvanced {
                step: Box::new(response.step),
                next_step: response.next_step,
                progress_percentage: response.progress_percentage,
                requirements_completed: response.requirements_completed,
            },
        )
        .with_correlation_id(Some(ctx.correlation_id))),
        InterventionsResponse::SavedStep(step) => Ok(ApiResponse::success(
            InterventionProgressResponse::StepProgressSaved {
                step: Box::new(step),
            },
        )
        .with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal(
            "Unexpected interventions facade response".to_string(),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::super::can_access_own_or_privileged;
    use crate::shared::contracts::auth::{UserRole, UserSession};

    fn session_with_role(role: UserRole, user_id: &str) -> UserSession {
        UserSession::new(
            user_id.to_string(),
            "user".to_string(),
            "user@example.com".to_string(),
            role,
            "token".to_string(),
            3600,
        )
    }

    #[test]
    fn allows_owner_technician_access() {
        let session = session_with_role(UserRole::Technician, "tech-1");
        assert!(can_access_own_or_privileged(Some("tech-1"), &session));
    }

    #[test]
    fn denies_non_owner_technician_access() {
        let session = session_with_role(UserRole::Technician, "tech-1");
        assert!(!can_access_own_or_privileged(Some("tech-2"), &session));
    }

    #[test]
    fn allows_supervisor_access() {
        let session = session_with_role(UserRole::Supervisor, "sup-1");
        assert!(can_access_own_or_privileged(Some("tech-2"), &session));
    }

    #[test]
    fn allows_admin_access() {
        let session = session_with_role(UserRole::Admin, "admin-1");
        assert!(can_access_own_or_privileged(Some("tech-2"), &session));
    }

    #[test]
    fn denies_unassigned_intervention_for_technician() {
        let session = session_with_role(UserRole::Technician, "tech-1");
        assert!(!can_access_own_or_privileged(None, &session));
    }

    #[test]
    fn allows_admin_access_to_unassigned_intervention() {
        let session = session_with_role(UserRole::Admin, "admin-1");
        assert!(can_access_own_or_privileged(None, &session));
    }

    #[test]
    fn allows_supervisor_access_to_unassigned_intervention() {
        let session = session_with_role(UserRole::Supervisor, "sup-1");
        assert!(can_access_own_or_privileged(None, &session));
    }
}
