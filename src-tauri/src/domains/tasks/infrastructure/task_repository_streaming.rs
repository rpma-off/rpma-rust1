//! Task repository streaming implementation
//!
//! Provides streaming query capabilities for large task datasets
//! to improve memory efficiency and responsiveness.

use crate::db::connection::ChunkedQuery;
use crate::db::operation_pool::{OperationPoolManager, OperationType};
use crate::models::task::Task;
use std::sync::Arc;

/// Streaming task repository for handling large result sets
pub struct StreamingTaskRepository {
    pool_manager: Arc<OperationPoolManager>,
}

impl StreamingTaskRepository {
    /// Create a new streaming task repository
    pub fn new(pool_manager: Arc<OperationPoolManager>) -> Self {
        Self { pool_manager }
    }

    /// Stream tasks with filtering using chunked queries
    ///
    /// This method is ideal for large datasets (1000+ tasks) as it
    /// loads data in chunks rather than all at once.
    pub fn stream_tasks_with_filter(
        &self,
        status: Option<String>,
        technician_id: Option<String>,
        client_id: Option<String>,
        chunk_size: usize,
    ) -> Result<ChunkedQuery<Task, impl Fn(&rusqlite::Row) -> Result<Task, rusqlite::Error>>, String>
    {
        use crate::db::FromSqlRow;

        let base_query = format!(
            r#"
            SELECT
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
                assigned_at, assigned_by, scheduled_date, start_time, end_time,
                date_rdv, heure_rdv, template_id, workflow_id, workflow_status,
                current_workflow_step_id, started_at, completed_at, completed_steps,
                client_id, customer_name, customer_email, customer_phone, customer_address,
                external_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration,
                created_at, updated_at, creator_id, created_by, updated_by, deleted_at, deleted_by, synced, last_synced_at
            FROM tasks
            WHERE deleted_at IS NULL
            {}{}{}
            ORDER BY created_at DESC
            "#,
            if status.is_some() {
                "AND status = ?"
            } else {
                ""
            },
            if technician_id.is_some() {
                "AND technician_id = ?"
            } else {
                ""
            },
            if client_id.is_some() {
                "AND client_id = ?"
            } else {
                ""
            }
        );

        let mut params: Vec<rusqlite::types::Value> = Vec::new();
        if let Some(s) = status {
            params.push(s.into());
        }
        if let Some(t) = technician_id {
            params.push(t.into());
        }
        if let Some(c) = client_id {
            params.push(c.into());
        }

        // Get read pool for streaming query
        let pool = self.pool_manager.get_pool(OperationType::Read);

        // Create chunked query
        let query = ChunkedQuery::new(
            base_query,
            params,
            |row| Task::from_row(row),
            pool,
        );

        Ok(query)
    }

    /// Stream all tasks for reporting purposes
    pub fn stream_all_tasks_for_report(
        &self,
        chunk_size: usize,
    ) -> Result<impl Iterator<Item = Result<Vec<Task>, rusqlite::Error>>, String> {
        use crate::db::FromSqlRow;

        let query = format!(
            r#"
            SELECT
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
                assigned_at, assigned_by, scheduled_date, start_time, end_time,
                date_rdv, heure_rdv, template_id, workflow_id, workflow_status,
                current_workflow_step_id, started_at, completed_at, completed_steps,
                client_id, customer_name, customer_email, customer_phone, customer_address,
                external_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration,
                created_at, updated_at, creator_id, created_by, updated_by, deleted_at, deleted_by, synced, last_synced_at
            FROM tasks
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            "#
        );

        // Get report pool for this long-running operation
        let conn = self.pool_manager.get_connection(OperationType::Report)?;

        // Execute query and return iterator
        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| Task::from_row(row))
            .map_err(|e| e.to_string())?;

        // Convert to chunked iterator
        let chunk_iter = rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
            .chunks(chunk_size)
            .map(|chunk| Ok(chunk.to_vec()))
            .collect::<Vec<_>>()
            .into_iter();

        Ok(chunk_iter)
    }

    /// Get estimated task count for pagination planning
    pub fn get_estimated_task_count(&self) -> Result<i64, String> {
        let conn = self.pool_manager.get_connection(OperationType::Read)?;

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        Ok(count)
    }
}

/// Configuration for streaming queries
#[derive(Debug, Clone)]
pub struct StreamingConfig {
    /// Number of rows to load per chunk
    pub chunk_size: usize,
    /// Whether to use streaming for queries above this threshold
    pub streaming_threshold: usize,
    /// Maximum memory buffer size in MB
    pub max_buffer_size_mb: usize,
}

impl Default for StreamingConfig {
    fn default() -> Self {
        Self {
            chunk_size: 1000,
            streaming_threshold: 5000, // Use streaming for 5000+ rows
            max_buffer_size_mb: 100,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_streaming_config_default() {
        let config = StreamingConfig::default();
        assert_eq!(config.chunk_size, 1000);
        assert_eq!(config.streaming_threshold, 5000);
        assert_eq!(config.max_buffer_size_mb, 100);
    }
}
