//! System service - Business logic for system diagnostics and database operations

use crate::shared::db::system_repository::SystemRepository;

/// System service providing business logic for database health monitoring
/// and diagnostics operations such as integrity checks, WAL checkpoint
/// management, and table statistics retrieval.
pub struct SystemService;

impl SystemService {
    /// Diagnose database health and return diagnostic information
    pub fn diagnose_database(
        pool: &r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    ) -> Result<serde_json::Value, String> {
        SystemRepository::diagnose_database(pool)
    }

    /// Force a WAL checkpoint restart
    pub fn force_wal_checkpoint(
        pool: &r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    ) -> Result<String, String> {
        SystemRepository::force_wal_checkpoint(pool)
    }

    /// Perform a health check on the database
    pub fn health_check(
        pool: &r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    ) -> Result<String, String> {
        SystemRepository::health_check(pool)
    }

    /// Get database statistics including file size and table counts
    pub fn get_database_stats(
        pool: &r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    ) -> Result<serde_json::Value, String> {
        SystemRepository::get_database_stats(pool)
    }

    /// Get database status (initialisation, tables, version) via the Database
    /// abstraction.  This moves the status logic out of the IPC command handler.
    pub fn get_database_status(db: &crate::db::Database) -> Result<serde_json::Value, String> {
        let is_initialized = db
            .is_initialized()
            .map_err(|e| format!("Failed to check database initialization: {}", e))?;
        let tables = db
            .list_tables()
            .map_err(|e| format!("Failed to list database tables: {}", e))?;
        let version = db
            .get_version()
            .map_err(|e| format!("Failed to get database version: {}", e))?;

        Ok(serde_json::json!({
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
