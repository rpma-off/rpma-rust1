//! Intervention workflow operations
//!
//! This module handles the core intervention workflow operations:
//! - Starting interventions
//! - Updating intervention state
//! - Deleting interventions
//! - Finalizing interventions

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::auth::{UserRole, UserSession};
use chrono::Utc;
use serde::Deserialize;

use tracing::info;

/// Workflow action types
#[derive(Deserialize, Debug)]
#[serde(tag = "action")]
pub enum InterventionWorkflowAction {
    Start { data: StartInterventionRequest },
    Get { id: String },
    GetActiveByTask { task_id: String },
    Update { id: String, data: serde_json::Value },
    Delete { id: String },
    Finalize { data: FinalizeInterventionRequest },
}

/// Workflow response types
#[derive(serde::Serialize, Debug)]
#[serde(tag = "type")]
pub enum InterventionWorkflowResponse {
    Started {
        intervention: crate::models::intervention::Intervention,
        steps: Vec<crate::models::step::InterventionStep>,
    },
    Retrieved {
        intervention: crate::models::intervention::Intervention,
    },
    ActiveByTask {
        interventions: Vec<crate::models::intervention::Intervention>,
    },
    Updated {
        id: String,
        message: String,
    },
    Deleted {
        id: String,
        message: String,
    },
    Finalized {
        intervention: crate::models::intervention::Intervention,
    },
}

fn ensure_technician_assignment(
    session: &UserSession,
    assigned_technician_id: Option<&str>,
    action: &str,
) -> Result<(), AppError> {
    if !matches!(session.role, UserRole::Technician) {
        return Ok(());
    }

    if assigned_technician_id != Some(session.user_id.as_str()) {
        return Err(AppError::Authorization(format!(
            "Technician can only {} for assigned tasks",
            action
        )));
    }

    Ok(())
}

async fn ensure_task_assignment(
    state: &AppState<'_>,
    session: &UserSession,
    task_id: &str,
    action: &str,
) -> Result<(), AppError> {
    if !matches!(session.role, UserRole::Technician) {
        return Ok(());
    }

    let task = state
        .task_service
        .get_task_async(task_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to get task: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Task {} not found", task_id)))?;

    ensure_technician_assignment(session, task.technician_id.as_deref(), action)
}

/// Request structure for starting an intervention
#[derive(Deserialize, Debug)]
pub struct StartInterventionRequest {
    pub task_id: String,
    pub intervention_type: String,
    pub priority: String,
    pub description: Option<String>,
    pub estimated_duration_minutes: Option<u32>,
}

/// Request structure for finalizing an intervention
#[derive(Deserialize, Debug)]
pub struct FinalizeInterventionRequest {
    pub intervention_id: String,
    pub collected_data: Option<serde_json::Value>,
    pub photos: Option<Vec<String>>,
    pub customer_satisfaction: Option<i32>,
    pub quality_score: Option<i32>,
    pub final_observations: Option<Vec<String>>,
    pub customer_signature: Option<String>,
    pub customer_comments: Option<String>,
}

/// Start a new intervention
#[tauri::command]

pub async fn intervention_start(
    request: StartInterventionRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::intervention::Intervention>, AppError> {
    info!("Starting intervention for task: {}", request.task_id);

    let session = authenticate!(&session_token, &state);
    super::ensure_intervention_permission(&session)?;
    ensure_task_assignment(&state, &session, &request.task_id, "start interventions").await?;

    // Check if there's already an active intervention for this task
    match state
        .intervention_service
        .get_active_intervention_by_task(&request.task_id)
    {
        Ok(Some(active_intervention)) => {
            tracing::warn!("Attempted to start intervention for task {} but active intervention already exists: {}", request.task_id, active_intervention.id);
            return Err(AppError::Validation(format!(
                "An active intervention already exists for task {}",
                request.task_id
            )));
        }
        Ok(None) => {
            // No active intervention, proceed
        }
        Err(e) => {
            tracing::error!("Failed to check for existing active interventions: {}", e);
            return Err(AppError::Database(format!(
                "Failed to validate existing interventions: {}",
                e
            )));
        }
    }

    // Create intervention data - convert to StartInterventionRequest
    let intervention_data = crate::services::intervention_types::StartInterventionRequest {
        task_id: request.task_id.clone(),
        intervention_number: None,
        ppf_zones: vec![], // Default empty
        custom_zones: None,
        film_type: "Standard".to_string(), // Default
        film_brand: None,
        film_model: None,
        weather_condition: "Indoor".to_string(), // Default
        lighting_condition: "Good".to_string(),  // Default
        work_location: "Workshop".to_string(),   // Default
        temperature: None,
        humidity: None,
        technician_id: session.user_id.clone(),
        assistant_ids: None,
        scheduled_start: chrono::Utc::now().to_rfc3339(),
        estimated_duration: request.estimated_duration_minutes.unwrap_or(60) as i32,
        gps_coordinates: None,
        address: None,
        notes: request.description,
        customer_requirements: None,
        special_instructions: None,
    };

    let correlation_id = format!("cmd-{}", Utc::now().timestamp_millis());

    state
        .intervention_service
        .start_intervention(intervention_data, &session.user_id, &correlation_id)
        .map(|response| ApiResponse::success(response.intervention))
        .map_err(|e| {
            tracing::error!("Failed to start intervention: {}", e);
            AppError::Database(format!("Failed to start intervention: {}", e))
        })
}

/// Update an intervention
#[tauri::command]

pub async fn intervention_update(
    id: String,
    data: serde_json::Value,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::intervention::Intervention>, AppError> {
    info!("Updating intervention: {}", id);

    let session = authenticate!(&session_token, &state);
    super::ensure_intervention_permission(&session)?;
    let intervention = state
        .intervention_service
        .get_intervention(&id)
        .map_err(|e| AppError::Database(format!("Failed to get intervention: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;

    ensure_technician_assignment(
        &session,
        intervention.technician_id.as_deref(),
        "update interventions",
    )?;

    state
        .intervention_service
        .update_intervention(&id, data)
        .map(ApiResponse::success)
        .map_err(|e| {
            tracing::error!("Failed to update intervention {}: {}", id, e);
            AppError::Database(format!("Failed to update intervention: {}", e))
        })
}

/// Delete an intervention
#[tauri::command]

pub async fn intervention_delete(
    id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Deleting intervention: {}", id);

    let session = authenticate!(&session_token, &state);
    super::ensure_intervention_permission(&session)?;

    // Check permissions (only admin or assigned technician can delete)
    let intervention = state
        .intervention_service
        .get_intervention(&id)
        .map_err(|e| {
            tracing::error!("Failed to get intervention for deletion: {}", e);
            AppError::Database(format!("Failed to get intervention: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;

    if intervention.technician_id.as_ref() != Some(&session.user_id)
        && !matches!(
            session.role,
            crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
        )
    {
        return Err(AppError::Authorization(
            "Not authorized to delete this intervention".to_string(),
        ));
    }

    state
        .intervention_service
        .delete_intervention(&id)
        .map(|_| ApiResponse::success("Intervention deleted successfully".to_string()))
        .map_err(|e| {
            tracing::error!("Failed to delete intervention {}: {}", id, e);
            AppError::Database(format!("Failed to delete intervention: {}", e))
        })
}

/// Finalize an intervention
#[tauri::command]

pub async fn intervention_finalize(
    request: FinalizeInterventionRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::services::intervention_types::FinalizeInterventionResponse>, AppError>
{
    info!("Finalizing intervention: {}", request.intervention_id);

    let session = authenticate!(&session_token, &state);
    super::ensure_intervention_permission(&session)?;

    let finalize_data = crate::services::intervention_types::FinalizeInterventionRequest {
        intervention_id: request.intervention_id.clone(),
        collected_data: request.collected_data,
        photos: request.photos,
        customer_satisfaction: request.customer_satisfaction,
        quality_score: request.quality_score,
        final_observations: request.final_observations,
        customer_signature: request.customer_signature,
        customer_comments: request.customer_comments,
    };

    state
        .intervention_service
        .finalize_intervention(finalize_data, "finalize-cmd", Some(&session.user_id))
        .map(ApiResponse::success)
        .map_err(|e| {
            tracing::error!(
                "Failed to finalize intervention {}: {}",
                request.intervention_id,
                e
            );
            AppError::Database(format!("Failed to finalize intervention: {}", e))
        })
}

/// Main intervention workflow command (unified interface)
#[tauri::command]

pub async fn intervention_workflow(
    action: InterventionWorkflowAction,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    info!("Processing intervention workflow action");

    let session = authenticate!(&session_token, &state);

    match action {
        InterventionWorkflowAction::Start { data } => {
            super::ensure_intervention_permission(&session)?;
            info!("Starting intervention workflow for task: {}", data.task_id);
            ensure_task_assignment(&state, &session, &data.task_id, "start interventions").await?;

            // Check if there's already an active intervention for this task
            match state
                .intervention_service
                .get_active_intervention_by_task(&data.task_id)
            {
                Ok(Some(active_intervention)) => {
                    tracing::warn!("Attempted to start intervention workflow for task {} but active intervention already exists: {}", data.task_id, active_intervention.id);
                    return Err(AppError::Validation(format!(
                        "An active intervention already exists for task {}",
                        data.task_id
                    )));
                }
                Ok(None) => {
                    info!(
                        "No active intervention found for task {}, proceeding with creation",
                        data.task_id
                    );
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to check for existing active interventions for task {}: {}",
                        data.task_id,
                        e
                    );
                    return Err(AppError::Database(format!(
                        "Failed to validate existing interventions: {}",
                        e
                    )));
                }
            }

            // Generate correlation ID if needed
            let correlation_id = crate::logging::correlation::generate_correlation_id();

            // Convert command request to service request
            let service_request = crate::services::intervention_types::StartInterventionRequest {
                task_id: data.task_id.clone(),
                intervention_number: None, // Will be generated by service
                ppf_zones: vec![],         // Not provided in simple request
                custom_zones: None,
                film_type: "Standard".to_string(), // Default
                film_brand: None,
                film_model: None,
                weather_condition: "Indoor".to_string(),
                lighting_condition: "Good".to_string(),
                work_location: "Workshop".to_string(),
                temperature: None,
                humidity: None,
                technician_id: session.user_id.clone(),
                assistant_ids: None,
                scheduled_start: chrono::Utc::now().to_rfc3339(),
                estimated_duration: data.estimated_duration_minutes.unwrap_or(60) as i32,
                gps_coordinates: None,
                address: None,
                notes: data.description.clone(),
                customer_requirements: None,
                special_instructions: None,
            };

            info!(
                "Creating intervention for task {} with technician {}",
                data.task_id, session.user_id
            );

            let response = state
                .intervention_service
                .start_intervention(service_request, &session.user_id, &correlation_id)
                .map_err(|e| {
                    tracing::error!(
                        "Failed to start intervention for task {}: {}",
                        data.task_id,
                        e
                    );
                    AppError::Database(format!("Failed to start intervention: {}", e))
                })?;

            info!(
                "Successfully started intervention {} for task {} with {} steps",
                response.intervention.id,
                data.task_id,
                response.steps.len()
            );

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Started {
                    intervention: response.intervention,
                    steps: response.steps,
                },
            ))
        }

        InterventionWorkflowAction::Get { id } => {
            let intervention = state
                .intervention_service
                .get_intervention(&id)
                .map_err(|e| AppError::Database(format!("Failed to get intervention: {}", e)))?
                .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Retrieved { intervention },
            ))
        }

        InterventionWorkflowAction::GetActiveByTask { task_id } => {
            info!("Getting active intervention for task: {}", task_id);

            let intervention = state
                .intervention_service
                .get_active_intervention_by_task(&task_id)
                .map_err(|e| {
                    AppError::Database(format!("Failed to get active intervention: {}", e))
                })?;

            // Log the result for debugging
            match &intervention {
                Some(intervention) => {
                    info!(
                        "Found active intervention {} for task {} with status: {}",
                        intervention.id, task_id, intervention.status
                    );
                }
                None => {
                    info!("No active intervention found for task {}", task_id);
                }
            }

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::ActiveByTask {
                    interventions: intervention.map_or(vec![], |i| vec![i]),
                },
            ))
        }

        InterventionWorkflowAction::Update { id, data } => {
            super::ensure_intervention_permission(&session)?;
            // Actually update the intervention with the provided data
            state
                .intervention_service
                .update_intervention(&id, data)
                .map_err(|e| AppError::Database(format!("Failed to update intervention: {}", e)))?;

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Updated {
                    id,
                    message: "Intervention updated successfully".to_string(),
                },
            ))
        }

        InterventionWorkflowAction::Delete { id } => {
            super::ensure_intervention_permission(&session)?;
            state
                .intervention_service
                .delete_intervention(&id)
                .map_err(|e| AppError::Database(format!("Failed to delete intervention: {}", e)))?;

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Deleted {
                    id,
                    message: "Intervention deleted".to_string(),
                },
            ))
        }

        InterventionWorkflowAction::Finalize { data } => {
            super::ensure_intervention_permission(&session)?;
            let intervention = state
                .intervention_service
                .get_intervention(&data.intervention_id)
                .map_err(|e| AppError::Database(format!("Failed to get intervention: {}", e)))?
                .ok_or_else(|| {
                    AppError::NotFound(format!("Intervention {} not found", data.intervention_id))
                })?;

            ensure_technician_assignment(
                &session,
                intervention.technician_id.as_deref(),
                "finalize interventions",
            )?;
            let finalize_data = crate::services::intervention_types::FinalizeInterventionRequest {
                intervention_id: data.intervention_id.clone(),
                collected_data: None,
                photos: None,
                customer_satisfaction: data.customer_satisfaction,
                quality_score: None,
                final_observations: data.final_observations,
                customer_signature: None,
                customer_comments: None,
            };

            let response = state
                .intervention_service
                .finalize_intervention(finalize_data, "finalize-cmd", Some(&session.user_id))
                .map_err(|e| {
                    AppError::Database(format!("Failed to finalize intervention: {}", e))
                })?;

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Finalized {
                    intervention: response.intervention,
                },
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn session_with_role(role: UserRole, user_id: &str) -> UserSession {
        let now = Utc::now().to_rfc3339();
        UserSession {
            id: "session-id".to_string(),
            user_id: user_id.to_string(),
            username: "test-user".to_string(),
            email: "test@example.com".to_string(),
            role,
            token: "token".to_string(),
            refresh_token: None,
            expires_at: now.clone(),
            last_activity: now.clone(),
            created_at: now,
            device_info: None,
            ip_address: None,
            user_agent: None,
            location: None,
            two_factor_verified: false,
            session_timeout_minutes: None,
        }
    }

    #[test]
    fn test_ensure_technician_assignment_allows_admin() {
        let session = session_with_role(UserRole::Admin, "admin-1");
        let result = ensure_technician_assignment(&session, None, "start interventions");
        assert!(result.is_ok());
    }

    #[test]
    fn test_ensure_technician_assignment_blocks_unassigned() {
        let session = session_with_role(UserRole::Technician, "tech-1");
        let result = ensure_technician_assignment(&session, Some("tech-2"), "finalize");
        assert!(result.is_err());
    }

    #[test]
    fn test_ensure_technician_assignment_allows_assigned() {
        let session = session_with_role(UserRole::Technician, "tech-1");
        let result = ensure_technician_assignment(&session, Some("tech-1"), "start");
        assert!(result.is_ok());
    }
}
