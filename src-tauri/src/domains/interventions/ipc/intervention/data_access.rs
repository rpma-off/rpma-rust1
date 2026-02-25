//! Intervention data access operations
//!
//! This module handles simple intervention data retrieval operations:
//! - Getting individual interventions
//! - Getting active interventions by task
//! - Getting latest interventions by task
//! - Getting individual intervention steps

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::interventions::InterventionsFacade;
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
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());

    info!(intervention_id = %id, "Getting intervention");

    let facade = InterventionsFacade::new(state.intervention_service.clone());

    // Check if user has access to this intervention
    let intervention = state
        .intervention_service
        .get_intervention(&id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %id, "Failed to get intervention");
            AppError::Database("Failed to get intervention".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;

    facade.check_intervention_access(&session.user_id, &session.role, &intervention)?;

    Ok(ApiResponse::success(intervention).with_correlation_id(Some(correlation_id.clone())))
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
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());

    info!(task_id = %task_id, "Getting active interventions for task");

    let facade = InterventionsFacade::new(state.intervention_service.clone());

    // Check task access
    let task_access = state
        .task_service
        .check_task_assignment(&task_id, &session.user_id)
        .unwrap_or(false);

    facade.check_task_intervention_access(&session.role, task_access)?;

    match state
        .intervention_service
        .get_active_intervention_by_task(&task_id)
    {
        Ok(Some(intervention)) => Ok(ApiResponse::success(vec![intervention])
            .with_correlation_id(Some(correlation_id.clone()))),
        Ok(None) => {
            Ok(ApiResponse::success(vec![]).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, task_id = %task_id, "Failed to get active interventions");
            Err(AppError::Database(
                "Failed to get active interventions".to_string(),
            ))
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
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());

    info!(task_id = %task_id, "Getting latest intervention for task");

    let facade = InterventionsFacade::new(state.intervention_service.clone());

    // Check task access
    let task_access = state
        .task_service
        .check_task_assignment(&task_id, &session.user_id)
        .unwrap_or(false);

    facade.check_task_intervention_access(&session.role, task_access)?;

    state
        .intervention_service
        .get_latest_intervention_by_task(&task_id)
        .map(|v| ApiResponse::success(v).with_correlation_id(Some(correlation_id.clone())))
        .map_err(|e| {
            error!(error = %e, task_id = %task_id, "Failed to get latest intervention");
            AppError::Database("Failed to get latest intervention".to_string())
        })
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
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());

    info!(intervention_id = %intervention_id, step_id = %step_id, "Getting intervention step");

    let facade = InterventionsFacade::new(state.intervention_service.clone());

    // Check intervention access
    let intervention = state
        .intervention_service
        .get_intervention(&intervention_id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention for step access check");
            AppError::Database("Failed to get intervention".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", intervention_id)))?;

    facade.check_intervention_access(&session.user_id, &session.role, &intervention)?;

    let step = state
        .intervention_service
        .get_step(&step_id)
        .map_err(|e| {
            error!(error = %e, step_id = %step_id, "Failed to get intervention step");
            AppError::Database("Failed to get intervention step".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;

    Ok(ApiResponse::success(step).with_correlation_id(Some(correlation_id.clone())))
}
