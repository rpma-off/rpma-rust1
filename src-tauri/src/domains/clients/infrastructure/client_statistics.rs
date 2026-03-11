//! Client Statistics & Task Integration Service
//!
//! This service handles client analytics and task relationship management:
//! - Client activity metrics calculation
//! - Task completion rates by client
//! - Revenue/profitability tracking
//! - Geographic distribution analysis
//! - Client lifecycle reporting (creation to completion)
//! - Client-task association integrity
//! - Client workload balancing
//! - Cascade operations for client deletion

use crate::db::Database;
use crate::shared::services::cross_domain::{Client, Task};
use chrono::{Datelike, Timelike, Utc};
use rusqlite;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// TODO: document
#[derive(Debug, Serialize, Deserialize)]
pub struct ClientStats {
    pub total_clients: i32,
    pub active_clients: i32,
    pub inactive_clients: i32,
    pub new_clients_this_month: i32,
    pub clients_by_type: HashMap<String, i32>,
}

/// TODO: document
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

/// TODO: document
#[derive(Debug, Serialize, Deserialize)]
pub struct ClientGeographicStats {
    pub clients_by_state: HashMap<String, i32>,
    pub clients_by_city: HashMap<String, i32>,
    pub top_regions: Vec<(String, i32)>,
}

/// TODO: document
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

    /// Execute a SQL query that returns (String, i32) pairs — used to de-duplicate
    /// the repetitive prepare/query_map/collect pattern in geographic stats.
    fn query_key_count(
        conn: &rusqlite::Connection,
        sql: &str,
    ) -> Result<Vec<(String, i32)>, String> {
        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        // Assign to a named variable so the borrow on `stmt` ends at the
        // semicolon and does not leak into the function's tail expression.
        let rows: Result<Vec<(String, i32)>, _> = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect();
        rows.map_err(|e| format!("Failed to collect results: {}", e))
    }

    /// Get geographic distribution of clients.
    ///
    /// All three queries share a single pooled connection acquired once at the
    /// start of the method, reducing pool pressure compared to the previous
    /// pattern of calling `get_connection()` for each query.
    pub fn get_geographic_stats(&self) -> Result<ClientGeographicStats, String> {
        let conn = self.db.as_ref().get_connection()?;

        let clients_by_state: HashMap<String, i32> = Self::query_key_count(
            &conn,
            "SELECT address_state, COUNT(*) as count FROM clients \
             WHERE deleted_at IS NULL AND address_state IS NOT NULL \
             GROUP BY address_state ORDER BY count DESC",
        )?
        .into_iter()
        .collect();

        let clients_by_city: HashMap<String, i32> = Self::query_key_count(
            &conn,
            "SELECT address_city, COUNT(*) as count FROM clients \
             WHERE deleted_at IS NULL AND address_city IS NOT NULL \
             GROUP BY address_city ORDER BY count DESC LIMIT 20",
        )?
        .into_iter()
        .collect();

        let top_regions: Vec<(String, i32)> = Self::query_key_count(
            &conn,
            "SELECT COALESCE(address_state, 'Unknown') || ', ' || \
                    COALESCE(address_city, 'Unknown') as region, \
                    COUNT(*) as count \
             FROM clients WHERE deleted_at IS NULL \
             GROUP BY address_state, address_city \
             ORDER BY count DESC LIMIT 10",
        )?;

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

// ── Client-Task Integration Types ───────────────────────────────────────────

/// Client with its associated tasks and real-time stats.
#[derive(Debug)]
pub struct ClientWithTasks {
    pub client: Client,
    pub tasks: Vec<Task>,
    pub stats: ClientTaskStats,
}

/// Aggregated task counts for a single client.
#[derive(Debug)]
pub struct ClientTaskStats {
    pub total_tasks: i32,
    pub active_tasks: i32,
    pub completed_tasks: i32,
    pub last_task_date: Option<i64>,
}

/// Client with overdue task summary.
#[derive(Debug)]
pub struct ClientWithOverdueTasks {
    pub client: Client,
    pub overdue_task_count: i32,
    pub overdue_task_titles: Vec<String>,
}

/// Result of a client deletion attempt.
#[derive(Debug)]
pub enum ClientDeletionResult {
    SafeToDelete,
    PreventedDueToTasks(i32),
    Cascaded { deleted_tasks: i32 },
}

/// Per-client workload distribution snapshot.
#[derive(Debug)]
pub struct ClientWorkload {
    pub client_id: String,
    pub client_name: String,
    pub total_tasks: i32,
    pub pending_tasks: i32,
    pub in_progress_tasks: i32,
    pub completed_tasks: i32,
    pub avg_estimated_duration: Option<f64>,
}

// ── Client-Task Integration Service ─────────────────────────────────────────

/// Service for managing client-task relationships (task lookups, deletion
/// cascades, workload distribution, etc.)
#[derive(Debug)]
pub struct ClientTaskIntegrationService {
    db: Arc<Database>,
}

impl ClientTaskIntegrationService {
    /// Create a new ClientTaskIntegrationService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get client with all associated tasks
    pub fn get_client_with_tasks(&self, client_id: &str) -> Result<ClientWithTasks, String> {
        let client = self.get_client_by_id(client_id)?;
        let tasks = self.get_tasks_for_client(client_id)?;
        let stats = self.calculate_client_task_stats(client_id)?;

        Ok(ClientWithTasks {
            client,
            tasks,
            stats,
        })
    }

    /// Get tasks for a specific client
    pub fn get_tasks_for_client(&self, client_id: &str) -> Result<Vec<Task>, String> {
        let sql = r#"
            SELECT
                t.id, t.title, t.description, t.status, t.priority, t.task_type,
                t.scheduled_date, t.due_date, t.completed_at, t.estimated_duration,
                t.actual_duration, t.location_lat, t.location_lng, t.location_accuracy,
                t.weather_conditions, t.temperature, t.notes, t.tags, t.attachments,
                t.client_id, t.technician_id, t.created_at, t.updated_at, t.created_by,
                t.updated_by, t.deleted_at, t.deleted_by, t.synced, t.last_synced_at,
                t.intervention_id, t.step_id
            FROM tasks t
            WHERE t.client_id = ? AND t.deleted_at IS NULL
            ORDER BY t.created_at DESC
        "#;

        self.db
            .query_as::<Task>(sql, rusqlite::params![client_id])
            .map_err(|e| format!("Failed to get tasks for client: {}", e))
    }

    /// Check if client has active tasks (for deletion validation)
    pub fn client_has_active_tasks(&self, client_id: &str) -> Result<bool, String> {
        let count: i64 = self.db
            .as_ref()
            .query_single_value(
                "SELECT COUNT(*) FROM tasks WHERE client_id = ? AND status IN ('pending', 'in_progress') AND deleted_at IS NULL",
                rusqlite::params![client_id],
            )
            .map_err(|e| format!("Failed to check active tasks: {}", e))?;

        Ok(count > 0)
    }

    /// Get clients with overdue tasks
    pub fn get_clients_with_overdue_tasks(&self) -> Result<Vec<ClientWithOverdueTasks>, String> {
        let now = Utc::now().timestamp_millis();

        let sql = r#"
            SELECT
                c.id, c.name, c.email, c.phone,
                COUNT(CASE WHEN t.due_date < ? AND t.status != 'completed' THEN 1 END) as overdue_count,
                GROUP_CONCAT(CASE WHEN t.due_date < ? AND t.status != 'completed' THEN t.title END) as overdue_titles
            FROM clients c
            INNER JOIN tasks t ON c.id = t.client_id
            WHERE c.deleted_at IS NULL AND t.deleted_at IS NULL
            GROUP BY c.id, c.name, c.email, c.phone
            HAVING overdue_count > 0
            ORDER BY overdue_count DESC
        "#;

        let conn = self.db.as_ref().get_connection()?;
        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        let rows = stmt
            .query_map(rusqlite::params![now, now], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, i32>(4)?,
                    row.get::<_, Option<String>>(5)?,
                ))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let mut results = Vec::new();
        for (client_id, _name, _email, _phone, overdue_count, overdue_titles_str) in rows {
            let client = self.get_client_by_id(&client_id)?;

            let overdue_task_titles = if let Some(titles) = overdue_titles_str {
                titles.split(',').map(|s| s.to_string()).collect()
            } else {
                Vec::new()
            };

            results.push(ClientWithOverdueTasks {
                client,
                overdue_task_count: overdue_count,
                overdue_task_titles,
            });
        }

        Ok(results)
    }

    /// Reassign tasks from one client to another (for client mergers)
    pub fn reassign_tasks(
        &self,
        from_client_id: &str,
        to_client_id: &str,
        user_id: &str,
    ) -> Result<i32, String> {
        self.get_client_by_id(from_client_id)?;
        self.get_client_by_id(to_client_id)?;

        let sql = "UPDATE tasks SET client_id = ?, updated_by = ?, updated_at = ? WHERE client_id = ? AND deleted_at IS NULL";
        let now = Utc::now().timestamp_millis();
        let affected_rows = self
            .db
            .execute(sql, rusqlite::params![to_client_id, user_id, now, from_client_id])
            .map_err(|e| format!("Failed to reassign tasks: {}", e))?;

        Ok(affected_rows as i32)
    }

    /// Handle client deletion - cascade or prevent based on tasks
    pub fn handle_client_deletion(
        &self,
        client_id: &str,
        cascade: bool,
    ) -> Result<ClientDeletionResult, String> {
        let task_count: i64 = self
            .db
            .as_ref()
            .query_single_value(
                "SELECT COUNT(*) FROM tasks WHERE client_id = ? AND deleted_at IS NULL",
                rusqlite::params![client_id],
            )
            .map_err(|e| format!("Failed to check task count: {}", e))?;

        if task_count > 0 && !cascade {
            return Ok(ClientDeletionResult::PreventedDueToTasks(task_count as i32));
        }

        if cascade {
            let now = Utc::now().timestamp_millis();
            let sql = "UPDATE tasks SET deleted_at = ?, deleted_by = ? WHERE client_id = ? AND deleted_at IS NULL";
            let affected_tasks = self
                .db
                .execute(sql, rusqlite::params![now, "system", client_id])
                .map_err(|e| format!("Failed to cascade delete tasks: {}", e))?;

            Ok(ClientDeletionResult::Cascaded {
                deleted_tasks: affected_tasks as i32,
            })
        } else {
            Ok(ClientDeletionResult::SafeToDelete)
        }
    }

    /// Get client workload distribution
    pub fn get_client_workload_distribution(&self) -> Result<Vec<ClientWorkload>, String> {
        let sql = r#"
            SELECT
                c.id, c.name,
                COUNT(t.id) as total_tasks,
                COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
                COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
                AVG(CASE WHEN t.estimated_duration IS NOT NULL THEN t.estimated_duration END) as avg_estimated_duration
            FROM clients c
            LEFT JOIN tasks t ON c.id = t.client_id AND t.deleted_at IS NULL
            WHERE c.deleted_at IS NULL
            GROUP BY c.id, c.name
            ORDER BY total_tasks DESC
        "#;

        let conn = self.db.as_ref().get_connection()?;
        let mut stmt = conn
            .prepare(sql)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i32>(2)?,
                    row.get::<_, i32>(3)?,
                    row.get::<_, i32>(4)?,
                    row.get::<_, i32>(5)?,
                    row.get::<_, Option<f64>>(6)?,
                ))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        Ok(rows
            .into_iter()
            .map(
                |(
                    client_id,
                    client_name,
                    total_tasks,
                    pending_tasks,
                    in_progress_tasks,
                    completed_tasks,
                    avg_estimated_duration,
                )| ClientWorkload {
                    client_id,
                    client_name,
                    total_tasks,
                    pending_tasks,
                    in_progress_tasks,
                    completed_tasks,
                    avg_estimated_duration,
                },
            )
            .collect())
    }

    /// Helper method to get client by ID
    fn get_client_by_id(&self, client_id: &str) -> Result<Client, String> {
        let sql = r#"
            SELECT
                id, name, email, phone, customer_type, address_street, address_city,
                address_state, address_zip, address_country, tax_id, company_name,
                contact_person, notes, tags, total_tasks, active_tasks, completed_tasks,
                last_task_date, created_at, updated_at, created_by, deleted_at,
                deleted_by, synced, last_synced_at
            FROM clients
            WHERE id = ? AND deleted_at IS NULL
        "#;

        self.db
            .as_ref()
            .query_single_as::<Client>(sql, rusqlite::params![client_id])
            .map_err(|e| format!("Failed to get client: {}", e))?
            .ok_or_else(|| format!("Client not found: {}", client_id))
    }

    /// Helper method to calculate client task statistics
    fn calculate_client_task_stats(&self, client_id: &str) -> Result<ClientTaskStats, String> {
        let sql = r#"
            SELECT
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN status IN ('pending', 'in_progress') THEN 1 END) as active_tasks,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                MAX(updated_at) as last_task_date
            FROM tasks
            WHERE client_id = ? AND deleted_at IS NULL
        "#;

        let conn = self.db.as_ref().get_connection()?;
        let row = conn
            .query_row(sql, rusqlite::params![client_id], |row| {
                Ok((
                    row.get::<_, i32>(0)?,
                    row.get::<_, i32>(1)?,
                    row.get::<_, i32>(2)?,
                    row.get::<_, Option<i64>>(3)?,
                ))
            })
            .map_err(|e| format!("Failed to calculate client stats: {}", e))?;

        let (total_tasks, active_tasks, completed_tasks, last_task_date) = row;

        Ok(ClientTaskStats {
            total_tasks,
            active_tasks,
            completed_tasks,
            last_task_date,
        })
    }
}
