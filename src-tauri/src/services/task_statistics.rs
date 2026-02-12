//! Task statistics and analytics module
//!
//! This module handles task statistics calculations and reporting.

use crate::db::Database;

use rusqlite::params;
use serde::Serialize;
use std::sync::Arc;
use tracing::debug;

/// Task statistics response
#[derive(Debug, Serialize)]
pub struct TaskStatistics {
    pub total_tasks: i64,
    pub draft_tasks: i64,
    pub scheduled_tasks: i64,
    pub in_progress_tasks: i64,
    pub completed_tasks: i64,
    pub cancelled_tasks: i64,
    pub on_hold_tasks: i64,
    pub pending_tasks: i64,
    pub invalid_tasks: i64,
    pub archived_tasks: i64,
    pub failed_tasks: i64,
    pub overdue_tasks: i64,
    pub assigned_tasks: i64,
    pub paused_tasks: i64,
}

/// Service for task statistics and analytics
#[derive(Debug)]
pub struct TaskStatisticsService {
    db: Arc<Database>,
}

impl TaskStatisticsService {
    /// Create a new TaskStatisticsService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get comprehensive task statistics
    pub fn get_task_statistics(&self) -> Result<TaskStatistics, String> {
        debug!("TaskStatisticsService: calculating task statistics");

        let sql = r#"
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'invalid' THEN 1 ELSE 0 END) as invalid,
                SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
                SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused
            FROM tasks WHERE deleted_at IS NULL
        "#;

        let result = self
            .db
            .query_row_tuple(sql, [], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, Option<i64>>(1)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(2)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(4)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(5)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(6)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(7)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(8)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(9)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(10)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(11)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(12)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(13)?.unwrap_or(0),
                ))
            })
            .map_err(|e| format!("Failed to get task statistics: {}", e))?;

        Ok(TaskStatistics {
            total_tasks: result.0,
            draft_tasks: result.1,
            scheduled_tasks: result.2,
            in_progress_tasks: result.3,
            completed_tasks: result.4,
            cancelled_tasks: result.5,
            on_hold_tasks: result.6,
            pending_tasks: result.7,
            invalid_tasks: result.8,
            archived_tasks: result.9,
            failed_tasks: result.10,
            overdue_tasks: result.11,
            assigned_tasks: result.12,
            paused_tasks: result.13,
        })
    }

    /// Get task completion rate over time
    pub fn get_completion_rate(&self, days: i32) -> Result<f64, String> {
        let sql = r#"
            SELECT
                COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)
            FROM tasks
            WHERE created_at >= strftime('%s000', 'now', '-' || ? || ' days') * 1000
              AND deleted_at IS NULL
        "#;

        self.db
            .query_single_value(sql, params![days])
            .map(|rate: Option<f64>| rate.unwrap_or(0.0))
            .map_err(|e| format!("Failed to get completion rate: {}", e))
    }

    /// Get average task duration by status
    pub fn get_average_duration_by_status(&self) -> Result<Vec<(String, f64)>, String> {
        let sql = r#"
            SELECT
                status,
                AVG(CASE
                    WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
                    THEN (completed_at - started_at) / 1000.0 / 60.0  -- Convert to minutes
                    ELSE NULL
                END) as avg_duration_minutes
            FROM tasks
            WHERE deleted_at IS NULL
              AND status IN ('completed', 'in_progress', 'scheduled')
            GROUP BY status
            ORDER BY avg_duration_minutes DESC
        "#;

        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let result: Result<Vec<(String, f64)>, _> = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<f64>>(1)?.unwrap_or(0.0),
                ))
            })
            .map_err(|e| e.to_string())?
            .collect();
        result.map_err(|e| format!("Failed to get average duration by status: {}", e))
    }

    /// Get tasks by priority distribution
    pub fn get_priority_distribution(&self) -> Result<Vec<(String, i64)>, String> {
        let sql = r#"
            SELECT priority, COUNT(*) as count
            FROM tasks
            WHERE deleted_at IS NULL
            GROUP BY priority
            ORDER BY count DESC
        "#;

        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let result: Result<Vec<(String, i64)>, _> = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            })
            .map_err(|e| e.to_string())?
            .collect();
        result.map_err(|e| format!("Failed to get priority distribution: {}", e))
    }
}

/// Calculate task completion rate as a percentage
pub fn calculate_completion_rate(stats: &TaskStatistics) -> f64 {
    if stats.total_tasks == 0 {
        0.0
    } else {
        (stats.completed_tasks as f64 / stats.total_tasks as f64) * 100.0
    }
}

/// Calculate task efficiency metrics
pub fn calculate_efficiency_metrics(
    stats: &TaskStatistics,
) -> std::collections::HashMap<String, f64> {
    let mut metrics = std::collections::HashMap::new();

    // Completion rate
    metrics.insert(
        "completion_rate".to_string(),
        calculate_completion_rate(stats),
    );

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
pub fn calculate_productivity_trends(
    current_stats: &TaskStatistics,
    previous_stats: Option<&TaskStatistics>,
) -> std::collections::HashMap<String, f64> {
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
