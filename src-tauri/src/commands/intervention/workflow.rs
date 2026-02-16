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

use tracing::{debug, error, info, instrument, warn};

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
        .map_err(|e| {
            tracing::error!(error = %e, task_id = task_id, "Failed to get task for assignment check");
            AppError::Database("Failed to get task".to_string())
        })?
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
    #[serde(default)]
    pub correlation_id: Option<String>,
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
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Start a new intervention
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(task_id = %request.task_id, user_id))]
pub async fn intervention_start(
    request: StartInterventionRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::intervention::Intervention>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Starting intervention for task: {}", request.task_id);

    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    super::ensure_intervention_permission(&session)?;
    ensure_task_assignment(&state, &session, &request.task_id, "start interventions").await?;

    // Check if there's already an active intervention for this task
    match state
        .intervention_service
        .get_active_intervention_by_task(&request.task_id)
    {
        Ok(Some(active_intervention)) => {
            warn!(task_id = %request.task_id, active_intervention_id = %active_intervention.id, "Attempted to start intervention but active intervention already exists");
            return Err(AppError::Validation(format!(
                "An active intervention already exists for task {}",
                request.task_id
            )));
        }
        Ok(None) => {
            // No active intervention, proceed
        }
        Err(e) => {
            error!(error = %e, task_id = %request.task_id, "Failed to check for existing active interventions");
            return Err(AppError::Database(
                "Failed to validate existing interventions".to_string(),
            ));
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

    let svc_correlation_id = format!("cmd-{}", Utc::now().timestamp_millis());

    state
        .intervention_service
        .start_intervention(intervention_data, &session.user_id, &svc_correlation_id)
        .map(|response| ApiResponse::success(response.intervention).with_correlation_id(Some(correlation_id.clone())))
        .map_err(|e| {
            error!(error = %e, task_id = %request.task_id, "Failed to start intervention");
            AppError::Database("Failed to start intervention".to_string())
        })
}

/// Update an intervention
#[tauri::command]
#[instrument(skip(state, session_token, data), fields(user_id))]
pub async fn intervention_update(
    id: String,
    data: serde_json::Value,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::intervention::Intervention>, AppError> {
    info!("Updating intervention: {}", id);

    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    super::ensure_intervention_permission(&session)?;
    let intervention = state
        .intervention_service
        .get_intervention(&id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %id, "Failed to get intervention for update");
            AppError::Database("Failed to get intervention".to_string())
        })?
        .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;

    ensure_technician_assignment(
        &session,
        intervention.technician_id.as_deref(),
        "update interventions",
    )?;

    state
        .intervention_service
        .update_intervention(&id, data)
        .map(|v| ApiResponse::success(v).with_correlation_id(Some(correlation_id.clone())))
        .map_err(|e| {
            error!(error = %e, intervention_id = %id, "Failed to update intervention");
            AppError::Database("Failed to update intervention".to_string())
        })
}

/// Delete an intervention
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn intervention_delete(
    id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Deleting intervention: {}", id);

    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    super::ensure_intervention_permission(&session)?;

    // Check permissions (only admin or assigned technician can delete)
    let intervention = state
        .intervention_service
        .get_intervention(&id)
        .map_err(|e| {
            error!(error = %e, intervention_id = %id, "Failed to get intervention for deletion");
            AppError::Database("Failed to get intervention".to_string())
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
        .map(|_| ApiResponse::success("Intervention deleted successfully".to_string()).with_correlation_id(Some(correlation_id.clone())))
        .map_err(|e| {
            error!(error = %e, intervention_id = %id, "Failed to delete intervention");
            AppError::Database("Failed to delete intervention".to_string())
        })
}

/// Finalize an intervention
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(intervention_id = %request.intervention_id, user_id, correlation_id))]
pub async fn intervention_finalize(
    request: FinalizeInterventionRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::services::intervention_types::FinalizeInterventionResponse>, AppError>
{
    let req_correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Finalizing intervention: {}", request.intervention_id);

    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    let correlation_id = crate::logging::correlation::generate_correlation_id();
    tracing::Span::current().record("correlation_id", &correlation_id.as_str());
    super::ensure_intervention_permission(&session)?;

    debug!(
        correlation_id = %correlation_id,
        intervention_id = %request.intervention_id,
        "Finalizing intervention via command"
    );

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
        .finalize_intervention(finalize_data, &correlation_id, Some(&session.user_id))
        .map(|v| ApiResponse::success(v).with_correlation_id(Some(req_correlation_id.clone())))
        .map_err(|e| {
            error!(error = %e, intervention_id = %request.intervention_id, "Failed to finalize intervention");
            AppError::Database("Failed to finalize intervention".to_string())
        })
}

/// Main intervention workflow command (unified interface)
#[tauri::command]
#[instrument(skip(state, session_token, action), fields(user_id, correlation_id))]
pub async fn intervention_workflow(
    action: InterventionWorkflowAction,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionWorkflowResponse>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let session = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);
    tracing::Span::current().record("user_id", &session.user_id.as_str());
    let svc_correlation_id = crate::logging::correlation::generate_correlation_id();
    tracing::Span::current().record("correlation_id", &svc_correlation_id.as_str());

    info!(correlation_id = %svc_correlation_id, "Processing intervention workflow action");

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
                    warn!(task_id = %data.task_id, active_intervention_id = %active_intervention.id, "Attempted to start intervention workflow but active intervention already exists");
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
                    error!(error = %e, task_id = %data.task_id, "Failed to check for existing active interventions");
                    return Err(AppError::Database(
                        "Failed to validate existing interventions".to_string(),
                    ));
                }
            }

            // Generate correlation ID for service call
            let start_correlation_id = crate::logging::correlation::generate_correlation_id();

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
                .start_intervention(service_request, &session.user_id, &start_correlation_id)
                .map_err(|e| {
                    error!(error = %e, task_id = %data.task_id, "Failed to start intervention via workflow");
                    AppError::Database("Failed to start intervention".to_string())
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
            ).with_correlation_id(Some(correlation_id.clone())))
        }

        InterventionWorkflowAction::Get { id } => {
            let intervention = state
                .intervention_service
                .get_intervention(&id)
                .map_err(|e| {
                    error!(error = %e, intervention_id = %id, "Failed to get intervention via workflow");
                    AppError::Database("Failed to get intervention".to_string())
                })?
                .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Retrieved { intervention },
            ).with_correlation_id(Some(correlation_id.clone())))
        }

        InterventionWorkflowAction::GetActiveByTask { task_id } => {
            info!("Getting active intervention for task: {}", task_id);

            let intervention = state
                .intervention_service
                .get_active_intervention_by_task(&task_id)
                .map_err(|e| {
                    error!(error = %e, task_id = %task_id, "Failed to get active intervention via workflow");
                    AppError::Database("Failed to get active intervention".to_string())
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
            ).with_correlation_id(Some(correlation_id.clone())))
        }

        InterventionWorkflowAction::Update { id, data } => {
            super::ensure_intervention_permission(&session)?;
            // Actually update the intervention with the provided data
            state
                .intervention_service
                .update_intervention(&id, data)
                .map_err(|e| {
                    error!(error = %e, intervention_id = %id, "Failed to update intervention via workflow");
                    AppError::Database("Failed to update intervention".to_string())
                })?;

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Updated {
                    id,
                    message: "Intervention updated successfully".to_string(),
                },
            ).with_correlation_id(Some(correlation_id.clone())))
        }

        InterventionWorkflowAction::Delete { id } => {
            super::ensure_intervention_permission(&session)?;
            state
                .intervention_service
                .delete_intervention(&id)
                .map_err(|e| {
                    error!(error = %e, intervention_id = %id, "Failed to delete intervention via workflow");
                    AppError::Database("Failed to delete intervention".to_string())
                })?;

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Deleted {
                    id,
                    message: "Intervention deleted".to_string(),
                },
            ).with_correlation_id(Some(correlation_id.clone())))
        }

        InterventionWorkflowAction::Finalize { data } => {
            super::ensure_intervention_permission(&session)?;
            debug!(
                correlation_id = %svc_correlation_id,
                intervention_id = %data.intervention_id,
                "Finalizing intervention via workflow"
            );
            let intervention = state
                .intervention_service
                .get_intervention(&data.intervention_id)
                .map_err(|e| {
                    error!(error = %e, intervention_id = %data.intervention_id, "Failed to get intervention for finalization via workflow");
                    AppError::Database("Failed to get intervention".to_string())
                })?
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
                collected_data: data.collected_data,
                photos: data.photos,
                customer_satisfaction: data.customer_satisfaction,
                quality_score: data.quality_score,
                final_observations: data.final_observations,
                customer_signature: data.customer_signature,
                customer_comments: data.customer_comments,
            };

            let response = state
                .intervention_service
                .finalize_intervention(finalize_data, &svc_correlation_id, Some(&session.user_id))
                .map_err(|e| {
                    error!(error = %e, intervention_id = %data.intervention_id, "Failed to finalize intervention via workflow");
                    AppError::Database("Failed to finalize intervention".to_string())
                })?;

            Ok(ApiResponse::success(
                InterventionWorkflowResponse::Finalized {
                    intervention: response.intervention,
                },
            ).with_correlation_id(Some(correlation_id.clone())))
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
