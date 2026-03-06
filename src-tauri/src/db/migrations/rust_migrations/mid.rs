//! Rust-implemented migrations 016–018.
//!
//! These mid-range migrations add task assignment indexes, the cache metadata
//! table, and the settings audit log table.

use crate::db::{Database, DbResult};
use rusqlite::params;

impl Database {
    pub(in crate::db::migrations) fn apply_migration_16(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        // Migration 16: Add task assignment validation indexes
        tracing::info!("Applying migration 16: Add task assignment validation indexes");

        // Add compound index for technician + scheduled_date (for conflict detection and workload checks)
        conn.execute(
              "CREATE INDEX IF NOT EXISTS idx_tasks_technician_scheduled_date ON tasks(technician_id, scheduled_date);",
              []
          ).map_err(|e| format!("Failed to create technician_scheduled_date index: {}", e))?;

        // Additional index for technician + status + scheduled_date (for assignment validation)
        conn.execute(
              "CREATE INDEX IF NOT EXISTS idx_tasks_technician_status_scheduled ON tasks(technician_id, status, scheduled_date);",
              []
          ).map_err(|e| format!("Failed to create technician_status_scheduled index: {}", e))?;

        tracing::info!("Migration 16: Task assignment validation indexes created successfully");

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![16],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub(in crate::db::migrations) fn apply_migration_17(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        // Migration 17: Add cache metadata table
        tracing::info!("Applying migration 17: Add cache metadata table");

        conn.execute(
            r#"
               CREATE TABLE IF NOT EXISTS cache_metadata (
                   key TEXT PRIMARY KEY,
                   value TEXT NOT NULL,
                   expires_at INTEGER,
                   created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
                   updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
               );
               "#,
            [],
        )
        .map_err(|e| format!("Failed to create cache_metadata table: {}", e))?;

        tracing::info!("Migration 17: Cache metadata table created successfully");

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![17],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub(in crate::db::migrations) fn apply_migration_18(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        // Migration 18: Add settings audit log table
        tracing::info!("Applying migration 18: Add settings audit log table");

        // Create the audit log table
        conn.execute(
            r#"
               CREATE TABLE IF NOT EXISTS settings_audit_log (
                   id TEXT PRIMARY KEY,
                   user_id TEXT NOT NULL,
                   setting_type TEXT NOT NULL,
                   details TEXT NOT NULL,
                   timestamp INTEGER NOT NULL,
                   ip_address TEXT,
                   user_agent TEXT,
                   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
               );
               "#,
            [],
        )
        .map_err(|e| format!("Failed to create settings_audit_log table: {}", e))?;

        // Create indexes for efficient querying
        conn.execute(
               "CREATE INDEX IF NOT EXISTS idx_settings_audit_user_timestamp ON settings_audit_log(user_id, timestamp DESC);",
               []
           ).map_err(|e| format!("Failed to create user_timestamp index: {}", e))?;

        conn.execute(
               "CREATE INDEX IF NOT EXISTS idx_settings_audit_type_timestamp ON settings_audit_log(setting_type, timestamp DESC);",
               []
           ).map_err(|e| format!("Failed to create type_timestamp index: {}", e))?;

        // Add updated_at column to user_settings if it doesn't exist
        let updated_at_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('user_settings') WHERE name='updated_at'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check updated_at column: {}", e))?;

        if updated_at_exists == 0 {
            conn.execute(
                "ALTER TABLE user_settings ADD COLUMN updated_at INTEGER DEFAULT 0;",
                [],
            )
            .map_err(|e| format!("Failed to add updated_at column: {}", e))?;
            tracing::info!("Added updated_at column to user_settings table");
        } else {
            tracing::info!("updated_at column already exists in user_settings table");
        }

        tracing::info!("Migration 18: Settings audit log table created successfully");

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![18],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }
}
