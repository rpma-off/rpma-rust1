//! Intervention query operations
//!
//! This module handles intervention listing, filtering, and progress operations:
//! - Administrative queries and filtering
//! - Progress tracking and retrieval
//! - Management operations

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, instrument};

fn default_collected_data() -> serde_json::Value {
    serde_json::Value::Null
}

fn default_quality_check_passed() -> bool {
    true
}

/// Authorization rule for intervention ownership checks.
///
/// Admins and supervisors can access any intervention (including unassigned ones),
/// while technicians can only access interventions assigned to their user ID.
fn can_access_intervention(
    technician_id: Option<&str>,
    session: &crate::shared::contracts::auth::UserSession,
) -> bool {
    let is_privileged = matches!(
        session.role,
        crate::shared::contracts::auth::UserRole::Admin
            | crate::shared::contracts::auth::UserRole::Supervisor
    );
    is_privileged || technician_id.is_some_and(|id| id == session.user_id.as_str())
}

/// Validates intervention existence and enforces access control for the current session.
///
/// Returns `Ok(())` when the intervention exists and the current session is authorized,
/// otherwise returns the corresponding `AppError` preserving the command contract.
fn ensure_intervention_access(
    state: &AppState<'_>,
    intervention_id: &str,
    session: &crate::shared::contracts::auth::UserSession,
    unauthorized_message: &str,
) -> Result<(), AppError> {
    let intervention = state
        .intervention_service
        .get_intervention(intervention_id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention");
            AppError::Database("Failed to get intervention".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", intervention_id)))?;

    if !can_access_intervention(intervention.technician_id.as_deref(), session) {
        return Err(AppError::Authorization(unauthorized_message.to_string()));
    }

    Ok(())
}

#[derive(Deserialize)]
pub struct InterventionProgressQueryRequest {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub status: Option<String>,
    pub technician_id: Option<String>,
    pub task_id: Option<String>,
    pub priority: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

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

/// Get intervention progress information
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
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    let svc_correlation_id = crate::logging::correlation::generate_correlation_id();
    tracing::Span::current().record("correlation_id", &svc_correlation_id.as_str());
    super::ensure_intervention_permission(&session)?;

    info!(
        intervention_id = %intervention_id,
        correlation_id = %svc_correlation_id,
        "Getting intervention progress"
    );

    ensure_intervention_access(
        &state,
        &intervention_id,
        &session,
        "Not authorized to view this intervention progress",
    )?;

    // Delegate progress calculation to the service layer
    let progress = state
        .intervention_service
        .get_progress(&intervention_id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention progress");
            AppError::Database("Failed to get intervention progress".to_string())
        })?;

    Ok(ApiResponse::success(progress).with_correlation_id(Some(correlation_id.clone())))
}

/// Advance an intervention step
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id, correlation_id))]
pub async fn intervention_advance_step(
    intervention_id: String,
    step_id: String,
    notes: Option<String>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::interventions::domain::models::step::InterventionStep>,
    AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    let svc_correlation_id = crate::logging::correlation::generate_correlation_id();
    tracing::Span::current().record("correlation_id", &svc_correlation_id.as_str());
    super::ensure_intervention_permission(&session)?;

    info!(
        intervention_id = %intervention_id,
        step_id = %step_id,
        correlation_id = %svc_correlation_id,
        "Advancing intervention step"
    );

    ensure_intervention_access(
        &state,
        &intervention_id,
        &session,
        "Not authorized to advance this intervention",
    )?;

    let advance_request =
        crate::domains::interventions::infrastructure::intervention_types::AdvanceStepRequest {
            intervention_id: intervention_id.clone(),
            step_id: step_id.clone(),
            collected_data: serde_json::Value::Null,
            photos: None,
            notes,
            quality_check_passed: true,
            issues: None,
        };

    state
        .intervention_service
        .advance_step(advance_request, &svc_correlation_id, Some(&session.user_id))
        .await
        .map(|response| ApiResponse::success(response.step).with_correlation_id(Some(correlation_id.clone())))
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, step_id = %step_id, "Failed to advance intervention step");
            AppError::Database("Failed to advance intervention step".to_string())
        })
}

/// Save step progress for an intervention
#[tauri::command]
#[instrument(
    skip(state, session_token, progress_data),
    fields(user_id, correlation_id)
)]
pub async fn intervention_save_step_progress(
    intervention_id: String,
    step_id: String,
    progress_data: serde_json::Value,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    let svc_correlation_id = crate::logging::correlation::generate_correlation_id();
    tracing::Span::current().record("correlation_id", &svc_correlation_id.as_str());
    super::ensure_intervention_permission(&session)?;

    info!(
        intervention_id = %intervention_id,
        step_id = %step_id,
        correlation_id = %svc_correlation_id,
        "Saving step progress"
    );

    ensure_intervention_access(
        &state,
        &intervention_id,
        &session,
        "Not authorized to save progress for this intervention",
    )?;

    let progress_request = crate::domains::interventions::infrastructure::intervention_types::SaveStepProgressRequest {
        step_id: step_id.clone(),
        collected_data: progress_data,
        notes: None,
        photos: None,
    };

    state
        .intervention_service
        .save_step_progress(
            progress_request,
            &svc_correlation_id,
            Some(&session.user_id),
        )
        .await
        .map(|_| ApiResponse::success("Step progress saved successfully".to_string()).with_correlation_id(Some(correlation_id.clone())))
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, step_id = %step_id, "Failed to save step progress");
            AppError::Database("Failed to save step progress".to_string())
        })
}

/// Main intervention progress command (unified interface)
#[tauri::command]
#[instrument(skip(state, session_token, action), fields(user_id, correlation_id))]
pub async fn intervention_progress(
    action: InterventionProgressAction,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionProgressResponse>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    let svc_correlation_id = crate::logging::correlation::generate_correlation_id();
    tracing::Span::current().record("correlation_id", &svc_correlation_id.as_str());
    super::ensure_intervention_permission(&session)?;

    info!(correlation_id = %svc_correlation_id, "Processing intervention progress action");

    match action {
        InterventionProgressAction::Get { intervention_id } => {
            ensure_intervention_access(
                &state,
                &intervention_id,
                &session,
                "Not authorized to view this intervention progress",
            )?;

            // Delegate progress calculation to the service layer
            let progress = state
                .intervention_service
                .get_progress(&intervention_id)
                .map_err(|e| {
                    error!(error = %e, "Failed to get intervention progress");
                    AppError::Database("Failed to get intervention progress".to_string())
                })?;

            // Get steps for the response
            let steps = state
                .intervention_service
                .get_intervention_steps(&intervention_id)
                .map_err(|e| {
                    error!(error = %e, "Failed to get intervention steps");
                    AppError::Database("Failed to get intervention steps".to_string())
                })?;

            Ok(
                ApiResponse::success(InterventionProgressResponse::Retrieved { progress, steps })
                    .with_correlation_id(Some(correlation_id.clone())),
            )
        }

        InterventionProgressAction::AdvanceStep {
            intervention_id,
            step_id,
            collected_data,
            photos,
            notes,
            quality_check_passed,
            issues,
        } => {
            ensure_intervention_access(
                &state,
                &intervention_id,
                &session,
                "Not authorized to advance this intervention",
            )?;

            let has_collected_data = match &collected_data {
                serde_json::Value::Null => false,
                serde_json::Value::Object(map) if map.is_empty() => false,
                _ => true,
            };

            debug!(
                correlation_id = %svc_correlation_id,
                intervention_id = %intervention_id,
                step_id = %step_id,
                has_collected_data = %has_collected_data,
                photos_count = %photos.as_ref().map(|p| p.len()).unwrap_or(0),
                issues_count = %issues.as_ref().map(|i| i.len()).unwrap_or(0),
                quality_check_passed = %quality_check_passed,
                "Advance step request received"
            );

            let advance_request = crate::domains::interventions::infrastructure::intervention_types::AdvanceStepRequest {
                intervention_id: intervention_id.clone(),
                step_id: step_id.clone(),
                collected_data,
                photos,
                notes,
                quality_check_passed,
                issues,
            };

            let response = state
                .intervention_service
                .advance_step(advance_request, &svc_correlation_id, Some(&session.user_id))
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to advance step");
                    AppError::Database("Failed to advance step".to_string())
                })?;

            Ok(
                ApiResponse::success(InterventionProgressResponse::StepAdvanced {
                    step: Box::new(response.step),
                    next_step: response.next_step,
                    progress_percentage: response.progress_percentage,
                    requirements_completed: response.requirements_completed,
                })
                .with_correlation_id(Some(correlation_id.clone())),
            )
        }

        InterventionProgressAction::SaveStepProgress {
            step_id,
            intervention_id,
            collected_data,
            notes,
            photos,
        } => {
            let step = state
                .intervention_service
                .get_step(&step_id)
                .map_err(|e| {
                    error!(error = %e, step_id = %step_id, "Failed to get step for progress save");
                    AppError::Database("Failed to get intervention step".to_string())
                })?
                .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;

            let resolved_intervention_id =
                intervention_id.unwrap_or_else(|| step.intervention_id.clone());

            if step.intervention_id != resolved_intervention_id {
                return Err(AppError::Validation(format!(
                    "Step {} does not belong to intervention {}",
                    step_id, resolved_intervention_id
                )));
            }

            ensure_intervention_access(
                &state,
                &resolved_intervention_id,
                &session,
                "Not authorized to save progress for this intervention",
            )?;

            let progress_request = crate::domains::interventions::infrastructure::intervention_types::SaveStepProgressRequest {
                step_id,
                collected_data,
                notes,
                photos,
            };

            let step = state
                .intervention_service
                .save_step_progress(
                    progress_request,
                    &svc_correlation_id,
                    Some(&session.user_id),
                )
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to save progress");
                    AppError::Database("Failed to save progress".to_string())
                })?;

            Ok(
                ApiResponse::success(InterventionProgressResponse::StepProgressSaved {
                    step: Box::new(step),
                })
                .with_correlation_id(Some(correlation_id.clone())),
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::can_access_intervention;
    use crate::shared::contracts::auth::{UserRole, UserSession};

    fn session_with_role(role: UserRole, user_id: &str) -> UserSession {
        UserSession::new(
            user_id.to_string(),
            "user".to_string(),
            "user@example.com".to_string(),
            role,
            "token".to_string(),
            None,
            3600,
        )
    }

    #[test]
    fn allows_owner_technician_access() {
        let session = session_with_role(UserRole::Technician, "tech-1");
        assert!(can_access_intervention(Some("tech-1"), &session));
    }

    #[test]
    fn denies_non_owner_technician_access() {
        let session = session_with_role(UserRole::Technician, "tech-1");
        assert!(!can_access_intervention(Some("tech-2"), &session));
    }

    #[test]
    fn allows_supervisor_access() {
        let session = session_with_role(UserRole::Supervisor, "sup-1");
        assert!(can_access_intervention(Some("tech-2"), &session));
    }

    #[test]
    fn allows_admin_access() {
        let session = session_with_role(UserRole::Admin, "admin-1");
        assert!(can_access_intervention(Some("tech-2"), &session));
    }

    #[test]
    fn denies_unassigned_intervention_for_technician() {
        let session = session_with_role(UserRole::Technician, "tech-1");
        assert!(!can_access_intervention(None, &session));
    }

    #[test]
    fn allows_admin_access_to_unassigned_intervention() {
        let session = session_with_role(UserRole::Admin, "admin-1");
        assert!(can_access_intervention(None, &session));
    }

    #[test]
    fn allows_supervisor_access_to_unassigned_intervention() {
        let session = session_with_role(UserRole::Supervisor, "sup-1");
        assert!(can_access_intervention(None, &session));
    }
}
