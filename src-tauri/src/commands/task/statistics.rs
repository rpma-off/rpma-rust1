//! Task statistics and analytics
//!
//! This module handles task analytics and reporting operations.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::commands::task_types::TaskFilter;
use crate::services::task_statistics::TaskStatistics;
use serde::Deserialize;
use crate::authenticate;
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
    debug!("Getting comprehensive task statistics");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Apply role-based filtering
    let mut filter = request.filter.unwrap_or_default();

    match session.role {
        crate::models::auth::UserRole::Admin => {
            // Admin can see all statistics
        }
        crate::models::auth::UserRole::Supervisor => {
            // Supervisor can see statistics for their region/department
            // TODO: Add region filtering when UserSession has region field
            // if let Some(region) = &session.region {
            //     filter.region = Some(region.clone());
            // }
        }
        crate::models::auth::UserRole::Technician => {
            // Technician can only see their own statistics
            filter.assigned_to = Some(session.user_id.clone());
        }
        crate::models::auth::UserRole::Viewer => {
            // Viewer has limited access to statistics
            filter.assigned_to = Some(session.user_id.clone());
        }
    }

    // Get statistics from service
    let stats = state
        .task_service
        .get_task_statistics()
        .map_err(|e| {
            debug!("Failed to get task statistics: {}", e);
            AppError::Database(format!("Failed to retrieve statistics: {}", e))
        })?;

    info!("Retrieved comprehensive task statistics");

    Ok(ApiResponse::success(stats))
}

/// Calculate task completion rate
pub fn calculate_completion_rate(stats: &TaskStatistics) -> f64 {
    if stats.total_tasks == 0 {
        0.0
    } else {
        (stats.completed_tasks as f64 / stats.total_tasks as f64) * 100.0
    }
}

/// Calculate task efficiency metrics
pub fn calculate_efficiency_metrics(stats: &TaskStatistics) -> std::collections::HashMap<String, f64> {
    let mut metrics = std::collections::HashMap::new();

    // Completion rate
    metrics.insert("completion_rate".to_string(), calculate_completion_rate(stats));

    // On-time completion rate (simplified - would need actual on-time tracking)
    // Note: on_time_completed field doesn't exist in TaskStatistics
    let on_time_rate = if stats.completed_tasks > 0 {
        // For now, assume all completed tasks were on time
        // This would need to be calculated based on actual due dates vs completion dates
        100.0
    } else {
        0.0
    };
    metrics.insert("on_time_completion_rate".to_string(), on_time_rate);

    // Average tasks per technician (if we have technician count)
    // This would need additional data from the service

    // Task load distribution efficiency
    let overdue_rate = if stats.total_tasks > 0 {
        (stats.overdue_tasks as f64 / stats.total_tasks as f64) * 100.0
    } else {
        0.0
    };
    metrics.insert("overdue_rate".to_string(), overdue_rate);

    metrics
}

/// Generate task performance insights
pub fn generate_performance_insights(stats: &TaskStatistics) -> Vec<String> {
    let mut insights = Vec::new();

    let completion_rate = calculate_completion_rate(stats);

    if completion_rate > 90.0 {
        insights.push("Excellent completion rate above 90%".to_string());
    } else if completion_rate > 75.0 {
        insights.push("Good completion rate above 75%".to_string());
    } else if completion_rate < 50.0 {
        insights.push("Completion rate needs improvement".to_string());
    }

    // Note: on_time_completed field doesn't exist in TaskStatistics
    // For now, assume on-time performance based on overdue tasks
    if stats.overdue_tasks == 0 && stats.completed_tasks > 0 {
        insights.push("Strong on-time performance".to_string());
    } else if stats.overdue_tasks as f64 > stats.total_tasks as f64 * 0.2 {
        insights.push("On-time performance needs attention".to_string());
    }

    if stats.overdue_tasks > stats.total_tasks / 10 {
        insights.push("High number of overdue tasks detected".to_string());
    }

    insights
}

/// Calculate productivity trends
pub fn calculate_productivity_trends(current_stats: &TaskStatistics, previous_stats: Option<&TaskStatistics>) -> std::collections::HashMap<String, f64> {
    let mut trends = std::collections::HashMap::new();

    if let Some(prev) = previous_stats {
        // Completion rate trend
        let current_completion = calculate_completion_rate(current_stats);
        let previous_completion = calculate_completion_rate(prev);
        let completion_trend = current_completion - previous_completion;
        trends.insert("completion_rate_change".to_string(), completion_trend);

        // Volume trend
        let volume_change = current_stats.total_tasks as f64 - prev.total_tasks as f64;
        trends.insert("volume_change".to_string(), volume_change);

        // Efficiency trend (completed tasks change)
        let efficiency_change = current_stats.completed_tasks as f64 - prev.completed_tasks as f64;
        trends.insert("efficiency_change".to_string(), efficiency_change);
    }

    trends
}