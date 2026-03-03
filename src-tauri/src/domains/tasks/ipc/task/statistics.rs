//! Task statistics and analytics
//!
//! This module handles task analytics and reporting operations.

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::infrastructure::task_statistics::TaskStatistics;
use crate::domains::tasks::ipc::task_types::TaskFilter;
use serde::Deserialize;
use tracing::{debug, info};

/// Request for getting task statistics summary
#[derive(Deserialize, Debug)]
pub struct TaskStatisticsRequest {
    pub session_token: String,
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
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    debug!("Getting comprehensive task statistics");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);

    // Apply role-based filtering
    let mut filter = request.filter.unwrap_or_default();
    filter.apply_role_scope(&session.role, &session.user_id);

    // Get statistics from service
    let stats = state.task_service.get_task_statistics().map_err(|e| {
        debug!("Failed to get task statistics: {}", e);
        AppError::db_sanitized("get_task_statistics", &e)
    })?;

    info!("Retrieved comprehensive task statistics");

    Ok(ApiResponse::success(stats).with_correlation_id(Some(correlation_id.clone())))
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
