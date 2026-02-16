//! Intervention data access operations
//!
//! This module handles simple intervention data retrieval operations:
//! - Getting individual interventions
//! - Getting active interventions by task
//! - Getting latest interventions by task
//! - Getting individual intervention steps

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use tracing::{error, info, instrument};

/// Get a specific intervention by ID
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_get(
    id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::intervention::Intervention>, AppError> {
    let session = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &session.user_id.as_str());

    info!(intervention_id = %id, "Getting intervention");

    // Check if user has access to this intervention
    let intervention = state
        .intervention_service
        .get_intervention(&id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %id, "Failed to get intervention");
            AppError::Database("Failed to get intervention".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;

    // Check permissions
    if intervention.technician_id.as_ref() != Some(&session.user_id)
        && !matches!(
            session.role,
            crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
        )
    {
        return Err(AppError::Authorization(
            "Not authorized to view this intervention".to_string(),
        ));
    }

    Ok(ApiResponse::success(intervention).with_correlation_id(correlation_id.clone()))
}

/// Get active interventions for a specific task
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_get_active_by_task(
    task_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::models::intervention::Intervention>>, AppError> {
    let session = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &session.user_id.as_str());

    info!(task_id = %task_id, "Getting active interventions for task");

    // Check task access
    let task_access = state
        .task_service
        .check_task_assignment(&task_id, &session.user_id)
        .unwrap_or(false);

    if !task_access
        && !matches!(
            session.role,
            crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
        )
    {
        return Err(AppError::Authorization(
            "Not authorized to view interventions for this task".to_string(),
        ));
    }

    match state
        .intervention_service
        .get_active_intervention_by_task(&task_id)
    {
        Ok(Some(intervention)) => Ok(ApiResponse::success(vec![intervention]).with_correlation_id(correlation_id.clone())),
        Ok(None) => Ok(ApiResponse::success(vec![]).with_correlation_id(correlation_id.clone())),
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
) -> Result<ApiResponse<Option<crate::models::intervention::Intervention>>, AppError> {
    let session = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &session.user_id.as_str());

    info!(task_id = %task_id, "Getting latest intervention for task");

    // Check task access
    let task_access = state
        .task_service
        .check_task_assignment(&task_id, &session.user_id)
        .unwrap_or(false);

    if !task_access
        && !matches!(
            session.role,
            crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
        )
    {
        return Err(AppError::Authorization(
            "Not authorized to view interventions for this task".to_string(),
        ));
    }

    state
        .intervention_service
        .get_latest_intervention_by_task(&task_id)
        .map(|v| ApiResponse::success(v).with_correlation_id(correlation_id.clone()))
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
) -> Result<ApiResponse<crate::models::step::InterventionStep>, AppError> {
    let session = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &session.user_id.as_str());

    info!(intervention_id = %intervention_id, step_id = %step_id, "Getting intervention step");

    // Check intervention access
    let intervention = state
        .intervention_service
        .get_intervention(&intervention_id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention for step access check");
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
            "Not authorized to view this intervention step".to_string(),
        ));
    }

    let _step = state
        .intervention_service
        .get_step(&step_id)
        .map_err(|e| {
            error!(error = %e, step_id = %step_id, "Failed to get intervention step");
            AppError::Database("Failed to get intervention step".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;

    let response = state
        .intervention_service
        .get_step(&step_id)
        .map_err(|e| {
            error!(error = %e, step_id = %step_id, "Failed to get intervention step");
            AppError::Database("Failed to get intervention step".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;

    Ok(ApiResponse::success(response).with_correlation_id(correlation_id.clone()))
}
