//! System service - Business logic for system diagnostics and database operations

use serde_json::json;

/// System service providing business logic for database health monitoring
/// and diagnostics operations such as integrity checks, WAL checkpoint
/// management, and table statistics retrieval.
pub struct SystemService;

impl SystemService {
    /// Diagnose database health and return diagnostic information
    pub fn diagnose_database(
        pool: &r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    ) -> Result<serde_json::Value, String> {
        let conn = pool
            .get()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode;", [], |row| row.get(0))
            .map_err(|e| format!("Failed to check journal mode: {}", e))?;

        let wal_checkpoint: (i64, i64) = conn
            .query_row("PRAGMA wal_checkpoint;", [], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .map_err(|e| format!("Failed to checkpoint: {}", e))?;

        let busy_timeout: i64 = conn
            .query_row("PRAGMA busy_timeout;", [], |row| row.get(0))
            .map_err(|e| format!("Failed to check busy_timeout: {}", e))?;

        let integrity: String = conn
            .query_row("PRAGMA integrity_check;", [], |row| row.get(0))
            .map_err(|e| format!("Failed integrity check: {}", e))?;

        let task_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tasks;", [], |row| row.get(0))
            .unwrap_or(0);

        let client_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM clients;", [], |row| row.get(0))
            .unwrap_or(0);

        Ok(json!({
            "journal_mode": journal_mode,
            "wal_checkpoint": {
                "busy": wal_checkpoint.0,
                "log": wal_checkpoint.1
            },
            "busy_timeout_ms": busy_timeout,
            "integrity": integrity,
            "table_counts": {
                "tasks": task_count,
                "clients": client_count
            },
            "pool_state": {
                "active": pool.state().connections,
                "idle": pool.state().idle_connections,
            }
        }))
    }

    /// Force a WAL checkpoint restart
    pub fn force_wal_checkpoint(
        pool: &r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    ) -> Result<String, String> {
        let conn = pool
            .get()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        conn.execute_batch("PRAGMA wal_checkpoint(RESTART);")
            .map_err(|e| format!("Checkpoint failed: {}", e))?;

        Ok("WAL checkpoint completed successfully".to_string())
    }

    /// Perform a health check on the database
    pub fn health_check(
        pool: &r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    ) -> Result<String, String> {
        let conn = pool
            .get()
            .map_err(|e| format!("Database connection failed: {}", e))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .map_err(|e| format!("Database query failed: {}", e))?;

        if count == 0 {
            return Err("No users found in database".to_string());
        }

        Ok("OK".to_string())
    }

    /// Get database statistics including file size and table counts
    pub fn get_database_stats(
        pool: &r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    ) -> Result<serde_json::Value, String> {
        let conn = pool
            .get()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        let db_path: String = conn
            .query_row("PRAGMA database_list;", [], |row| {
                let _seq: i64 = row.get(0)?;
                let _name: String = row.get(1)?;
                let path: String = row.get(2)?;
                Ok(path)
            })
            .map_err(|e| format!("Failed to get database path: {}", e))?;

        let size_bytes = match std::fs::metadata(&db_path) {
            Ok(metadata) => metadata.len() as i64,
            Err(e) => {
                tracing::warn!("Could not determine database file size: {}", e);
                0
            }
        };

        let users_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap_or(0);

        let tasks_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
            .unwrap_or(0);

        let clients_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
            .unwrap_or(0);

        let interventions_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM interventions", [], |row| row.get(0))
            .unwrap_or(0);

        Ok(json!({
            "size_bytes": size_bytes,
            "tables": {
                "users": users_count,
                "tasks": tasks_count,
                "clients": clients_count,
                "interventions": interventions_count
            },
            "database_path": db_path
        }))
    }

    /// Get database status (initialisation, tables, version) via the Database
    /// abstraction.  This moves the status logic out of the IPC command handler.
    pub fn get_database_status(
        db: &crate::db::Database,
    ) -> Result<serde_json::Value, String> {
        let is_initialized = db
            .is_initialized()
            .map_err(|e| format!("Failed to check database initialization: {}", e))?;
        let tables = db
            .list_tables()
            .map_err(|e| format!("Failed to list database tables: {}", e))?;
        let version = db
            .get_version()
            .map_err(|e| format!("Failed to get database version: {}", e))?;

        Ok(json!({
            "initialized": is_initialized,
            "tables": tables,
            "version": version
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_service_struct_exists() {
        // SystemService is a unit struct with static methods
        let _ = SystemService;
    }
}
