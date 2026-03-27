//! Database migrations module
//!
//! This module handles database schema initialization and migration management.
//! Individual concerns are split across sub-modules:
//!
//! - `views` — SQL view creation and legacy artifact cleanup
//! - `rust_migrations` — Rust-implemented migration functions
//! - `tests` — Regression and idempotency tests

mod rust_migrations;
mod views;

#[cfg(test)]
mod tests;

use crate::db::{Database, DbResult};
use include_dir::{include_dir, Dir, File};
use rusqlite::params;

static MIGRATIONS_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/migrations");

fn parse_migration_version(name: &str) -> Option<i32> {
    name.split('_').next()?.parse::<i32>().ok()
}

fn sorted_migration_files() -> Vec<&'static File<'static>> {
    let mut files: Vec<_> = MIGRATIONS_DIR.files().collect();
    files.sort_by_key(|file| file.path().to_string_lossy().into_owned());
    files
}

/// Database migration implementation
impl Database {
    /// Initialize database schema (create all tables)
    pub fn init(&self) -> DbResult<()> {
        let conn = self.get_connection()?;

        // Read schema from embedded SQL file
        conn.execute_batch(include_str!("../schema.sql"))
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Canonical startup initialization sequence used by runtime startup.
    pub fn initialize_or_migrate(&self) -> DbResult<()> {
        if !self.is_initialized()? {
            self.init()?;
        }

        let conn = self.get_connection()?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (
                 version INTEGER PRIMARY KEY,
                 applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
             )",
            [],
        )
        .map_err(|e| e.to_string())?;

        let latest_version = Self::get_latest_migration_version();
        let current_version = self.get_version()?;
        if current_version < latest_version {
            self.migrate(latest_version)?;
        }

        self.ensure_required_legacy_cleanup()?;
        self.ensure_required_views()?;
        Ok(())
    }

    /// Check if database is initialized (critical tables exist)
    pub fn is_initialized(&self) -> DbResult<bool> {
        let conn = self.get_connection()?;

        // Check for multiple critical tables to ensure proper initialization
        let critical_tables = vec![
            "interventions",
            "users",
            "clients",
            "tasks",
            "sync_queue",
            "photos",
        ];

        for table_name in critical_tables {
            let count: i32 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
                    [table_name],
                    |row| row.get(0),
                )
                .map_err(|e| {
                    tracing::debug!("Error checking table '{}': {}", table_name, e);
                    e.to_string()
                })?;

            if count == 0 {
                tracing::debug!(
                    "Critical table '{}' not found, database not initialized",
                    table_name
                );
                return Ok(false);
            }
        }

        tracing::debug!("All critical tables found, database appears initialized");
        Ok(true)
    }

    /// Get database version (for migrations)
    pub fn get_version(&self) -> DbResult<i32> {
        let conn = self.get_connection()?;

        // Create version table if not exists
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (
                 version INTEGER PRIMARY KEY,
                 applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
             )",
            [],
        )
        .map_err(|e| e.to_string())?;

        let version: Result<i32, _> = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string());

        Ok(version.unwrap_or(0))
    }

    /// Apply migration to specific version
    pub fn migrate(&self, target_version: i32) -> DbResult<()> {
        let current_version = self.get_version()?;

        if current_version >= target_version {
            return Ok(());
        }

        // Apply migrations sequentially
        for version in (current_version + 1)..=target_version {
            self.apply_migration(version)?;
        }

        Ok(())
    }

    /// Get the latest available migration version from the file system
    pub fn get_latest_migration_version() -> i32 {
        let mut max_version = 0;

        for file in sorted_migration_files() {
            if let Some(name) = file.path().file_name().and_then(|n| n.to_str()) {
                if let Some(version) = parse_migration_version(name) {
                    if version > max_version {
                        max_version = version;
                    }
                }
            }
        }

        // Ensure we at least cover the hardcoded Rust migrations (up to 18)
        if max_version < 18 {
            max_version = 18;
        }

        max_version
    }

    /// Apply migration from SQL file
    fn apply_sql_migration(&self, version: i32) -> DbResult<()> {
        let conn = self.get_connection()?;

        let matches: Vec<_> = sorted_migration_files()
            .into_iter()
            .filter(|file| {
                file.path()
                    .file_name()
                    .and_then(|n| n.to_str())
                    .and_then(parse_migration_version)
                    == Some(version)
            })
            .collect();

        if matches.is_empty() {
            return Err(format!("No migration file found for version {}", version));
        }

        if matches.len() > 1 {
            let names = matches
                .iter()
                .filter_map(|file| file.path().file_name().and_then(|n| n.to_str()))
                .collect::<Vec<_>>()
                .join(", ");
            return Err(format!(
                "Multiple migration files found for version {}: {}",
                version, names
            ));
        }

        let file = matches[0];
        tracing::info!("Applying SQL migration file: {:?}", file.path());

        if let Some(sql_content) = file.contents_utf8() {
            if let Err(e) = conn.execute_batch(sql_content) {
                // Some legacy SQLite builds do not support IF NOT EXISTS on ALTER TABLE ADD COLUMN.
                // Treat a duplicate avatar_url column in migration 14 as already-applied.
                let duplicate_avatar_column =
                    version == 14 && e.to_string().contains("duplicate column name: avatar_url");
                let syntax_near_exists = e.to_string().contains("near \"EXISTS\": syntax error");
                if syntax_near_exists {
                    let normalized_sql =
                        sql_content.replace("ADD COLUMN IF NOT EXISTS", "ADD COLUMN");
                    for statement in normalized_sql.split(';') {
                        let stmt = statement.trim();
                        if stmt.is_empty() {
                            continue;
                        }
                        if let Err(stmt_err) = conn.execute_batch(&format!("{stmt};")) {
                            if stmt_err.to_string().contains("duplicate column name") {
                                continue;
                            }
                            return Err(format!(
                                "Failed to execute normalized migration SQL for version {}: {}",
                                version, stmt_err
                            ));
                        }
                    }
                } else if !duplicate_avatar_column {
                    return Err(format!(
                        "Failed to execute migration SQL for version {}: {}",
                        version, e
                    ));
                }
            }

            // Record migration
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![version],
            )
            .map_err(|e| e.to_string())?;

            Ok(())
        } else {
            Err(format!(
                "Failed to read migration file content for version {}",
                version
            ))
        }
    }

    /// Apply single migration — dispatches to Rust handlers or SQL file.
    fn apply_migration(&self, version: i32) -> DbResult<()> {
        let conn = self.get_connection()?;

        // Apply specific migration version
        match version {
            1 => {
                let _conn = self.get_connection()?;
                // Schema already created in init()
                conn.execute(
                    "INSERT INTO schema_version (version) VALUES (?1)",
                    params![version],
                )
                .map_err(|e| e.to_string())?;
                Ok(())
            }
            2 => self.apply_migration_002(),
            6 => self.apply_migration_006(),
            8 => self.apply_migration_008(),
            9 => self.apply_migration_009(),
            11 => self.apply_migration_11(),
            12 => self.apply_migration_12(),
            16 => self.apply_migration_16(),
            17 => self.apply_migration_17(),
            18 => self.apply_migration_18(),
            24 => self.apply_migration_24(),
            25 => self.apply_migration_25(),
            26 => self.apply_migration_26(),
            27 => self.apply_migration_27(),
            28 => self.apply_migration_28(),
            29 => self.apply_migration_29(),
            30 => self.apply_migration_30(),
            31 => self.apply_migration_31(),
            32 => self.apply_migration_32(),
            33 => self.apply_migration_33(),
            34 => self.apply_migration_34(),
            40 => self.apply_migration_40(),
            65 => self.apply_migration_65(),
            _ => {
                // Try to apply generic SQL migration for all other versions.
                self.apply_sql_migration(version)
            }
        }
    }
}
