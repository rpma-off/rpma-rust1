//! Client Statistics Service - Analytics and reporting for clients
//!
//! This service handles client analytics including:
//! - Client activity metrics calculation
//! - Task completion rates by client
//! - Revenue/profitability tracking
//! - Geographic distribution analysis
//! - Client lifecycle reporting (creation to completion)

use crate::db::Database;
use chrono::{Datelike, Timelike, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
pub struct ClientStats {
    pub total_clients: i32,
    pub active_clients: i32,
    pub inactive_clients: i32,
    pub new_clients_this_month: i32,
    pub clients_by_type: HashMap<String, i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClientActivityMetrics {
    pub client_id: String,
    pub total_tasks: i32,
    pub completed_tasks: i32,
    pub active_tasks: i32,
    pub completion_rate: f64,
    pub average_task_duration: Option<f64>, // in hours
    pub last_activity_date: Option<i64>,
    pub total_revenue: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClientGeographicStats {
    pub clients_by_state: HashMap<String, i32>,
    pub clients_by_city: HashMap<String, i32>,
    pub top_regions: Vec<(String, i32)>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClientLifecycleReport {
    pub client_id: String,
    pub created_at: i64,
    pub first_task_date: Option<i64>,
    pub last_task_date: Option<i64>,
    pub total_lifetime_value: Option<f64>,
    pub average_task_frequency: Option<f64>, // tasks per month
    pub retention_score: f64,                // 0-100 based on activity patterns
}

/// Client type count for aggregation queries
#[derive(Debug)]
struct ClientTypeCount {
    customer_type: String,
    count: i32,
}

impl crate::db::FromSqlRow for ClientTypeCount {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(ClientTypeCount {
            customer_type: row.get(0)?,
            count: row.get(1)?,
        })
    }
}

/// Service for client statistics and analytics
#[derive(Debug)]
pub struct ClientStatisticsService {
    db: Arc<Database>,
}

impl ClientStatisticsService {
    /// Create a new ClientStatisticsService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get overall client statistics
    pub fn get_client_stats(&self) -> Result<ClientStats, String> {
        // Get total clients
        let total_clients: i32 = self
            .db
            .as_ref()
            .query_single_value("SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL", [])
            .map_err(|e| format!("Failed to get total clients: {}", e))?;

        // Get active clients (with tasks in last 90 days)
        let ninety_days_ago = Utc::now().timestamp_millis() - (90 * 24 * 60 * 60 * 1000);
        let active_clients: i32 = self
            .db
            .as_ref()
            .query_single_value(
                "SELECT COUNT(DISTINCT c.id) FROM clients c
                 INNER JOIN tasks t ON c.id = t.client_id
                 WHERE c.deleted_at IS NULL AND t.created_at >= ? AND t.deleted_at IS NULL",
                rusqlite::params![ninety_days_ago],
            )
            .map_err(|e| format!("Failed to get active clients: {}", e))?;

        let inactive_clients = total_clients - active_clients;

        // Get new clients this month
        let start_of_month = Utc::now()
            .with_day(1)
            .unwrap()
            .with_hour(0)
            .unwrap()
            .with_minute(0)
            .unwrap()
            .with_second(0)
            .unwrap()
            .timestamp_millis();

        let new_clients_this_month: i32 = self
            .db
            .as_ref()
            .query_single_value(
                "SELECT COUNT(*) FROM clients WHERE created_at >= ? AND deleted_at IS NULL",
                rusqlite::params![start_of_month],
            )
            .unwrap_or(0);

        // Get clients by type
        let sql = "SELECT customer_type, COUNT(*) as count FROM clients WHERE deleted_at IS NULL GROUP BY customer_type";
        let conn = self.db.as_ref().get_connection()?;
        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        let type_stats = stmt
            .query_map([], |row| {
                Ok(ClientTypeCount {
                    customer_type: row.get(0)?,
                    count: row.get(1)?,
                })
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<ClientTypeCount>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let mut clients_by_type = HashMap::new();
        for stat in type_stats {
            clients_by_type.insert(stat.customer_type, stat.count);
        }

        Ok(ClientStats {
            total_clients,
            active_clients,
            inactive_clients,
            new_clients_this_month,
            clients_by_type,
        })
    }

    /// Get activity metrics for a specific client
    pub fn get_client_activity_metrics(
        &self,
        client_id: &str,
    ) -> Result<ClientActivityMetrics, String> {
        // Get task statistics
        let sql = r#"
            SELECT
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN status IN ('pending', 'in_progress') THEN 1 END) as active_tasks,
                MAX(updated_at) as last_activity_date
            FROM tasks
            WHERE client_id = ? AND deleted_at IS NULL
        "#;

        let conn = self.db.as_ref().get_connection()?;
        let row = conn
            .query_row(sql, rusqlite::params![client_id], |row| {
                Ok((
                    row.get::<_, i32>(0)?,         // total_tasks
                    row.get::<_, i32>(1)?,         // completed_tasks
                    row.get::<_, i32>(2)?,         // active_tasks
                    row.get::<_, Option<i64>>(3)?, // last_activity_date
                ))
            })
            .map_err(|e| format!("Failed to get task statistics: {}", e))?;

        let (total_tasks, completed_tasks, active_tasks, last_activity_date) = row;

        Ok(ClientActivityMetrics {
            client_id: client_id.to_string(),
            total_tasks,
            completed_tasks,
            active_tasks,
            completion_rate: if total_tasks > 0 {
                (completed_tasks as f64 / total_tasks as f64) * 100.0
            } else {
                0.0
            },
            average_task_duration: None, // Would need additional query
            last_activity_date,
            total_revenue: None,
        })
    }

    /// Get geographic distribution of clients
    pub fn get_geographic_stats(&self) -> Result<ClientGeographicStats, String> {
        // Clients by state
        let state_sql = "SELECT address_state, COUNT(*) as count FROM clients WHERE deleted_at IS NULL AND address_state IS NOT NULL GROUP BY address_state ORDER BY count DESC";
        let conn = self.db.as_ref().get_connection()?;
        let mut stmt = conn
            .prepare(state_sql)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        let state_rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<(String, i32)>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let mut clients_by_state = HashMap::new();
        for (state, count) in state_rows {
            clients_by_state.insert(state, count);
        }

        // Clients by city
        let city_sql = "SELECT address_city, COUNT(*) as count FROM clients WHERE deleted_at IS NULL AND address_city IS NOT NULL GROUP BY address_city ORDER BY count DESC LIMIT 20";
        let conn = self.db.as_ref().get_connection()?;
        let mut stmt = conn
            .prepare(city_sql)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        let city_rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<(String, i32)>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let mut clients_by_city = HashMap::new();
        for (city, count) in city_rows {
            clients_by_city.insert(city, count);
        }

        // Top regions (state + city combinations)
        let region_sql = r#"
            SELECT
                COALESCE(address_state, 'Unknown') || ', ' || COALESCE(address_city, 'Unknown') as region,
                COUNT(*) as count
            FROM clients
            WHERE deleted_at IS NULL
            GROUP BY address_state, address_city
            ORDER BY count DESC
            LIMIT 10
        "#;

        let mut stmt = conn
            .prepare(region_sql)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        let region_rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<(String, i32)>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let mut top_regions = Vec::new();
        for (region, count) in region_rows {
            top_regions.push((region, count));
        }

        Ok(ClientGeographicStats {
            clients_by_state,
            clients_by_city,
            top_regions,
        })
    }

    /// Get client lifecycle report
    pub fn get_client_lifecycle_report(
        &self,
        client_id: &str,
    ) -> Result<ClientLifecycleReport, String> {
        // Get client creation date
        let created_at: i64 = self
            .db
            .as_ref()
            .query_single_value(
                "SELECT created_at FROM clients WHERE id = ? AND deleted_at IS NULL",
                rusqlite::params![client_id],
            )
            .map_err(|e| format!("Failed to get client creation date: {}", e))?;

        // Get first and last task dates
        let task_dates_sql = r#"
            SELECT
                MIN(created_at) as first_task_date,
                MAX(updated_at) as last_task_date,
                COUNT(*) as total_tasks
            FROM tasks
            WHERE client_id = ? AND deleted_at IS NULL
        "#;

        let conn = self.db.as_ref().get_connection()?;
        let row = conn
            .query_row(task_dates_sql, rusqlite::params![client_id], |row| {
                Ok((
                    row.get::<_, Option<i64>>(0)?, // first_task_date
                    row.get::<_, Option<i64>>(1)?, // last_task_date
                    row.get::<_, i32>(2)?,         // total_tasks
                ))
            })
            .map_err(|e| format!("Failed to get task dates: {}", e))?;

        let (first_task_date, last_task_date, total_tasks) = row;

        // Calculate average task frequency (tasks per month)
        let average_task_frequency = if let (Some(first), Some(last)) =
            (first_task_date, last_task_date)
        {
            if last > first {
                let months_diff = ((last - first) as f64) / (30.0 * 24.0 * 60.0 * 60.0 * 1000.0);
                if months_diff > 0.0 {
                    Some(total_tasks as f64 / months_diff)
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        // Calculate retention score based on activity patterns
        let retention_score = self.calculate_retention_score(client_id, total_tasks)?;

        // Placeholder for lifetime value calculation
        let total_lifetime_value = None;

        Ok(ClientLifecycleReport {
            client_id: client_id.to_string(),
            created_at,
            first_task_date,
            last_task_date,
            total_lifetime_value,
            average_task_frequency,
            retention_score,
        })
    }

    /// Calculate retention score (0-100) based on activity patterns
    fn calculate_retention_score(&self, _client_id: &str, total_tasks: i32) -> Result<f64, String> {
        // Simple retention score based on task volume
        // In a real implementation, this would consider recency, frequency, monetary value
        let base_score = match total_tasks {
            0 => 0.0,
            1..=5 => 25.0,
            6..=15 => 50.0,
            16..=30 => 75.0,
            _ => 100.0,
        };

        Ok(base_score)
    }

    /// Get top clients by activity
    pub fn get_top_clients_by_activity(
        &self,
        limit: i32,
    ) -> Result<Vec<ClientActivityMetrics>, String> {
        let sql = r#"
            SELECT
                c.id,
                COALESCE(cs.total_tasks, 0) as total_tasks,
                COALESCE(cs.completed_tasks, 0) as completed_tasks,
                COALESCE(cs.active_tasks, 0) as active_tasks,
                cs.last_task_date
            FROM clients c
            LEFT JOIN client_statistics cs ON c.id = cs.id
            WHERE c.deleted_at IS NULL
            ORDER BY COALESCE(cs.total_tasks, 0) DESC
            LIMIT ?
        "#;

        let conn = self.db.as_ref().get_connection()?;
        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        let rows = stmt
            .query_map(rusqlite::params![limit], |row| {
                Ok((
                    row.get::<_, String>(0)?,      // client_id
                    row.get::<_, i32>(1)?,         // total_tasks
                    row.get::<_, i32>(2)?,         // completed_tasks
                    row.get::<_, i32>(3)?,         // active_tasks
                    row.get::<_, Option<i64>>(4)?, // last_activity_date
                ))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<(String, i32, i32, i32, Option<i64>)>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let mut results = Vec::new();
        for (client_id, total_tasks, completed_tasks, active_tasks, last_activity_date) in rows {
            let completion_rate = if total_tasks > 0 {
                (completed_tasks as f64 / total_tasks as f64) * 100.0
            } else {
                0.0
            };

            results.push(ClientActivityMetrics {
                client_id,
                total_tasks,
                completed_tasks,
                active_tasks,
                completion_rate,
                average_task_duration: None, // Would need additional query
                last_activity_date,
                total_revenue: None,
            });
        }

        Ok(results)
    }
}
