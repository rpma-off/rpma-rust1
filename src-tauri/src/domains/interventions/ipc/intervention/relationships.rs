//! Intervention relationship operations
//!
//! This module handles complex intervention operations involving
//! multiple entities and joined queries:
//! - Management operations with complex filtering
//! - Operations involving interventions, tasks, and users

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::interventions::{InterventionsFacade, InterventionsCommand, InterventionsResponse};
use crate::resolve_context;
use serde::{Deserialize, Serialize};
use tracing::{info, instrument};

/// TODO: document
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

/// TODO: document
#[derive(Serialize)]
#[serde(tag = "type")]
pub enum InterventionManagementResponse {
    List {
        interventions:
            Vec<crate::domains::interventions::domain::models::intervention::Intervention>,
        total: u64,
        page: u32,
        limit: u32,
    },
    Stats {
        stats: InterventionStats,
    },
    ByTask {
        interventions:
            Vec<crate::domains::interventions::domain::models::intervention::Intervention>,
    },
    BulkUpdated {
        updated_count: usize,
        message: String,
    },
}

/// Intervention aggregate statistics (IPC response type).
#[derive(Serialize)]
pub struct InterventionStats {
    pub total_interventions: u64,
    pub completed_interventions: u64,
    pub in_progress_interventions: u64,
    pub average_completion_time: Option<f64>,
    pub technician_stats: Vec<TechnicianInterventionStats>,
}

/// TODO: document
#[derive(Serialize)]
pub struct TechnicianInterventionStats {
    pub technician_id: String,
    pub technician_name: String,
    pub total_interventions: u64,
    pub completed_interventions: u64,
    pub average_rating: Option<f32>,
}

/// TODO: document
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
///
/// Thin IPC adapter: resolves context, validates input, delegates to the
/// application-layer [`InterventionsFacade`] / [`InterventionService`], and maps the
/// result.  All permission checks and business logic live in those layers.
#[tauri::command]
#[instrument(skip(state))]
pub async fn intervention_management(
    action: InterventionManagementAction,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<InterventionManagementResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    info!("Processing intervention management action");

    let facade = InterventionsFacade::new(state.intervention_service.clone());

    match action {
        InterventionManagementAction::List { query } => {
            let page = query.page.unwrap_or(1);
            let limit = query.limit.unwrap_or(50).min(200);
            let offset = ((page - 1) * limit) as i32;

            // Scope Technicians to their own interventions; higher roles may filter freely.
            let effective_technician_id =
                if ctx.auth.role == crate::shared::contracts::auth::UserRole::Technician {
                    Some(ctx.auth.user_id.clone())
                } else {
                    query.technician_id.clone()
                };

            let (interventions, total) = state
                .intervention_service
                .list_interventions(
                    query.status.as_deref(),
                    effective_technician_id.as_deref(),
                    Some(limit as i32),
                    Some(offset),
                )
                .map_err(|e| AppError::db_sanitized("list_interventions", &e))?;

            Ok(ApiResponse::success(InterventionManagementResponse::List {
                interventions,
                total: total as u64,
                page,
                limit,
            })
            .with_correlation_id(Some(correlation_id.clone())))
        }

        InterventionManagementAction::GetStats {
            technician_id,
            from_date: _,
            to_date: _,
        } => {
            let target_technician_id = technician_id.unwrap_or_else(|| ctx.auth.user_id.clone());

            // Permission check delegated to the application layer.
            facade.check_stats_access(&ctx, &target_technician_id)?;

            // Stats computation delegated to the service layer.
            let agg = state
                .intervention_service
                .get_stats_by_technician(Some(&target_technician_id))
                .map_err(|e| AppError::db_sanitized("get_interventions_for_stats", &e))?;

            let response_stats = InterventionStats {
                total_interventions: agg.total_interventions,
                completed_interventions: agg.completed_interventions,
                in_progress_interventions: agg.in_progress_interventions,
                average_completion_time: agg.average_completion_time,
                technician_stats: vec![],
            };

            Ok(ApiResponse::success(InterventionManagementResponse::Stats {
                stats: response_stats,
            })
            .with_correlation_id(Some(correlation_id.clone())))
        }

        InterventionManagementAction::GetByTask {
            task_id,
            include_completed,
        } => {
            // Access check delegated to the application layer.
            let is_assigned = state
                .task_service
                .check_task_assignment(&task_id, &ctx.auth.user_id)
                .unwrap_or(false);
            facade.check_task_intervention_access(&ctx.auth.role, is_assigned)?;

            let include_completed = include_completed.unwrap_or(true);

            // Data retrieval via facade command dispatch.
            let command = if include_completed {
                InterventionsCommand::GetLatestByTask { task_id }
            } else {
                InterventionsCommand::GetActiveByTask { task_id }
            };
            let interventions = match facade
                .execute(command, &ctx, state.task_service.as_ref())
                .await
                .map_err(|e| AppError::db_sanitized("get_interventions_by_task", &e))?
            {
                InterventionsResponse::OptionalIntervention(Some(i)) => vec![i],
                InterventionsResponse::OptionalIntervention(None) => vec![],
                InterventionsResponse::InterventionList(list) => list,
                _ => vec![],
            };

            Ok(
                ApiResponse::success(InterventionManagementResponse::ByTask { interventions })
                    .with_correlation_id(Some(correlation_id.clone())),
            )
        }

        InterventionManagementAction::BulkUpdate {
            intervention_ids,
            updates,
        } => {
            // Permission check delegated to the application layer.
            facade.ensure_management_access(&ctx)?;

            let update_request: crate::domains::interventions::domain::models::intervention::BulkUpdateInterventionRequest =
                serde_json::from_value(updates).map_err(|e| {
                    AppError::Validation(format!("Invalid bulk update data: {}", e))
                })?;

            let normalized_updates = serde_json::json!({
                "status": update_request.status,
                "technician_id": update_request.technician_id,
                "priority": update_request.priority,
            });

            // Bulk update delegated to the service layer.
            let updated_count = state
                .intervention_service
                .bulk_update_interventions(&intervention_ids, normalized_updates)
                .map_err(|e| AppError::db_sanitized("bulk_update_interventions", &e))?;

            Ok(
                ApiResponse::success(InterventionManagementResponse::BulkUpdated {
                    updated_count,
                    message: format!("Successfully updated {} interventions", updated_count),
                })
                .with_correlation_id(Some(correlation_id.clone())),
            )
        }
    }
}

