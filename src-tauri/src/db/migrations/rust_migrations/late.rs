//! Rust-implemented migrations 040+.
//!
//! Late-stage migrations that add activity and reference lookup indexes.

use crate::db::{Database, DbResult};
use rusqlite::params;

impl Database {
    /// Migration 040: Add indexes for recent activity and reference lookups.
    ///
    /// Custom handler because the original SQL references `user_sessions`, which only
    /// exists on databases that have not yet applied migration 041.  Fresh databases
    /// initialised from the current schema.sql start with the `sessions` table instead,
    /// so attempting `CREATE INDEX … ON user_sessions(…)` would crash.
    ///
    /// Resolution: skip the `user_sessions` index when the table is absent (it will be
    /// dropped by migration 041 anyway), and always apply the idempotent
    /// `inventory_transactions` index.
    pub(in crate::db::migrations) fn apply_migration_40(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Migration 040: Adding activity and reference indexes");

        // Only create the user_sessions index if the table still exists.
        // On fresh databases the table never existed; on upgraded databases it will
        // be dropped by migration 041 immediately after this step.
        let user_sessions_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user_sessions'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if user_sessions_exists > 0 {
            conn.execute_batch(
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity_user \
                 ON user_sessions(last_activity DESC, user_id);",
            )
            .map_err(|e| format!("Migration 040: failed to create user_sessions index: {}", e))?;
        } else {
            tracing::info!(
                "Migration 040: user_sessions table absent, skipping its index (fresh DB or already migrated)"
            );
        }

        // This index is safe regardless of DB age.
        conn.execute_batch(
            "CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference_type_number \
             ON inventory_transactions(reference_type, reference_number);",
        )
        .map_err(|e| {
            format!(
                "Migration 040: failed to create inventory_transactions index: {}",
                e
            )
        })?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![40],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 040: completed successfully");
        Ok(())
    }
}
