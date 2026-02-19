//! Client Task Integration Service - Relationship management between clients and tasks
//!
//! This service handles the relationship between clients and tasks including:
//! - Client-task association integrity
//! - Statistics synchronization with task updates
//! - Orphaned task prevention
//! - Client workload balancing
//! - Cascade operations for client deletion

use crate::db::Database;
use crate::models::client::Client;
use crate::models::task::Task;
use rusqlite::params;
use std::sync::Arc;

/// Service for managing client-task relationships
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
        // First get the client
        let client = self.get_client_by_id(client_id)?;

        // Then get all tasks for this client
        let tasks = self.get_tasks_for_client(client_id)?;

        // Calculate real-time statistics
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
            .query_as::<Task>(sql, params![client_id])
            .map_err(|e| format!("Failed to get tasks for client: {}", e))
    }

    /// Update client statistics when tasks change
    /// Note: client_statistics is a view, so no manual updates are needed
    pub fn sync_client_statistics(&self, _client_id: &str) -> Result<(), String> {
        // client_statistics is a dynamic view, no manual updates needed
        Ok(())
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
        let now = chrono::Utc::now().timestamp_millis();

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
                    row.get::<_, String>(0)?,         // client_id
                    row.get::<_, String>(1)?,         // name
                    row.get::<_, String>(2)?,         // email
                    row.get::<_, String>(3)?,         // phone
                    row.get::<_, i32>(4)?,            // overdue_count
                    row.get::<_, Option<String>>(5)?, // overdue_titles
                ))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<(String, String, String, String, i32, Option<String>)>, _>>()
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
        // Validate that both clients exist
        self.get_client_by_id(from_client_id)?;
        self.get_client_by_id(to_client_id)?;

        // Update task assignments
        let sql = "UPDATE tasks SET client_id = ?, updated_by = ?, updated_at = ? WHERE client_id = ? AND deleted_at IS NULL";

        let now = chrono::Utc::now().timestamp_millis();
        let affected_rows = self
            .db
            .execute(sql, params![to_client_id, user_id, now, from_client_id])
            .map_err(|e| format!("Failed to reassign tasks: {}", e))?;

        // Note: client statistics are calculated dynamically via view, no manual sync needed

        Ok(affected_rows as i32)
    }

    /// Handle client deletion - cascade or prevent based on tasks
    pub fn handle_client_deletion(
        &self,
        client_id: &str,
        cascade: bool,
    ) -> Result<ClientDeletionResult, String> {
        // Check for existing tasks
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
            // Soft delete all associated tasks
            let now = chrono::Utc::now().timestamp_millis();
            let sql = "UPDATE tasks SET deleted_at = ?, deleted_by = ? WHERE client_id = ? AND deleted_at IS NULL";

            let affected_tasks = self
                .db
                .execute(sql, params![now, "system", client_id])
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
                    row.get::<_, String>(0)?,      // client_id
                    row.get::<_, String>(1)?,      // client_name
                    row.get::<_, i32>(2)?,         // total_tasks
                    row.get::<_, i32>(3)?,         // pending_tasks
                    row.get::<_, i32>(4)?,         // in_progress_tasks
                    row.get::<_, i32>(5)?,         // completed_tasks
                    row.get::<_, Option<f64>>(6)?, // avg_estimated_duration
                ))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<(String, String, i32, i32, i32, i32, Option<f64>)>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let mut results = Vec::new();
        for (
            client_id,
            client_name,
            total_tasks,
            pending_tasks,
            in_progress_tasks,
            completed_tasks,
            avg_estimated_duration,
        ) in rows
        {
            results.push(ClientWorkload {
                client_id,
                client_name,
                total_tasks,
                pending_tasks,
                in_progress_tasks,
                completed_tasks,
                avg_estimated_duration,
            });
        }

        Ok(results)
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
                    row.get::<_, i32>(0)?,         // total_tasks
                    row.get::<_, i32>(1)?,         // active_tasks
                    row.get::<_, i32>(2)?,         // completed_tasks
                    row.get::<_, Option<i64>>(3)?, // last_task_date
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

// Supporting data structures

#[derive(Debug)]
pub struct ClientWithTasks {
    pub client: Client,
    pub tasks: Vec<Task>,
    pub stats: ClientTaskStats,
}

#[derive(Debug)]
pub struct ClientTaskStats {
    pub total_tasks: i32,
    pub active_tasks: i32,
    pub completed_tasks: i32,
    pub last_task_date: Option<i64>,
}

#[derive(Debug)]
pub struct ClientWithOverdueTasks {
    pub client: Client,
    pub overdue_task_count: i32,
    pub overdue_task_titles: Vec<String>,
}

#[derive(Debug)]
pub enum ClientDeletionResult {
    SafeToDelete,
    PreventedDueToTasks(i32),
    Cascaded { deleted_tasks: i32 },
}

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
