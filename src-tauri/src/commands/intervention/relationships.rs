//! Intervention relationship operations
//!
//! This module handles complex intervention operations involving
//! multiple entities and joined queries:
//! - Management operations with complex filtering
//! - Operations involving interventions, tasks, and users

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Deserialize, Debug)]
#[serde(tag = "action")]
pub enum InterventionManagementAction {
    List {
        query: InterventionQueryRequest,
    },
    GetStats {
        technician_id: Option<String>,
        from_date: Option<String>,
        to_date: Option<String>,
    },
    GetByTask {
        task_id: String,
        include_completed: Option<bool>,
    },
    BulkUpdate {
        intervention_ids: Vec<String>,
        updates: serde_json::Value,
    },
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum InterventionManagementResponse {
    List {
        interventions: Vec<crate::models::intervention::Intervention>,
        total: u64,
        page: u32,
        limit: u32,
    },
    Stats {
        stats: InterventionStats,
    },
    ByTask {
        interventions: Vec<crate::models::intervention::Intervention>,
    },
    BulkUpdated {
        updated_count: usize,
        message: String,
    },
}

#[derive(Serialize)]
pub struct InterventionStats {
    pub total_interventions: u64,
    pub completed_interventions: u64,
    pub in_progress_interventions: u64,
    pub average_completion_time: Option<f64>,
    pub technician_stats: Vec<TechnicianInterventionStats>,
}

#[derive(Serialize)]
pub struct TechnicianInterventionStats {
    pub technician_id: String,
    pub technician_name: String,
    pub total_interventions: u64,
    pub completed_interventions: u64,
    pub average_rating: Option<f32>,
}

#[derive(Deserialize, Debug)]
pub struct InterventionQueryRequest {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub status: Option<String>,
    pub technician_id: Option<String>,
    pub client_id: Option<String>,
    pub task_id: Option<String>,
    pub intervention_type: Option<String>,
    pub priority: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

/// Main intervention management command (unified interface)
#[tauri::command]

pub async fn intervention_management(
    action: InterventionManagementAction,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionManagementResponse>, AppError> {
    info!("Processing intervention management action");

    let session = authenticate!(&session_token, &state);

    match action {
        InterventionManagementAction::List { query } => {
            // Build filter based on user role and permissions
            let query_status_clone = query.status.clone();
            let filter_status = query_status_clone.as_deref();
            let _filter = crate::models::intervention::InterventionFilter {
                technician_id: if session.role == crate::models::auth::UserRole::Technician {
                    Some(session.user_id.clone())
                } else {
                    query.technician_id.clone()
                },
                task_id: query.task_id,
                client_id: query.client_id,
                status: query.status,
                priority: query.priority,
                intervention_type: query.intervention_type,
                from_date: query.from_date,
                to_date: query.to_date,
            };

            let page = query.page.unwrap_or(1);
            let limit = query.limit.unwrap_or(50).min(200);

            let offset = ((page - 1) * limit) as i32;
            let (interventions, total) = state
                .intervention_service
                .list_interventions(
                    filter_status,
                    query.technician_id.as_deref(),
                    Some(limit as i32),
                    Some(offset),
                )
                .map_err(|e| AppError::Database(format!("Failed to list interventions: {}", e)))?;

            Ok(ApiResponse::success(InterventionManagementResponse::List {
                interventions,
                total: total as u64,
                page,
                limit,
            }))
        }

        InterventionManagementAction::GetStats {
            technician_id,
            from_date: _,
            to_date: _,
        } => {
            // Check permissions for viewing stats
            let target_technician_id = technician_id.unwrap_or(session.user_id.clone());

            if target_technician_id != session.user_id
                && session.role != crate::models::auth::UserRole::Admin
                && session.role != crate::models::auth::UserRole::Supervisor
            {
                return Err(AppError::Authorization(
                    "Not authorized to view these statistics".to_string(),
                ));
            }

            // TODO: Implement proper stats calculation
            // For now, return basic stats
            let (interventions, _) = state
                .intervention_service
                .list_interventions(None, Some(&target_technician_id), None, None)
                .map_err(|e| {
                    AppError::Database(format!("Failed to get interventions for stats: {}", e))
                })?;

            let total_interventions = interventions.len() as u64;
            let completed_interventions = interventions
                .iter()
                .filter(|i| {
                    matches!(
                        i.status,
                        crate::models::intervention::InterventionStatus::Completed
                    )
                })
                .count() as u64;
            let in_progress_interventions = interventions
                .iter()
                .filter(|i| {
                    matches!(
                        i.status,
                        crate::models::intervention::InterventionStatus::InProgress
                    )
                })
                .count() as u64;

            let response_stats = InterventionStats {
                total_interventions,
                completed_interventions,
                in_progress_interventions,
                average_completion_time: None, // TODO: Calculate from actual data
                technician_stats: vec![],      // TODO: Implement technician stats
            };

            Ok(ApiResponse::success(
                InterventionManagementResponse::Stats {
                    stats: response_stats,
                },
            ))
        }

        InterventionManagementAction::GetByTask {
            task_id,
            include_completed,
        } => {
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

            let include_completed = include_completed.unwrap_or(true);
            let interventions = if include_completed {
                // For now, just return the latest intervention when include_completed is true
                // TODO: Implement a method to get all interventions for a task
                match state
                    .intervention_service
                    .get_latest_intervention_by_task(&task_id)
                    .map_err(|e| {
                        AppError::Database(format!("Failed to get interventions by task: {}", e))
                    })? {
                    Some(intervention) => vec![intervention],
                    None => vec![],
                }
            } else {
                match state
                    .intervention_service
                    .get_active_intervention_by_task(&task_id)
                    .map_err(|e| {
                        AppError::Database(format!(
                            "Failed to get active interventions by task: {}",
                            e
                        ))
                    })? {
                    Some(intervention) => vec![intervention],
                    None => vec![],
                }
            };

            Ok(ApiResponse::success(
                InterventionManagementResponse::ByTask { interventions },
            ))
        }

        InterventionManagementAction::BulkUpdate {
            intervention_ids,
            updates,
        } => {
            // Only admins and supervisors can do bulk updates
            if session.role != crate::models::auth::UserRole::Admin
                && session.role != crate::models::auth::UserRole::Supervisor
            {
                return Err(AppError::Authorization(
                    "Not authorized to perform bulk updates".to_string(),
                ));
            }

            // Parse updates
            let update_request: crate::models::intervention::BulkUpdateInterventionRequest =
                serde_json::from_value(updates).map_err(|e| {
                    AppError::Validation(format!("Invalid bulk update data: {}", e))
                })?;

            // TODO: Implement proper bulk update method
            // For now, perform individual updates
            let mut updated_count = 0;
            for intervention_id in &intervention_ids {
                // Convert bulk update to individual update
                let updates = serde_json::json!({
                    "status": update_request.status,
                    "technician_id": update_request.technician_id,
                    "priority": update_request.priority,
                });

                if state
                    .intervention_service
                    .update_intervention(intervention_id, updates)
                    .is_ok()
                {
                    updated_count += 1;
                }
            }

            Ok(ApiResponse::success(
                InterventionManagementResponse::BulkUpdated {
                    updated_count,
                    message: format!("Successfully updated {} interventions", updated_count),
                },
            ))
        }
    }
}
