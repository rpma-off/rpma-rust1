//! Intervention data access operations
//!
//! This module handles simple intervention data retrieval operations:
//! - Getting individual interventions
//! - Getting active interventions by task
//! - Getting latest interventions by task
//! - Getting individual intervention steps

use crate::commands::{ApiResponse, AppError, AppState};
use crate::authenticate;
use tracing::info;

/// Get a specific intervention by ID
#[tauri::command]

pub async fn intervention_get(
    id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::intervention::Intervention>, AppError> {
    info!("Getting intervention: {}", id);

    let session = authenticate!(&session_token, &state);

    // Check if user has access to this intervention
    let intervention = state
        .intervention_service
        .get_intervention(&id)
        .map_err(|e| {
            tracing::error!("Failed to get intervention {}: {}", id, e);
            AppError::Database(format!("Failed to get intervention: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;

    // Check permissions
    if intervention.technician_id.as_ref() != Some(&session.user_id) && session.role != crate::models::auth::UserRole::Admin {
        return Err(AppError::Authorization("Not authorized to view this intervention".to_string()));
    }

    Ok(ApiResponse::success(intervention))
}

/// Get active interventions for a specific task
#[tauri::command]

pub async fn intervention_get_active_by_task(
    task_id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::models::intervention::Intervention>>, AppError> {
    info!("Getting active interventions for task: {}", task_id);

    let session = authenticate!(&session_token, &state);

    // Check task access
    let task_access = state
        .task_service
        .check_task_assignment(&task_id, &session.user_id)
        .unwrap_or(false);

    if !task_access && session.role != crate::models::auth::UserRole::Admin {
        return Err(AppError::Authorization("Not authorized to view interventions for this task".to_string()));
    }

    match state
        .intervention_service
        .get_active_intervention_by_task(&task_id) {
        Ok(Some(intervention)) => Ok(ApiResponse::success(vec![intervention])),
        Ok(None) => Ok(ApiResponse::success(vec![])),
        Err(e) => Err(AppError::Database(format!("Failed to get active interventions: {}", e)))
    }
        .map_err(|e| {
            tracing::error!("Failed to get active interventions for task {}: {}", task_id, e);
            AppError::Database(format!("Failed to get active interventions: {}", e))
        })
}

/// Get the latest intervention for a specific task
#[tauri::command]

pub async fn intervention_get_latest_by_task(
    task_id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<crate::models::intervention::Intervention>>, AppError> {
    info!("Getting latest intervention for task: {}", task_id);

    let session = authenticate!(&session_token, &state);

    // Check task access
    let task_access = state
        .task_service
        .check_task_assignment(&task_id, &session.user_id)
        .unwrap_or(false);

    if !task_access && session.role != crate::models::auth::UserRole::Admin {
        return Err(AppError::Authorization("Not authorized to view interventions for this task".to_string()));
    }

    state
        .intervention_service
        .get_latest_intervention_by_task(&task_id)
        .map(ApiResponse::success)
        .map_err(|e| {
            tracing::error!("Failed to get latest intervention for task {}: {}", task_id, e);
            AppError::Database(format!("Failed to get latest intervention: {}", e))
        })
}

/// Get a specific intervention step
#[tauri::command]

pub async fn intervention_get_step(
    intervention_id: String,
    step_id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::step::InterventionStep>, AppError> {
    info!("Getting intervention step {} for intervention {}", step_id, intervention_id);

    let session = authenticate!(&session_token, &state);

    // Check intervention access
    let intervention = state
        .intervention_service
        .get_intervention(&intervention_id)
        .map_err(|e| AppError::Database(format!("Failed to get intervention: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", intervention_id)))?;

    if intervention.technician_id.as_ref() != Some(&session.user_id) && session.role != crate::models::auth::UserRole::Admin {
        return Err(AppError::Authorization("Not authorized to view this intervention step".to_string()));
    }

    let _step = state
        .intervention_service
        .get_step(&step_id)
        .map_err(|e| AppError::Database(format!("Failed to get intervention step: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;

    let response = state
        .intervention_service
        .get_step(&step_id)
        .map_err(|e| AppError::Database(format!("Failed to get intervention step: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;

    Ok(ApiResponse::success(response))
}