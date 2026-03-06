//! View management for database migrations.
//!
//! Handles creation and recreation of SQL views and cleanup of legacy
//! runtime artifacts. Called during the startup initialization sequence.

use crate::db::{Database, DbResult};

impl Database {
    /// Ensure views that older schemas might be missing exist
    pub fn ensure_required_views(&self) -> DbResult<()> {
        let conn = self.get_connection()?;

        conn.execute_batch(
            r#"
            DROP VIEW IF EXISTS client_statistics;
            CREATE VIEW client_statistics AS
            SELECT
              c.id,
              c.name,
              c.customer_type,
              c.created_at,
              COALESCE(COUNT(DISTINCT t.id), 0) as total_tasks,
              COALESCE(COUNT(DISTINCT CASE WHEN t.status IN ('pending', 'in_progress') THEN t.id END), 0) as active_tasks,
              COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END), 0) as completed_tasks,
              MAX(t.updated_at) as last_task_date
            FROM clients c
            LEFT JOIN tasks t ON t.client_id = c.id AND t.deleted_at IS NULL
            WHERE c.deleted_at IS NULL
            GROUP BY c.id, c.name, c.customer_type, c.created_at;
            "#,
        )
        .map_err(|e| e.to_string())?;

        conn.execute_batch(
            r#"
            DROP VIEW IF EXISTS calendar_tasks;
            CREATE VIEW calendar_tasks AS
            SELECT 
              t.id,
              t.task_number,
              t.title,
              t.status,
              t.priority,
              t.scheduled_date,
              t.start_time,
              t.end_time,
              t.vehicle_plate,
              t.vehicle_model,
              t.technician_id,
              u.username as technician_name,
              t.client_id,
              c.name as client_name,
              t.estimated_duration,
              t.actual_duration
            FROM tasks t
            LEFT JOIN users u ON t.technician_id = u.id
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE t.scheduled_date IS NOT NULL
              AND t.deleted_at IS NULL;
            "#,
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Ensure legacy runtime artifacts removed after migrations.
    pub(crate) fn ensure_required_legacy_cleanup(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        conn.execute_batch("DROP TRIGGER IF EXISTS user_insert_create_settings;")
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
