//! Dashboard repository for aggregating statistics queries
//!
//! Extracts raw SQL from DashboardService into the repository layer,
//! following the 4-layer architecture pattern.

use crate::db::Database;
use rusqlite::params;
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone, Debug)]
pub struct DashboardRepository {
    db: Arc<Database>,
}

impl DashboardRepository {
    const MAX_ACTIVITY_LIMIT: usize = 100;

    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Count tasks matching an optional WHERE condition
    pub fn count_tasks(&self, where_condition: Option<&str>) -> Result<i64, String> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        let query = match where_condition {
            Some(condition) => format!("SELECT COUNT(*) FROM tasks WHERE {}", condition),
            None => "SELECT COUNT(*) FROM tasks".to_string(),
        };

        let count: i64 = conn
            .query_row(&query, [], |row| row.get(0))
            .map_err(|e| format!("Failed to count tasks: {}", e))?;

        Ok(count)
    }

    /// Count all rows in a given table
    pub fn count_rows(&self, table: &str) -> Result<i64, String> {
        let count = self
            .db
            .count_rows(table)
            .map_err(|e| format!("Failed to count {}: {}", table, e))?;
        Ok(count as i64)
    }

    /// Fetch recent user session activity (logins)
    pub fn get_recent_session_activities(&self, limit: usize) -> Result<Vec<Value>, String> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        let mut activities = Vec::new();
        let safe_limit = limit.clamp(1, Self::MAX_ACTIVITY_LIMIT);

        if let Ok(mut stmt) = conn.prepare(
            "SELECT s.user_id, u.username, s.last_activity
             FROM sessions s
             JOIN users u ON s.user_id = u.id
             ORDER BY s.last_activity DESC
             LIMIT ?1",
        ) {
            if let Ok(session_iter) = stmt.query_map(params![safe_limit as i64], |row| {
                Ok(serde_json::json!({
                    "id": format!("session_{}", row.get::<_, String>(0)?),
                    "type": "user_login",
                    "description": format!("{} s'est connecté", row.get::<_, String>(1)?),
                    "timestamp": row.get::<_, i64>(2).map(|ms| {
                        chrono::DateTime::<chrono::Utc>::from_timestamp_millis(ms)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_default()
                    })?,
                    "user": row.get::<_, String>(1)?,
                    "severity": "low"
                }))
            }) {
                for activity in session_iter {
                    if let Ok(act) = activity {
                        activities.push(act);
                    }
                }
            }
        }

        Ok(activities)
    }

    /// Fetch recent task creation activity
    pub fn get_recent_task_activities(&self, limit: usize) -> Result<Vec<Value>, String> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        let mut activities = Vec::new();
        let safe_limit = limit.clamp(1, Self::MAX_ACTIVITY_LIMIT);

        if let Ok(mut stmt) = conn.prepare(
            "SELECT t.id, t.title, t.created_at, u.username
             FROM tasks t
             LEFT JOIN users u ON t.assigned_to = u.id
             ORDER BY t.created_at DESC
             LIMIT ?1",
        ) {
            if let Ok(task_iter) = stmt.query_map(params![safe_limit as i64], |row| {
                let task_id: String = row.get(0)?;
                let title: String = row.get(1)?;
                let created_at: String = row.get(2)?;
                let username: Option<String> = row.get(3).ok();

                Ok(serde_json::json!({
                    "id": format!("task_{}", task_id),
                    "type": "task_created",
                    "description": format!("Tâche créée: {}", title),
                    "timestamp": created_at,
                    "user": username.unwrap_or_else(|| "Système".to_string()),
                    "severity": "low"
                }))
            }) {
                for activity in task_iter {
                    if let Ok(act) = activity {
                        activities.push(act);
                    }
                }
            }
        }

        Ok(activities)
    }
}
