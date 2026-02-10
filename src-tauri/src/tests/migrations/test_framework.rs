//! Migration test framework
//!
//! Provides utilities for testing database migrations

use crate::commands::errors::{AppError, AppResult};
use crate::db::{Database, PooledConn};
use tempfile::{tempdir, TempDir};

/// Context for migration testing
pub struct MigrationTestContext {
    pub temp_dir: TempDir,
    pub conn: PooledConn,
    pub database: Database,
}

impl MigrationTestContext {
    /// Create a new migration test context with an empty database
    pub fn new() -> AppResult<Self> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test.db");
        let database = Database::new(&db_path, "test_encryption_key_32_bytes_long!")?;
        database.init()?;
        let conn = database.get_connection()?;

        Ok(Self {
            temp_dir,
            conn,
            database,
        })
    }

    /// Create a context with a database at a specific migration version
    pub fn at_version(version: i32) -> AppResult<Self> {
        let mut ctx = Self::new()?;

        // Run migrations up to specified version
        ctx.database.migrate(version)?;

        Ok(ctx)
    }

    /// Helper method to count rows in a table
    pub fn count_rows(&self, table_name: &str) -> AppResult<i64> {
        let count: i64 =
            self.conn
                .query_row(&format!("SELECT COUNT(*) FROM {}", table_name), [], |row| {
                    row.get(0)
                })?;
        Ok(count)
    }

    /// Helper method to migrate to a specific version
    pub fn migrate_to_version(&mut self, version: i32) -> AppResult<()> {
        Ok(self.database.migrate(version)?)
    }

    /// Helper method to check database integrity
    pub fn check_integrity(&self) -> AppResult<bool> {
        match verify_integrity(&self.conn) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Helper method to check foreign key constraints
    pub fn check_foreign_keys(&self) -> AppResult<bool> {
        let fk_check: i32 = self
            .conn
            .query_row("PRAGMA foreign_key_check", [], |row| row.get(0))
            .unwrap_or(0);
        Ok(fk_check == 0)
    }
}

/// Verify database integrity after migration
pub fn verify_integrity(conn: &PooledConn) -> AppResult<()> {
    // Check foreign key constraints
    let fk_check: i32 = conn.query_row("PRAGMA foreign_key_check", [], |row| row.get(0))?;
    if fk_check != 0 {
        return Err(AppError::Database(
            "Foreign key constraint violation".to_string(),
        ));
    }

    // Check integrity
    let integrity_check: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
    if integrity_check != "ok" {
        return Err(AppError::Database(format!(
            "Integrity check failed: {}",
            integrity_check
        )));
    }

    Ok(())
}
