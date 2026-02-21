//! Repository for performance metrics database operations.
//!
//! Isolates all SQL access for the performance monitoring subsystem
//! following the bounded context architecture rule that SQL must live
//! in infrastructure / db layers only.

use crate::db::Database;
use chrono::{DateTime, Utc};

/// Raw metric row returned from the database.
pub struct MetricRow {
    pub command: String,
    pub duration_ms: f64,
    pub success: bool,
}

/// Repository responsible for performance metrics persistence.
pub struct PerformanceRepository<'a> {
    db: &'a Database,
}

impl<'a> PerformanceRepository<'a> {
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Create the performance_metrics table and its indexes.
    pub fn init_schema(&self) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS performance_metrics (
                id TEXT PRIMARY KEY,
                command TEXT NOT NULL,
                duration_ms REAL NOT NULL,
                success INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                user_id TEXT,
                error_message TEXT,
                metadata TEXT,
                created_at TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| format!("Failed to create performance_metrics table: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_metrics(timestamp)",
            [],
        )
        .map_err(|e| format!("Failed to create timestamp index: {}", e))?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_performance_command ON performance_metrics(command)",
            [],
        )
        .map_err(|e| format!("Failed to create command index: {}", e))?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_performance_success ON performance_metrics(success)",
            [],
        )
        .map_err(|e| format!("Failed to create success index: {}", e))?;

        Ok(())
    }

    /// Insert a single performance metric.
    pub fn insert_metric(
        &self,
        id: &str,
        command: &str,
        duration_ms: f64,
        success: bool,
        timestamp: &str,
        user_id: Option<&str>,
        error_message: Option<&str>,
        metadata_json: &str,
        created_at: &str,
    ) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "INSERT INTO performance_metrics
             (id, command, duration_ms, success, timestamp, user_id, error_message, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                id,
                command,
                duration_ms,
                success as i32,
                timestamp,
                user_id,
                error_message,
                metadata_json,
                created_at,
            ],
        )
        .map_err(|e| format!("Failed to insert performance metric: {}", e))?;

        Ok(())
    }

    /// Query metrics recorded after `since`.
    pub fn query_metrics_since(&self, since: &DateTime<Utc>) -> Result<Vec<MetricRow>, String> {
        let conn = self.db.get_connection()?;

        let mut stmt = conn
            .prepare(
                "SELECT command, duration_ms, success FROM performance_metrics
                 WHERE timestamp > ? ORDER BY timestamp DESC",
            )
            .map_err(|e| format!("Failed to prepare stats query: {}", e))?;

        let rows: Vec<MetricRow> = stmt
            .query_map([since.to_rfc3339()], |row| {
                Ok(MetricRow {
                    command: row.get(0)?,
                    duration_ms: row.get(1)?,
                    success: row.get::<_, i32>(2)? != 0,
                })
            })
            .map_err(|e| format!("Failed to query metrics: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect metrics: {}", e))?;

        Ok(rows)
    }

    /// Delete metrics older than `before`.
    pub fn delete_metrics_before(&self, before: &DateTime<Utc>) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "DELETE FROM performance_metrics WHERE timestamp < ?",
            [before.to_rfc3339()],
        )
        .map_err(|e| format!("Failed to cleanup old metrics: {}", e))?;

        Ok(())
    }
}
