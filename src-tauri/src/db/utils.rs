//! Database utility functions module
//!
//! This module provides utility methods for database maintenance, inspection,
//! and administrative operations.

use crate::db::{Database, DbResult};

/// Utility functions implementation
impl Database {
    /// List all tables in database
    pub fn list_tables(&self) -> DbResult<Vec<String>> {
        let conn = self.get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).map_err(|e| e.to_string())?;

        let tables = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<String>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(tables)
    }

    /// Get row count for a table
    pub fn count_rows(&self, table_name: &str) -> DbResult<i32> {
        // Validate table name to prevent SQL injection
        let allowed_tables = [
            "users",
            "tasks",
            "clients",
            "interventions",
            "intervention_steps",
            "sessions",
            "user_consent",
            "settings",
            "client_stats",
        ];

        if !allowed_tables.contains(&table_name) {
            return Err(format!("Invalid table name: {}", table_name));
        }

        let conn = self.get_connection()?;

        let query = format!("SELECT COUNT(*) FROM {}", table_name);
        let count: i32 = conn
            .query_row(&query, [], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        Ok(count)
    }

    /// Vacuum database (compression)
    pub fn vacuum(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        conn.execute_batch("VACUUM; PRAGMA optimize;")
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
