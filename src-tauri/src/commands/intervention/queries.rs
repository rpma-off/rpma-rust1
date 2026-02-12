//! Intervention query operations
//!
//! This module handles intervention listing, filtering, and progress operations:
//! - Administrative queries and filtering
//! - Progress tracking and retrieval
//! - Management operations

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use serde::{Deserialize, Serialize};
use tracing::{error, info, instrument};

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
        notes: Option<String>,
    },
    SaveProgress {
        intervention_id: String,
        step_id: String,
        progress_data: serde_json::Value,
    },
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum InterventionProgressResponse {
    Retrieved {
        progress: crate::models::intervention::InterventionProgress,
        steps: Vec<crate::models::step::InterventionStep>,
    },
    StepAdvanced {
        step: Box<crate::models::step::InterventionStep>,
    },
    ProgressSaved {
        message: String,
    },
}

/// Get intervention progress information
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_get_progress(
    intervention_id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::intervention::InterventionProgress>, AppError> {
    let session = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    super::ensure_intervention_permission(&session)?;

    info!(intervention_id = %intervention_id, "Getting intervention progress");

    // Check intervention access
    let intervention = state
        .intervention_service
        .get_intervention(&intervention_id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention for progress check");
            AppError::Database("Failed to get intervention".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", intervention_id)))?;

    if intervention.technician_id.as_ref() != Some(&session.user_id)
        && !matches!(
            session.role,
            crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
        )
    {
        return Err(AppError::Authorization(
            "Not authorized to view this intervention progress".to_string(),
        ));
    }

    // Delegate progress calculation to the service layer
    let progress = state
        .intervention_service
        .get_progress(&intervention_id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention progress");
            AppError::Database("Failed to get intervention progress".to_string())
        })?;

    Ok(ApiResponse::success(progress))
}

/// Advance an intervention step
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_advance_step(
    intervention_id: String,
    step_id: String,
    notes: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::step::InterventionStep>, AppError> {
    let session = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    super::ensure_intervention_permission(&session)?;

    info!(intervention_id = %intervention_id, step_id = %step_id, "Advancing intervention step");

    // Check intervention access
    let intervention = state
        .intervention_service
        .get_intervention(&intervention_id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention for step advance");
            AppError::Database("Failed to get intervention".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", intervention_id)))?;

    if intervention.technician_id.as_ref() != Some(&session.user_id)
        && !matches!(
            session.role,
            crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
        )
    {
        return Err(AppError::Authorization(
            "Not authorized to advance this intervention".to_string(),
        ));
    }

    let advance_request = crate::services::intervention_types::AdvanceStepRequest {
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
        .advance_step(advance_request, "advance-cmd", Some(&session.user_id))
        .await
        .map(|response| ApiResponse::success(response.step))
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, step_id = %step_id, "Failed to advance intervention step");
            AppError::Database("Failed to advance intervention step".to_string())
        })
}

/// Save step progress for an intervention
#[tauri::command]
#[instrument(skip(state, session_token, progress_data), fields(user_id))]
pub async fn intervention_save_step_progress(
    intervention_id: String,
    step_id: String,
    progress_data: serde_json::Value,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let session = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    super::ensure_intervention_permission(&session)?;

    info!(intervention_id = %intervention_id, step_id = %step_id, "Saving step progress");

    // Check intervention access
    let intervention = state
        .intervention_service
        .get_intervention(&intervention_id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention for progress save");
            AppError::Database("Failed to get intervention".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", intervention_id)))?;

    if intervention.technician_id.as_ref() != Some(&session.user_id)
        && !matches!(
            session.role,
            crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
        )
    {
        return Err(AppError::Authorization(
            "Not authorized to save progress for this intervention".to_string(),
        ));
    }

    let progress_request = crate::services::intervention_types::SaveStepProgressRequest {
        step_id: step_id.clone(),
        collected_data: progress_data,
        notes: None,
        photos: None,
    };

    state
        .intervention_service
        .save_step_progress(
            progress_request,
            "save-progress-cmd",
            Some(&session.user_id),
        )
        .await
        .map(|_| ApiResponse::success("Step progress saved successfully".to_string()))
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, step_id = %step_id, "Failed to save step progress");
            AppError::Database("Failed to save step progress".to_string())
        })
}

/// Main intervention progress command (unified interface)
#[tauri::command]
#[instrument(skip(state, session_token, action), fields(user_id))]
pub async fn intervention_progress(
    action: InterventionProgressAction,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionProgressResponse>, AppError> {
    let session = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    super::ensure_intervention_permission(&session)?;

    info!("Processing intervention progress action");

    match action {
        InterventionProgressAction::Get { intervention_id } => {
            // Check intervention access
            let intervention = state
                .intervention_service
                .get_intervention(&intervention_id)
                .map_err(|e| {
                    error!(error = %e, "Failed to get intervention");
                    AppError::Database("Failed to get intervention".to_string())
                })?
                .ok_or_else(|| {
                    AppError::NotFound(format!("Intervention {} not found", intervention_id))
                })?;

            if intervention.technician_id.as_ref() != Some(&session.user_id)
                && !matches!(
                    session.role,
                    crate::models::auth::UserRole::Admin
                        | crate::models::auth::UserRole::Supervisor
                )
            {
                return Err(AppError::Authorization(
                    "Not authorized to view this intervention progress".to_string(),
                ));
            }

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

            Ok(ApiResponse::success(
                InterventionProgressResponse::Retrieved { progress, steps },
            ))
        }

        InterventionProgressAction::AdvanceStep {
            intervention_id,
            step_id,
            notes,
        } => {
            // Check intervention access
            let intervention = state
                .intervention_service
                .get_intervention(&intervention_id)
                .map_err(|e| {
                    error!(error = %e, "Failed to get intervention");
                    AppError::Database("Failed to get intervention".to_string())
                })?
                .ok_or_else(|| {
                    AppError::NotFound(format!("Intervention {} not found", intervention_id))
                })?;

            if intervention.technician_id.as_ref() != Some(&session.user_id)
                && !matches!(
                    session.role,
                    crate::models::auth::UserRole::Admin
                        | crate::models::auth::UserRole::Supervisor
                )
            {
                return Err(AppError::Authorization(
                    "Not authorized to advance this intervention".to_string(),
                ));
            }

            let advance_request = crate::services::intervention_types::AdvanceStepRequest {
                intervention_id: intervention_id.clone(),
                step_id: step_id.clone(),
                collected_data: serde_json::Value::Null,
                photos: None,
                notes,
                quality_check_passed: true,
                issues: None,
            };

            let response = state
                .intervention_service
                .advance_step(advance_request, "advance-cmd", Some(&session.user_id))
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to advance step");
                    AppError::Database("Failed to advance step".to_string())
                })?;

            Ok(ApiResponse::success(
                InterventionProgressResponse::StepAdvanced {
                    step: Box::new(response.step),
                },
            ))
        }

        InterventionProgressAction::SaveProgress {
            intervention_id,
            step_id,
            progress_data,
        } => {
            // Check intervention access
            let intervention = state
                .intervention_service
                .get_intervention(&intervention_id)
                .map_err(|e| {
                    error!(error = %e, "Failed to get intervention");
                    AppError::Database("Failed to get intervention".to_string())
                })?
                .ok_or_else(|| {
                    AppError::NotFound(format!("Intervention {} not found", intervention_id))
                })?;

            if intervention.technician_id.as_ref() != Some(&session.user_id)
                && !matches!(
                    session.role,
                    crate::models::auth::UserRole::Admin
                        | crate::models::auth::UserRole::Supervisor
                )
            {
                return Err(AppError::Authorization(
                    "Not authorized to save progress for this intervention".to_string(),
                ));
            }

            let progress_request = crate::services::intervention_types::SaveStepProgressRequest {
                step_id,
                collected_data: progress_data,
                notes: None,
                photos: None,
            };

            state
                .intervention_service
                .save_step_progress(
                    progress_request,
                    "save-progress-cmd",
                    Some(&session.user_id),
                )
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to save progress");
                    AppError::Database("Failed to save progress".to_string())
                })?;

            Ok(ApiResponse::success(
                InterventionProgressResponse::ProgressSaved {
                    message: "Progress saved".to_string(),
                },
            ))
        }
    }
}
