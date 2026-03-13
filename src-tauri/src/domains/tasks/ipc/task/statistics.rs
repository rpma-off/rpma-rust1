//! Task statistics and analytics
//!
//! This module handles task analytics and reporting operations.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::infrastructure::task_statistics::TaskStatistics;
use crate::domains::tasks::ipc::task_types::TaskFilter;
use crate::resolve_context;
use serde::Deserialize;
use tracing::{debug, info};

/// Request for getting task statistics summary
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct TaskStatisticsRequest {
    pub filter: Option<TaskFilter>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Get comprehensive task statistics
#[tracing::instrument(skip(state))]
pub async fn get_task_statistics(
    request: TaskStatisticsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<TaskStatistics>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    debug!("Getting comprehensive task statistics");

    // Apply role-based filtering
    let mut filter = request.filter.unwrap_or_default();
    filter.apply_role_scope(&ctx.auth.role, &ctx.auth.user_id);

    // Get statistics from service
    let stats = state.task_service.get_task_statistics().map_err(|e| {
        debug!("Failed to get task statistics: {}", e);
        AppError::db_sanitized("get_task_statistics", &e)
    })?;

    info!("Retrieved comprehensive task statistics");

    Ok(ApiResponse::success(stats).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Calculate task completion rate
pub fn calculate_completion_rate(stats: &TaskStatistics) -> f64 {
    crate::domains::tasks::infrastructure::task_statistics::calculate_completion_rate(stats)
}

/// Calculate task efficiency metrics
pub fn calculate_efficiency_metrics(
    stats: &TaskStatistics,
) -> std::collections::HashMap<String, f64> {
    crate::domains::tasks::infrastructure::task_statistics::calculate_efficiency_metrics(stats)
}

/// Generate task performance insights
pub fn generate_performance_insights(stats: &TaskStatistics) -> Vec<String> {
    crate::domains::tasks::infrastructure::task_statistics::generate_performance_insights(stats)
}

/// Calculate productivity trends
pub fn calculate_productivity_trends(
    current_stats: &TaskStatistics,
    previous_stats: Option<&TaskStatistics>,
) -> std::collections::HashMap<String, f64> {
    crate::domains::tasks::infrastructure::task_statistics::calculate_productivity_trends(
        current_stats,
        previous_stats,
    )
}
