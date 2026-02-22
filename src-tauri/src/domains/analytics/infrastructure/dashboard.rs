//! Dashboard service for aggregating statistics and metrics

use crate::domains::analytics::infrastructure::dashboard_repository::DashboardRepository;
use serde_json::{Map, Value};
use std::sync::Arc;
use tracing::debug;

#[derive(Clone, Debug)]
pub struct DashboardService {
    repo: Arc<DashboardRepository>,
}

impl DashboardService {
    pub fn new(repo: Arc<DashboardRepository>) -> Self {
        Self { repo }
    }

    /// Build date condition for SQL WHERE clause
    fn build_date_condition(&self, time_range: Option<String>) -> Option<String> {
        time_range
            .map(|range| {
                let now = chrono::Utc::now();
                let cutoff_date = match range.as_str() {
                    "day" => now - chrono::Duration::days(1),
                    "week" => now - chrono::Duration::weeks(1),
                    "month" => now - chrono::Duration::days(30),
                    "year" => now - chrono::Duration::days(365),
                    _ => return None,
                };
                Some(format!(
                    "created_at >= '{}'",
                    cutoff_date.format("%Y-%m-%d %H:%M:%S")
                ))
            })
            .flatten()
    }

    /// Get comprehensive dashboard statistics
    pub fn get_dashboard_stats(&self, time_range: Option<String>) -> Result<Value, String> {
        debug!(
            "Retrieving dashboard statistics from service for time range: {:?}",
            time_range
        );

        let mut stats = Map::new();

        // Get task statistics
        let task_stats = self.get_task_statistics(time_range.clone())?;
        stats.insert("tasks".to_string(), task_stats);

        // Get client statistics
        let client_stats = self.get_client_statistics(time_range.clone())?;
        stats.insert("clients".to_string(), client_stats);

        // Get user statistics
        let user_stats = self.get_user_statistics(time_range)?;
        stats.insert("users".to_string(), user_stats);

        // Get sync status (simplified for now)
        let sync_stats = self.get_sync_status_simple()?;
        stats.insert("sync".to_string(), sync_stats);

        debug!("Dashboard statistics retrieved successfully");
        Ok(Value::Object(stats))
    }

    /// Get task statistics from database
    fn get_task_statistics(&self, time_range: Option<String>) -> Result<Value, String> {
        let mut stats = Map::new();

        // Calculate date filter based on time range
        let date_condition = self.build_date_condition(time_range.clone());

        // Total tasks (with date filter if provided)
        let total_tasks = self.repo.count_tasks(date_condition.as_deref())?;
        stats.insert("total".to_string(), Value::Number(total_tasks.into()));

        // For now, use mock data for task status breakdown since we need to ensure table structure
        // In a real implementation, these would be calculated with date filters
        let multiplier = match time_range.as_deref() {
            Some("day") => 0.1,
            Some("week") => 0.3,
            Some("month") => 0.7,
            Some("year") | _ => 1.0,
        };

        stats.insert(
            "active".to_string(),
            Value::Number(((8.0 * multiplier) as i64).into()),
        );
        stats.insert(
            "completed".to_string(),
            Value::Number(((16.0 * multiplier) as i64).into()),
        );
        stats.insert(
            "pending".to_string(),
            Value::Number(((3.0 * multiplier) as i64).into()),
        );

        Ok(Value::Object(stats))
    }

    /// Get client statistics from database
    fn get_client_statistics(&self, time_range: Option<String>) -> Result<Value, String> {
        let mut stats = Map::new();

        // Total clients (clients don't have creation dates in current schema, so no filtering)
        let total_clients = self.repo.count_rows("clients")?;
        stats.insert("total".to_string(), Value::Number(total_clients.into()));

        // For now, use mock data for active clients
        // In a real implementation, this would filter by last activity date
        let multiplier = match time_range.as_deref() {
            Some("day") => 0.2,
            Some("week") => 0.5,
            Some("month") => 0.8,
            Some("year") | _ => 1.0,
        };

        stats.insert(
            "active".to_string(),
            Value::Number(((35.0 * multiplier) as i64).into()),
        );

        Ok(Value::Object(stats))
    }

    /// Get user statistics from database
    fn get_user_statistics(&self, time_range: Option<String>) -> Result<Value, String> {
        let mut stats = Map::new();

        // Total users (users don't have creation dates in current schema, so no filtering)
        let total_users = self.repo.count_rows("users")?;
        stats.insert("total".to_string(), Value::Number(total_users.into()));

        // For now, use mock data for user breakdown
        // In a real implementation, this would filter by last login date
        let multiplier = match time_range.as_deref() {
            Some("day") => 0.3,
            Some("week") => 0.6,
            Some("month") => 0.9,
            Some("year") | _ => 1.0,
        };

        stats.insert(
            "active".to_string(),
            Value::Number(((12.0 * multiplier) as i64).into()),
        );
        stats.insert("admins".to_string(), Value::Number(2.into()));
        stats.insert("technicians".to_string(), Value::Number(8.into()));

        Ok(Value::Object(stats))
    }

    /// Get sync status (simplified)
    fn get_sync_status_simple(&self) -> Result<Value, String> {
        let mut stats = Map::new();

        // For now, return basic sync status
        // In a real implementation, this would get actual sync metrics
        stats.insert("status".to_string(), Value::String("online".to_string()));
        stats.insert("pending_operations".to_string(), Value::Number(0.into()));
        stats.insert("completed_operations".to_string(), Value::Number(42.into()));

        Ok(Value::Object(stats))
    }

    /// Get recent activities for admin dashboard
    pub fn get_recent_activities(&self) -> Result<Vec<Value>, String> {
        // Delegate SQL queries to repository
        let mut activities = self.repo.get_recent_session_activities(10)?;
        let task_activities = self.repo.get_recent_task_activities(5)?;
        activities.extend(task_activities);

        // Sort by timestamp (most recent first) and limit
        activities.sort_by(|a, b| {
            let a_time = a.get("timestamp").and_then(|t| t.as_str()).unwrap_or("");
            let b_time = b.get("timestamp").and_then(|t| t.as_str()).unwrap_or("");
            b_time.cmp(a_time)
        });

        activities.truncate(15);

        Ok(activities)
    }
}
