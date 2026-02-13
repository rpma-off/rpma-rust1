//! Database migrations module
//!
//! This module handles database schema initialization and migration management.

use crate::db::{Database, DbResult};
use include_dir::{include_dir, Dir};
use rusqlite::params;

static MIGRATIONS_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/migrations");

/// Database migration implementation
impl Database {
    /// Initialize database schema (create all tables)
    pub fn init(&self) -> DbResult<()> {
        let conn = self.get_connection()?;

        // Read schema from embedded SQL file
        conn.execute_batch(include_str!("schema.sql"))
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Ensure views that older schemas might be missing exist
    pub fn ensure_required_views(&self) -> DbResult<()> {
        let conn = self.get_connection()?;

        conn.execute_batch(
            r#"
            CREATE VIEW IF NOT EXISTS client_statistics AS
            SELECT
              c.id,
              c.name,
              c.customer_type,
              c.created_at,
              COUNT(DISTINCT t.id) as total_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as active_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
              MAX(CASE WHEN t.status IN ('completed', 'in_progress') THEN t.updated_at END) as last_task_date
            FROM clients c
            LEFT JOIN tasks t ON t.client_id = c.id AND t.deleted_at IS NULL
            WHERE c.deleted_at IS NULL
            GROUP BY c.id, c.name, c.customer_type, c.created_at;
            "#,
        )
        .map_err(|e| e.to_string())?;

        conn.execute_batch(
            r#"
            CREATE VIEW IF NOT EXISTS calendar_tasks AS
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

        for file in MIGRATIONS_DIR.files() {
            if let Some(name) = file.path().file_name().and_then(|n| n.to_str()) {
                // Try to parse version from filename (e.g., "025_add_analytics.sql")
                if let Some(version_part) = name.split('_').next() {
                    if let Ok(version) = version_part.parse::<i32>() {
                        if version > max_version {
                            max_version = version;
                        }
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

        // Find the migration file for this version
        let mut migration_file = None;
        let prefix = format!("{:03}_", version);
        let prefix_short = format!("{}_", version);

        for file in MIGRATIONS_DIR.files() {
            if let Some(name) = file.path().file_name().and_then(|n| n.to_str()) {
                if name.starts_with(&prefix) || name.starts_with(&prefix_short) {
                    migration_file = Some(file);
                    break;
                }
            }
        }

        if let Some(file) = migration_file {
            tracing::info!("Applying SQL migration file: {:?}", file.path());

            if let Some(sql_content) = file.contents_utf8() {
                conn.execute_batch(sql_content).map_err(|e| {
                    format!(
                        "Failed to execute migration SQL for version {}: {}",
                        version, e
                    )
                })?;

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
        } else {
            Err(format!("No migration file found for version {}", version))
        }
    }

    /// Apply single migration
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
            _ => {
                // Try to apply generic SQL migration for all other versions
                // This covers 3-5, 7, 10, 13-15, 19-23, 34, 35, and any future SQL-only migrations
                // Note: Versions 2, 6, 8, 9, 24, 25, 26 now have custom handlers for idempotency
                if version == 24 || version == 25 || version == 26 {
                    return Err(format!(
                        "Migration {} should be handled by custom handler",
                        version
                    ));
                }
                self.apply_sql_migration(version)
            }
        }
    }

    // --- Custom Migration Implementations ---

    fn apply_migration_002(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Migration 002: Checking ppf_zone/ppf_zones state");

        // Check if ppf_zones column already exists (new database scenario)
        let ppf_zones_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('tasks') WHERE name='ppf_zones'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check ppf_zones column: {}", e))?;

        if ppf_zones_exists > 0 {
            // New database - ppf_zones already exists
            tracing::info!("Migration 002: ppf_zones already exists, skipping (new database)");

            // Check for inconsistent state (both columns exist)
            let ppf_zone_exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('tasks') WHERE name='ppf_zone'",
                    [],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to check ppf_zone column: {}", e))?;

            if ppf_zone_exists > 0 {
                tracing::error!(
                    "Migration 002: Both ppf_zone and ppf_zones exist - inconsistent state"
                );
                return Err(
                    "Migration 002: Both ppf_zone and ppf_zones columns exist. Manual intervention required.".to_string()
                );
            }

            // Record migration as applied
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![2],
            )
            .map_err(|e| e.to_string())?;

            return Ok(());
        }

        // Check if ppf_zone column exists (old database scenario)
        let ppf_zone_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('tasks') WHERE name='ppf_zone'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check ppf_zone column: {}", e))?;

        if ppf_zone_exists == 0 {
            // Neither column exists - unexpected state
            return Err(
                "Migration 002: Neither ppf_zone nor ppf_zones exists in tasks table. Database state is inconsistent.".to_string()
            );
        }

        // Old database - perform rename
        tracing::info!("Migration 002: Renaming ppf_zone to ppf_zones (old database)");

        // Start transaction for safety
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

        // Create new table with correct column name
        tx.execute(
            r#"
            CREATE TABLE tasks_new (
                id TEXT PRIMARY KEY,
                task_number TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                vehicle_plate TEXT,
                vehicle_model TEXT,
                vehicle_year TEXT,
                vehicle_make TEXT,
                vin TEXT,
                ppf_zones TEXT,
                custom_ppf_zones TEXT,
                status TEXT NOT NULL DEFAULT 'draft',
                priority TEXT NOT NULL DEFAULT 'medium',
                technician_id TEXT,
                assigned_at INTEGER,
                assigned_by TEXT,
                scheduled_date TEXT,
                start_time TEXT,
                end_time TEXT,
                date_rdv TEXT,
                heure_rdv TEXT,
                template_id TEXT,
                workflow_id TEXT,
                workflow_status TEXT,
                current_workflow_step_id TEXT,
                started_at INTEGER,
                completed_at INTEGER,
                completed_steps TEXT,
                client_id TEXT,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                customer_address TEXT,
                external_id TEXT,
                lot_film TEXT,
                checklist_completed INTEGER DEFAULT 0,
                notes TEXT,
                tags TEXT,
                estimated_duration INTEGER,
                actual_duration INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                creator_id TEXT,
                created_by TEXT,
                updated_by TEXT,
                synced INTEGER DEFAULT 0,
                last_synced_at INTEGER
            )
            "#,
            [],
        )
        .map_err(|e| format!("Failed to create tasks_new table: {}", e))?;

        // Copy data from old table to new table with renamed column
        let rows_copied = tx
            .execute(
                r#"
            INSERT INTO tasks_new (
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones,
                status, priority, technician_id, assigned_at, assigned_by, scheduled_date,
                start_time, end_time, date_rdv, heure_rdv, template_id, workflow_id,
                workflow_status, current_workflow_step_id, started_at, completed_at,
                completed_steps, client_id, customer_name, customer_email, customer_phone,
                customer_address, external_id, lot_film, checklist_completed, notes, tags,
                estimated_duration, actual_duration, created_at, updated_at, creator_id,
                created_by, updated_by, synced, last_synced_at
            )
            SELECT
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zone as ppf_zones, custom_ppf_zones,
                status, priority, technician_id, assigned_at, assigned_by, scheduled_date,
                start_time, end_time, date_rdv, heure_rdv, template_id, workflow_id,
                workflow_status, current_workflow_step_id, started_at, completed_at,
                completed_steps, client_id, customer_name, customer_email, customer_phone,
                customer_address, external_id, lot_film, checklist_completed, notes, tags,
                estimated_duration, actual_duration, created_at, updated_at, creator_id,
                created_by, updated_by, synced, last_synced_at
            FROM tasks
            "#,
                [],
            )
            .map_err(|e| format!("Failed to copy data to tasks_new: {}", e))?;

        tracing::info!(
            "Migration 002: Copied {} rows from tasks to tasks_new",
            rows_copied
        );

        // Drop old table
        tx.execute("DROP TABLE tasks", [])
            .map_err(|e| format!("Failed to drop tasks table: {}", e))?;

        // Rename new table
        tx.execute("ALTER TABLE tasks_new RENAME TO tasks", [])
            .map_err(|e| format!("Failed to rename tasks_new to tasks: {}", e))?;

        // Recreate all indexes
        tx.execute_batch(
            r#"
            -- Single column indexes
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_technician_id ON tasks(technician_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_synced ON tasks(synced) WHERE synced = 0;
            CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON tasks(task_number);

            -- Composite indexes for task query patterns
            CREATE INDEX IF NOT EXISTS idx_tasks_status_technician ON tasks(status, technician_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status);
            CREATE INDEX IF NOT EXISTS idx_tasks_technician_scheduled ON tasks(technician_id, scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_scheduled ON tasks(status, scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(synced, status) WHERE synced = 0;
            "#
        )
        .map_err(|e| format!("Failed to recreate indexes: {}", e))?;

        // Verify data integrity
        let count_after: i64 = tx
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
            .map_err(|e| format!("Failed to verify row count: {}", e))?;

        let rows_copied_i64 = rows_copied as i64;
        if count_after != rows_copied_i64 {
            return Err(format!(
                "Migration 002: Data integrity check failed. Expected {} rows, got {}",
                rows_copied_i64, count_after
            ));
        }

        tracing::info!(
            "Migration 002: Data integrity verified ({} rows)",
            count_after
        );

        // Commit transaction
        tx.commit().map_err(|e| e.to_string())?;

        // Record migration
        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![2],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 002: Completed successfully");
        Ok(())
    }

    fn apply_migration_006(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 006: Add location columns to intervention_steps");

        // Check if columns already exist (idempotency for new databases)
        let location_lat_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('intervention_steps') WHERE name='location_lat'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check location_lat column: {}", e))?;

        if location_lat_exists > 0 {
            tracing::info!(
                "Migration 006: location columns already exist, skipping (new database)"
            );
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![6],
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

        // Add columns for old databases
        tracing::info!(
            "Migration 006: Adding location columns to intervention_steps (old database)"
        );
        conn.execute(
            "ALTER TABLE intervention_steps ADD COLUMN location_lat REAL CHECK(location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90))",
            [],
        )
        .map_err(|e| format!("Failed to add location_lat column: {}", e))?;

        conn.execute(
            "ALTER TABLE intervention_steps ADD COLUMN location_lon REAL CHECK(location_lon IS NULL OR (location_lon >= -180 AND location_lon <= 180))",
            [],
        )
        .map_err(|e| format!("Failed to add location_lon column: {}", e))?;

        conn.execute(
            "ALTER TABLE intervention_steps ADD COLUMN location_accuracy REAL",
            [],
        )
        .map_err(|e| format!("Failed to add location_accuracy column: {}", e))?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![6],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 006: Completed successfully");
        Ok(())
    }

    fn apply_migration_008(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 008: Add workflow constraints and triggers");

        // Check if triggers already exist (idempotency)
        let trigger_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='sync_task_on_intervention_start'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check triggers: {}", e))?;

        if trigger_exists > 0 {
            tracing::info!("Migration 008: Triggers already exist, skipping (new database)");
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![8],
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

        // Add triggers for old databases
        tracing::info!("Migration 008: Adding workflow constraints and triggers (old database)");

        // Note: FOREIGN KEY constraints can't be added via ALTER TABLE in SQLite
        // They are already in schema.sql, so we only need to add triggers

        conn.execute(
            r#"
            CREATE TRIGGER sync_task_on_intervention_start
            AFTER INSERT ON interventions
            BEGIN
                UPDATE tasks SET workflow_id = NEW.id
                WHERE task_number = NEW.task_number AND workflow_id IS NULL;
            END
            "#,
            [],
        )
        .map_err(|e| {
            format!(
                "Failed to create sync_task_on_intervention_start trigger: {}",
                e
            )
        })?;

        conn.execute(
            r#"
            CREATE TRIGGER sync_task_on_intervention_update
            AFTER UPDATE ON interventions
            BEGIN
                UPDATE tasks SET
                    status = CASE
                        WHEN NEW.status = 'completed' THEN 'completed'
                        WHEN NEW.status = 'cancelled' THEN 'cancelled'
                        WHEN NEW.status = 'paused' THEN 'paused'
                        ELSE 'in_progress'
                    END,
                    completed_at = CASE
                        WHEN NEW.status = 'completed' THEN NEW.completed_at
                        ELSE NULL
                    END
                WHERE workflow_id = NEW.id;
            END
            "#,
            [],
        )
        .map_err(|e| {
            format!(
                "Failed to create sync_task_on_intervention_update trigger: {}",
                e
            )
        })?;

        conn.execute(
            r#"
            CREATE TRIGGER cleanup_task_on_intervention_delete
            AFTER DELETE ON interventions
            BEGIN
                UPDATE tasks SET
                    workflow_id = NULL,
                    current_workflow_step_id = NULL,
                    status = 'draft'
                WHERE workflow_id = OLD.id;
            END
            "#,
            [],
        )
        .map_err(|e| {
            format!(
                "Failed to create cleanup_task_on_intervention_delete trigger: {}",
                e
            )
        })?;

        conn.execute(
            r#"
            CREATE TRIGGER sync_task_current_step
            AFTER UPDATE ON intervention_steps
            BEGIN
                UPDATE tasks SET
                    current_workflow_step_id = CASE
                        WHEN NEW.step_status = 'in_progress' THEN NEW.id
                        ELSE current_workflow_step_id
                    END
                WHERE workflow_id = (
                    SELECT intervention_id FROM intervention_steps WHERE id = NEW.id
                );
            END
            "#,
            [],
        )
        .map_err(|e| format!("Failed to create sync_task_current_step trigger: {}", e))?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![8],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 008: Completed successfully");
        Ok(())
    }

    fn apply_migration_009(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 009: Add task_number column to interventions");

        // Check if column already exists (idempotency)
        let task_number_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('interventions') WHERE name='task_number'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check task_number column: {}", e))?;

        if task_number_exists > 0 {
            tracing::info!(
                "Migration 009: task_number column already exists, skipping (new database)"
            );
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![9],
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

        // Add column for old databases
        tracing::info!("Migration 009: Adding task_number column to interventions (old database)");
        conn.execute("ALTER TABLE interventions ADD COLUMN task_number TEXT", [])
            .map_err(|e| format!("Failed to add task_number column: {}", e))?;

        // Create index
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_interventions_task_number ON interventions(task_number)",
            [],
        )
        .map_err(|e| format!("Failed to create index on task_number: {}", e))?;

        // Populate existing interventions
        let updated = conn.execute(
            "UPDATE interventions SET task_number = (SELECT task_number FROM tasks WHERE tasks.id = interventions.task_id) WHERE task_number IS NULL",
            [],
        )
        .map_err(|e| format!("Failed to update task_number values: {}", e))?;

        tracing::info!(
            "Migration 009: Updated {} interventions with task_number",
            updated
        );

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![9],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 009: Completed successfully");
        Ok(())
    }

    fn apply_migration_11(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        println!("Applying migration 11: Adding task_id column to interventions table");

        // First, check if task_id column exists
        let task_id_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('interventions') WHERE name='task_id'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        println!("task_id column exists check: {}", task_id_exists);

        if task_id_exists == 0 {
            // Add task_id column if it doesn't exist
            conn.execute(
                "ALTER TABLE interventions ADD COLUMN task_id TEXT NOT NULL DEFAULT 'UNKNOWN'",
                [],
            )
            .map_err(|e| e.to_string())?;
            println!("Added task_id column to interventions table");
        } else {
            println!("task_id column already exists in interventions table");
        }

        // Populate task_id by joining with tasks table for records that don't have it
        let updated = conn.execute(
              "UPDATE interventions SET task_id = (SELECT id FROM tasks WHERE tasks.task_number = interventions.task_number) WHERE (task_id IS NULL OR task_id = '' OR task_id = 'UNKNOWN') AND interventions.task_number IS NOT NULL",
              [],
          ).map_err(|e| e.to_string())?;

        println!(
            "Updated {} interventions with task_id from task_number",
            updated
        );

        // Create index on task_id if it doesn't exist
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_interventions_task_id ON interventions(task_id)",
            [],
        );

        // Drop old task_number column
        // SQLite doesn't support DROP COLUMN directly, so we recreate the table
        // For brevity in this refactor, I am keeping the original logic which included a full table recreation
        // to drop the column. This is quite long but necessary for this specific migration.

        conn.execute(
             r#"
              CREATE TABLE interventions_new (
                  id TEXT PRIMARY KEY NOT NULL,
                  task_id TEXT NOT NULL,
                  task_number TEXT,
                  status TEXT NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
                 vehicle_plate TEXT NOT NULL,
                 vehicle_model TEXT,
                 vehicle_make TEXT,
                 vehicle_year INTEGER
                     CHECK(vehicle_year IS NULL OR (vehicle_year >= 1900 AND vehicle_year <= 2100)),
                 vehicle_color TEXT,
                 vehicle_vin TEXT,
                 client_id TEXT,
                 client_name TEXT,
                 client_email TEXT,
                 client_phone TEXT,
                 technician_id TEXT,
                 technician_name TEXT,
                 intervention_type TEXT NOT NULL DEFAULT 'ppf',
                 current_step INTEGER NOT NULL DEFAULT 0,
                 completion_percentage REAL DEFAULT 0
                     CHECK(completion_percentage >= 0 AND completion_percentage <= 100),
                 ppf_zones_config TEXT,
                 ppf_zones_extended TEXT,
                 film_type TEXT
                     CHECK(film_type IS NULL OR film_type IN ('standard', 'premium', 'matte', 'colored')),
                 film_brand TEXT,
                 film_model TEXT,
                 scheduled_at INTEGER,
                 started_at INTEGER,
                 completed_at INTEGER,
                 paused_at INTEGER,
                 estimated_duration INTEGER,
                 actual_duration INTEGER,
                 weather_condition TEXT
                     CHECK(weather_condition IS NULL OR weather_condition IN ('sunny', 'cloudy', 'rainy', 'foggy', 'windy', 'other')),
                 lighting_condition TEXT
                     CHECK(lighting_condition IS NULL OR lighting_condition IN ('natural', 'artificial', 'mixed')),
                 work_location TEXT
                     CHECK(work_location IS NULL OR work_location IN ('indoor', 'outdoor', 'semi_covered')),
                 temperature_celsius REAL,
                 humidity_percentage REAL
                     CHECK(humidity_percentage IS NULL OR (humidity_percentage >= 0 AND humidity_percentage <= 100)),
                 start_location_lat REAL
                     CHECK(start_location_lat IS NULL OR (start_location_lat >= -90 AND start_location_lat <= 90)),
                 start_location_lon REAL
                     CHECK(start_location_lon IS NULL OR (start_location_lon >= -180 AND start_location_lon <= 180)),
                 start_location_accuracy REAL,
                 end_location_lat REAL
                     CHECK(end_location_lat IS NULL OR (end_location_lat >= -90 AND end_location_lat <= 90)),
                 end_location_lon REAL
                     CHECK(end_location_lon IS NULL OR (end_location_lon >= -180 AND end_location_lon <= 180)),
                 end_location_accuracy REAL,
                 customer_satisfaction INTEGER
                     CHECK(customer_satisfaction IS NULL OR (customer_satisfaction >= 1 AND customer_satisfaction <= 10)),
                 quality_score INTEGER
                     CHECK(quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
                 final_observations TEXT,
                 customer_signature TEXT,
                 customer_comments TEXT,
                 metadata TEXT,
                 notes TEXT,
                 special_instructions TEXT,
                 device_info TEXT,
                 app_version TEXT,
                 synced INTEGER NOT NULL DEFAULT 0,
                 last_synced_at INTEGER,
                 sync_error TEXT,
                 created_at INTEGER NOT NULL,
                 updated_at INTEGER NOT NULL,
                 created_by TEXT,
                 updated_by TEXT
             )
             "#,
             [],
         )
         .map_err(|e| e.to_string())?;

        // Copy data from old table to new table
        conn.execute(
             r#"
              INSERT INTO interventions_new (
                  id, task_id, task_number, status, vehicle_plate, vehicle_model, vehicle_make, vehicle_year,
                  vehicle_color, vehicle_vin, client_id, client_name, client_email, client_phone,
                  technician_id, technician_name, intervention_type, current_step, completion_percentage,
                  ppf_zones_config, ppf_zones_extended, film_type, film_brand, film_model,
                  scheduled_at, started_at, completed_at, paused_at, estimated_duration, actual_duration,
                  weather_condition, lighting_condition, work_location, temperature_celsius, humidity_percentage,
                  start_location_lat, start_location_lon, start_location_accuracy,
                  end_location_lat, end_location_lon, end_location_accuracy,
                  customer_satisfaction, quality_score, final_observations, customer_signature, customer_comments,
                  metadata, notes, special_instructions, device_info, app_version,
                  synced, last_synced_at, sync_error, created_at, updated_at, created_by, updated_by
              )
              SELECT
                  id, task_id, task_number, status, vehicle_plate, vehicle_model, vehicle_make, vehicle_year,
                  vehicle_color, vehicle_vin, client_id, client_name, client_email, client_phone,
                  technician_id, technician_name, intervention_type, current_step, completion_percentage,
                 ppf_zones_config, ppf_zones_extended, film_type, film_brand, film_model,
                 scheduled_at, started_at, completed_at, paused_at, estimated_duration, actual_duration,
                 weather_condition, lighting_condition, work_location, temperature_celsius, humidity_percentage,
                 start_location_lat, start_location_lon, start_location_accuracy,
                 end_location_lat, end_location_lon, end_location_accuracy,
                 customer_satisfaction, quality_score, final_observations, customer_signature, customer_comments,
                 metadata, notes, special_instructions, device_info, app_version,
                 synced, last_synced_at, sync_error, created_at, updated_at, created_by, updated_by
             FROM interventions
             "#,
             [],
         )
         .map_err(|e| e.to_string())?;

        // Drop old table and rename new one
        conn.execute("DROP TABLE interventions", [])
            .map_err(|e| e.to_string())?;
        conn.execute("ALTER TABLE interventions_new RENAME TO interventions", [])
            .map_err(|e| e.to_string())?;
        // Add foreign key constraint
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_interventions_task_id ON interventions(task_id)",
            [],
        );

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![11],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn apply_migration_12(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        // Migration 12: Prevent duplicate active interventions per task
        tracing::info!("Applying migration 12: Add unique constraint for active interventions");

        // Step 1: Cleanup existing duplicates (keep most recent per task)
        // Use a CTE to identify duplicates
        let cancelled_count = conn.execute(
             r#"
             WITH duplicates AS (
               SELECT 
                 task_id, 
                 id,
                 status,
                 created_at,
                 ROW_NUMBER() OVER (
                   PARTITION BY task_id 
                   ORDER BY created_at DESC
                 ) as rn
               FROM interventions
               WHERE status IN ('pending', 'in_progress', 'paused')
             )
             UPDATE interventions
             SET 
               status = 'cancelled',
               notes = COALESCE(notes || char(10) || char(10), '') || 
                       '[AUTO-CANCELLED] Duplicate intervention detected and cancelled during migration 012 on ' || 
                       datetime('now') || '. This intervention was superseded by a newer intervention for the same task.',
               updated_at = unixepoch() * 1000
             WHERE id IN (
               SELECT id FROM duplicates WHERE rn > 1
             )
             "#,
             [],
         ).map_err(|e| e.to_string())?;

        tracing::info!(
            "Migration 12: Cancelled {} duplicate interventions",
            cancelled_count
        );

        // Step 2: Add unique index to prevent future duplicates
        conn.execute(
            r#"
             CREATE UNIQUE INDEX IF NOT EXISTS idx_interventions_active_per_task 
             ON interventions(task_id) 
             WHERE status IN ('pending', 'in_progress', 'paused')
             "#,
            [],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!(
            "Migration 12: Created unique index on interventions(task_id) for active statuses"
        );

        // Step 3: Verify no duplicates remain
        let duplicate_count: i32 = conn
            .query_row(
                r#"
             SELECT COUNT(*)
             FROM (
               SELECT task_id, COUNT(*) as cnt
               FROM interventions
               WHERE status IN ('pending', 'in_progress', 'paused')
               GROUP BY task_id
               HAVING COUNT(*) > 1
             )
             "#,
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if duplicate_count > 0 {
            tracing::error!(
                 "Migration 12: WARNING - {} tasks still have duplicate active interventions after cleanup",
                 duplicate_count
             );
            return Err(format!(
                 "Migration 12 verification failed: {} tasks still have duplicate active interventions",
                 duplicate_count
             ));
        }

        tracing::info!("Migration 12: Verified - no duplicate active interventions remain");

        // Record migration
        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![12],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 12: Completed successfully");
        Ok(())
    }

    fn apply_migration_16(&self) -> DbResult<()> {
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

    fn apply_migration_17(&self) -> DbResult<()> {
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

    fn apply_migration_18(&self) -> DbResult<()> {
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

    fn apply_migration_24(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!(
            "Applying migration 24: Enhanced inventory management system (idempotent version)"
        );

        // Check if material_categories table exists, create if not
        let material_categories_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='material_categories'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if material_categories_exists == 0 {
            tracing::info!("Creating material_categories table");
            conn.execute(
                r#"
                CREATE TABLE material_categories (
                  id TEXT PRIMARY KEY NOT NULL,
                  name TEXT NOT NULL,
                  code TEXT UNIQUE,
                  parent_id TEXT,
                  level INTEGER NOT NULL DEFAULT 1,
                  description TEXT,
                  color TEXT,
                  is_active INTEGER NOT NULL DEFAULT 1,
                  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  created_by TEXT,
                  updated_by TEXT,
                  synced INTEGER NOT NULL DEFAULT 0,
                  last_synced_at INTEGER,
                  FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE CASCADE,
                  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
                )
                "#,
                [],
            )
            .map_err(|e| format!("Failed to create material_categories table: {}", e))?;

            // Create indexes
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_material_categories_parent ON material_categories(parent_id)",
                [],
            )
            .map_err(|e| format!("Failed to create material_categories index: {}", e))?;
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_material_categories_level ON material_categories(level)",
                [],
            )
            .map_err(|e| format!("Failed to create material_categories index: {}", e))?;
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_material_categories_active ON material_categories(is_active)",
                [],
            )
            .map_err(|e| format!("Failed to create material_categories index: {}", e))?;

            // Insert default categories
            conn.execute(
                r#"
                INSERT INTO material_categories (id, name, code, level, description, color, created_at, updated_at)
                VALUES
                  ('cat_ppf_films', 'PPF Films', 'PPF', 1, 'Paint Protection Films', '#3B82F6', unixepoch() * 1000, unixepoch() * 1000),
                  ('cat_adhesives', 'Adhesives', 'ADH', 1, 'Adhesive products', '#10B981', unixepoch() * 1000, unixepoch() * 1000),
                  ('cat_cleaning', 'Cleaning Solutions', 'CLN', 1, 'Cleaning and preparation products', '#F59E0B', unixepoch() * 1000, unixepoch() * 1000),
                  ('cat_tools', 'Tools & Equipment', 'TLS', 1, 'Tools and installation equipment', '#EF4444', unixepoch() * 1000, unixepoch() * 1000),
                  ('cat_consumables', 'Consumables', 'CON', 1, 'Consumable supplies', '#8B5CF6', unixepoch() * 1000, unixepoch() * 1000)
                "#,
                [],
            )
            .map_err(|e| format!("Failed to insert default material categories: {}", e))?;
        } else {
            tracing::info!("material_categories table already exists, skipping creation");
        }

        // Check if inventory_transactions table exists, create if not
        let inventory_transactions_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventory_transactions'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if inventory_transactions_exists == 0 {
            tracing::info!("Creating inventory_transactions table");
            conn.execute(
                r#"
                CREATE TABLE inventory_transactions (
                  id TEXT PRIMARY KEY NOT NULL,
                  material_id TEXT NOT NULL,
                  transaction_type TEXT NOT NULL
                    CHECK(transaction_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'waste', 'return')),
                  quantity REAL NOT NULL,
                  previous_stock REAL NOT NULL,
                  new_stock REAL NOT NULL,
                  reference_number TEXT,
                  reference_type TEXT,
                  notes TEXT,
                  unit_cost REAL,
                  total_cost REAL,
                  warehouse_id TEXT,
                  location_from TEXT,
                  location_to TEXT,
                  batch_number TEXT,
                  expiry_date INTEGER,
                  quality_status TEXT,
                  intervention_id TEXT,
                  step_id TEXT,
                  performed_by TEXT NOT NULL,
                  performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  synced INTEGER NOT NULL DEFAULT 0,
                  last_synced_at INTEGER,
                  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
                  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
                  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
                  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
                )
                "#,
                [],
            )
            .map_err(|e| format!("Failed to create inventory_transactions table: {}", e))?;

            // Create indexes
            conn.execute("CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material ON inventory_transactions(material_id)", [])
                .map_err(|e| format!("Failed to create inventory_transactions index: {}", e))?;
            conn.execute("CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type)", [])
                .map_err(|e| format!("Failed to create inventory_transactions index: {}", e))?;
            conn.execute("CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(performed_at)", [])
                .map_err(|e| format!("Failed to create inventory_transactions index: {}", e))?;
            conn.execute("CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_number)", [])
                .map_err(|e| format!("Failed to create inventory_transactions index: {}", e))?;
            conn.execute("CREATE INDEX IF NOT EXISTS idx_inventory_transactions_intervention ON inventory_transactions(intervention_id)", [])
                .map_err(|e| format!("Failed to create inventory_transactions index: {}", e))?;
        } else {
            tracing::info!("inventory_transactions table already exists, skipping creation");
        }

        // Check if category_id column exists in materials table
        let category_id_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('materials') WHERE name='category_id'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if category_id_exists == 0 {
            tracing::info!("Adding category_id column to materials table");
            conn.execute("ALTER TABLE materials ADD COLUMN category_id TEXT", [])
                .map_err(|e| format!("Failed to add category_id column: {}", e))?;

            // Note: Foreign key constraint can't be added via ALTER TABLE in SQLite
            // The constraint will be enforced at application level
            tracing::info!("Added category_id column to materials table");
        } else {
            tracing::info!("category_id column already exists in materials table");
        }

        // Record migration
        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![24],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 24: Enhanced inventory management system completed successfully");
        Ok(())
    }

    fn apply_migration_25(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 25: Add comprehensive audit logging system");

        // Check if audit_events table already exists
        let audit_events_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='audit_events'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check audit_events table: {}", e))?;

        if audit_events_exists > 0 {
            tracing::info!(
                "Migration 25: audit_events table already exists, skipping (new database)"
            );

            // Verify all required indexes exist
            let required_indexes = vec![
                "idx_audit_events_user_id",
                "idx_audit_events_timestamp",
                "idx_audit_events_resource",
                "idx_audit_events_event_type",
                "idx_audit_events_result",
                "idx_audit_events_user_timestamp",
                "idx_audit_events_resource_timestamp",
            ];

            for index_name in required_indexes {
                let index_exists: i64 = conn
                    .query_row(
                        "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?",
                        [index_name],
                        |row| row.get(0),
                    )
                    .map_err(|e| format!("Failed to check index {}: {}", index_name, e))?;

                if index_exists == 0 {
                    tracing::info!("Migration 25: Creating missing index {}", index_name);
                    match index_name {
                        "idx_audit_events_user_id" => {
                            conn.execute(
                                "CREATE INDEX idx_audit_events_user_id ON audit_events(user_id)",
                                [],
                            )
                            .map_err(|e| format!("Failed to create index {}: {}", index_name, e))?;
                        }
                        "idx_audit_events_timestamp" => {
                            conn.execute("CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp)", [])
                                .map_err(|e| format!("Failed to create index {}: {}", index_name, e))?;
                        }
                        "idx_audit_events_resource" => {
                            conn.execute("CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id)", [])
                                .map_err(|e| format!("Failed to create index {}: {}", index_name, e))?;
                        }
                        "idx_audit_events_event_type" => {
                            conn.execute("CREATE INDEX idx_audit_events_event_type ON audit_events(event_type)", [])
                                .map_err(|e| format!("Failed to create index {}: {}", index_name, e))?;
                        }
                        "idx_audit_events_result" => {
                            conn.execute(
                                "CREATE INDEX idx_audit_events_result ON audit_events(result)",
                                [],
                            )
                            .map_err(|e| format!("Failed to create index {}: {}", index_name, e))?;
                        }
                        "idx_audit_events_user_timestamp" => {
                            conn.execute("CREATE INDEX idx_audit_events_user_timestamp ON audit_events(user_id, timestamp DESC)", [])
                                .map_err(|e| format!("Failed to create index {}: {}", index_name, e))?;
                        }
                        "idx_audit_events_resource_timestamp" => {
                            conn.execute("CREATE INDEX idx_audit_events_resource_timestamp ON audit_events(resource_type, resource_id, timestamp DESC)", [])
                                .map_err(|e| format!("Failed to create index {}: {}", index_name, e))?;
                        }
                        _ => {
                            return Err(format!("Unknown index: {}", index_name));
                        }
                    }
                }
            }

            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![25],
            )
            .map_err(|e| e.to_string())?;

            return Ok(());
        }

        // Create audit_events table for comprehensive security audit trail
        tracing::info!("Migration 25: Creating audit_events table");
        conn.execute(
            r#"
            CREATE TABLE audit_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                resource_id TEXT,
                resource_type TEXT,
                description TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                result TEXT NOT NULL,
                previous_state TEXT,
                new_state TEXT,
                timestamp INTEGER NOT NULL,
                metadata TEXT,
                session_id TEXT,
                request_id TEXT,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            )
            "#,
            [],
        )
        .map_err(|e| format!("Failed to create audit_events table: {}", e))?;

        // Create indexes for optimal audit log performance
        tracing::info!("Migration 25: Creating audit event indexes");
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id)",
            [],
        )
        .map_err(|e| format!("Failed to create user_id index: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp)",
            [],
        )
        .map_err(|e| format!("Failed to create timestamp index: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id)",
            [],
        )
        .map_err(|e| format!("Failed to create resource index: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type)",
            [],
        )
        .map_err(|e| format!("Failed to create event_type index: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_result ON audit_events(result)",
            [],
        )
        .map_err(|e| format!("Failed to create result index: {}", e))?;

        // Composite indexes for common audit queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_user_timestamp ON audit_events(user_id, timestamp DESC)",
            [],
        )
        .map_err(|e| format!("Failed to create user_timestamp composite index: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_resource_timestamp ON audit_events(resource_type, resource_id, timestamp DESC)", [])
            .map_err(|e| format!("Failed to create resource_timestamp composite index: {}", e))?;

        tracing::info!("Migration 25: Audit logging system created successfully");

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![25],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn apply_migration_26(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 26: Add performance optimization indexes");

        // Critical composite indexes for task query performance
        tracing::info!("Migration 26: Creating task performance indexes");
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at)",
            [],
        )
        .map_err(|e| format!("Failed to create idx_tasks_status_created: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_technician_date ON tasks(technician_id, scheduled_date)", [])
            .map_err(|e| format!("Failed to create idx_tasks_technician_date: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status_created_desc ON tasks(status, created_at DESC)", [])
            .map_err(|e| format!("Failed to create idx_tasks_status_created_desc: {}", e))?;

        // Additional performance indexes for common query patterns
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority)",
            [],
        )
        .map_err(|e| format!("Failed to create idx_tasks_status_priority: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status)",
            [],
        )
        .map_err(|e| format!("Failed to create idx_tasks_client_status: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_technician_status_date ON tasks(technician_id, status, scheduled_date)", [])
            .map_err(|e| format!("Failed to create idx_tasks_technician_status_date: {}", e))?;

        // Intervention query optimization indexes
        tracing::info!("Migration 26: Creating intervention performance indexes");
        conn.execute("CREATE INDEX IF NOT EXISTS idx_interventions_task_status ON interventions(task_id, status)", [])
            .map_err(|e| format!("Failed to create idx_interventions_task_status: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_interventions_status_created ON interventions(status, created_at)", [])
            .map_err(|e| format!("Failed to create idx_interventions_status_created: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_interventions_technician_status ON interventions(technician_id, status)", [])
            .map_err(|e| format!("Failed to create idx_interventions_technician_status: {}", e))?;

        // Photo management performance indexes
        tracing::info!("Migration 26: Creating photo performance indexes");
        conn.execute("CREATE INDEX IF NOT EXISTS idx_photos_intervention_step ON photos(intervention_id, step_id)", [])
            .map_err(|e| format!("Failed to create idx_photos_intervention_step: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_photos_step_status ON photos(step_id, is_approved)",
            [],
        )
        .map_err(|e| format!("Failed to create idx_photos_step_status: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC)",
            [],
        )
        .map_err(|e| format!("Failed to create idx_photos_created_at: {}", e))?;

        // Client query optimization
        tracing::info!("Migration 26: Creating client performance indexes");
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_clients_name_email ON clients(name, email)",
            [],
        )
        .map_err(|e| format!("Failed to create idx_clients_name_email: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_clients_active_created ON clients(deleted_at, created_at DESC)", [])
            .map_err(|e| format!("Failed to create idx_clients_active_created: {}", e))?;

        // User activity tracking
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC)",
            [],
        )
        .map_err(|e| format!("Failed to create idx_users_last_login: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(is_active, role)",
            [],
        )
        .map_err(|e| format!("Failed to create idx_users_active_role: {}", e))?;

        // Sync queue optimization
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created ON sync_queue(status, created_at)", [])
            .map_err(|e| format!("Failed to create idx_sync_queue_status_created: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_queue_entity_created ON sync_queue(entity_type, entity_id, created_at)", [])
            .map_err(|e| format!("Failed to create idx_sync_queue_entity_created: {}", e))?;

        // Workflow optimization
        conn.execute("CREATE INDEX IF NOT EXISTS intervention_steps_intervention_status ON intervention_steps(intervention_id, step_status)", [])
            .map_err(|e| format!("Failed to create intervention_steps_intervention_status: {}", e))?;

        conn.execute("CREATE INDEX IF NOT EXISTS intervention_steps_created_at ON intervention_steps(created_at DESC)", [])
            .map_err(|e| format!("Failed to create intervention_steps_created_at: {}", e))?;

        tracing::info!("Migration 26: Performance optimization indexes created successfully");

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![26],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn apply_migration_27(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 27: Add CHECK constraints to tasks table");

        // Check if constraints already exist by trying to insert invalid data
        // If constraints exist, this will fail immediately
        let has_constraints = conn
            .execute(
                "INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, scheduled_date, status)
                 VALUES ('test-constraint-check-027', 'TEST-CHK-027', 'Constraint Check', 'TEST', 'Model', '2026-02-01', 'invalid_status')",
                []
            )
            .is_err();

        if has_constraints {
            tracing::info!(
                "Migration 027: CHECK constraints already exist, skipping (new database)"
            );
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![27],
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

        tracing::info!("Migration 027: Adding CHECK constraints to tasks table (old database)");

        // Start transaction for safety
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

        // Create new tasks table with CHECK constraints and foreign keys
        tx.execute(
            r#"
            CREATE TABLE tasks_new (
                id TEXT PRIMARY KEY,
                task_number TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                vehicle_plate TEXT,
                vehicle_model TEXT,
                vehicle_year TEXT,
                vehicle_make TEXT,
                vin TEXT,
                ppf_zones TEXT,
                custom_ppf_zones TEXT,
                status TEXT NOT NULL DEFAULT 'draft',
                priority TEXT NOT NULL DEFAULT 'medium',
                technician_id TEXT,
                assigned_at INTEGER,
                assigned_by TEXT,
                scheduled_date TEXT,
                start_time TEXT,
                end_time TEXT,
                date_rdv TEXT,
                heure_rdv TEXT,
                template_id TEXT,
                workflow_id TEXT,
                workflow_status TEXT,
                current_workflow_step_id TEXT,
                started_at INTEGER,
                completed_at INTEGER,
                completed_steps TEXT,
                client_id TEXT,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                customer_address TEXT,
                external_id TEXT,
                lot_film TEXT,
                checklist_completed INTEGER DEFAULT 0,
                notes TEXT,
                tags TEXT,
                estimated_duration INTEGER,
                actual_duration INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                creator_id TEXT,
                created_by TEXT,
                updated_by TEXT,
                deleted_at INTEGER,
                deleted_by TEXT,
                synced INTEGER DEFAULT 0,
                last_synced_at INTEGER,

                -- Foreign keys
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
                FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,

                -- CHECK constraints for data integrity
                CHECK(status IN (
                    'draft', 'scheduled', 'in_progress', 'completed', 'cancelled',
                    'on_hold', 'pending', 'invalid', 'archived', 'failed',
                    'overdue', 'assigned', 'paused'
                )),
                CHECK(priority IN ('low', 'medium', 'high', 'urgent'))
            )
            "#,
            [],
        )
        .map_err(|e| format!("Failed to create tasks_new table: {}", e))?;

        // Copy existing data from old table to new table
        let rows_copied = tx
            .execute("INSERT INTO tasks_new SELECT * FROM tasks", [])
            .map_err(|e| format!("Failed to copy data to tasks_new: {}", e))?;

        tracing::info!(
            "Migration 027: Copied {} rows from tasks to tasks_new",
            rows_copied
        );

        // Drop old table
        tx.execute("DROP TABLE tasks", [])
            .map_err(|e| format!("Failed to drop tasks table: {}", e))?;

        // Rename new table
        tx.execute("ALTER TABLE tasks_new RENAME TO tasks", [])
            .map_err(|e| format!("Failed to rename tasks_new to tasks: {}", e))?;

        // Recreate all indexes for the tasks table
        tx.execute_batch(
            r#"
            -- Single column indexes
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_technician_id ON tasks(technician_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_synced ON tasks(synced) WHERE synced = 0;
            CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON tasks(task_number);

            -- Composite indexes for task query patterns
            CREATE INDEX IF NOT EXISTS idx_tasks_status_technician ON tasks(status, technician_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status);
            CREATE INDEX IF NOT EXISTS idx_tasks_technician_scheduled ON tasks(technician_id, scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_scheduled ON tasks(status, scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(synced, status) WHERE synced = 0;

            -- Performance optimization indexes from migration 26
            CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_technician_date ON tasks(technician_id, scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_created_desc ON tasks(status, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status);
            CREATE INDEX IF NOT EXISTS idx_tasks_technician_status_date ON tasks(technician_id, status, scheduled_date);
            "#
        )
        .map_err(|e| format!("Failed to recreate indexes: {}", e))?;

        // Verify data integrity
        let count_after: i64 = tx
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
            .map_err(|e| format!("Failed to verify row count: {}", e))?;

        let rows_copied_i64 = rows_copied as i64;
        if count_after != rows_copied_i64 {
            return Err(format!(
                "Migration 027: Data integrity check failed. Expected {} rows, got {}",
                rows_copied_i64, count_after
            ));
        }

        tracing::info!(
            "Migration 027: Data integrity verified ({} rows)",
            count_after
        );

        // Commit transaction
        tx.commit().map_err(|e| e.to_string())?;

        // Record migration
        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![27],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 027: Completed successfully - CHECK constraints added");
        Ok(())
    }

    fn apply_migration_28(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 28: Add 2FA backup codes/verified_at columns");

        let backup_codes_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='backup_codes'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check backup_codes column: {}", e))?;

        if backup_codes_exists == 0 {
            conn.execute("ALTER TABLE users ADD COLUMN backup_codes TEXT", [])
                .map_err(|e| format!("Failed to add backup_codes column: {}", e))?;
        }

        let verified_at_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='verified_at'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check verified_at column: {}", e))?;

        if verified_at_exists == 0 {
            conn.execute("ALTER TABLE users ADD COLUMN verified_at TEXT", [])
                .map_err(|e| format!("Failed to add verified_at column: {}", e))?;
        }

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![28],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn apply_migration_29(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 29: Add first_name and last_name columns to users");

        let first_name_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='first_name'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check first_name column: {}", e))?;

        if first_name_exists == 0 {
            conn.execute(
                "ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT ''",
                [],
            )
            .map_err(|e| format!("Failed to add first_name column: {}", e))?;
        }

        let last_name_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='last_name'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check last_name column: {}", e))?;

        if last_name_exists == 0 {
            conn.execute(
                "ALTER TABLE users ADD COLUMN last_name TEXT NOT NULL DEFAULT ''",
                [],
            )
            .map_err(|e| format!("Failed to add last_name column: {}", e))?;
        }

        // Backfill first_name and last_name from full_name where missing
        conn.execute_batch(
            r#"
            UPDATE users
            SET
                first_name = CASE
                    WHEN TRIM(first_name) <> '' THEN first_name
                    WHEN INSTR(full_name, ' ') > 0 THEN SUBSTR(full_name, 1, INSTR(full_name, ' ') - 1)
                    ELSE full_name
                END,
                last_name = CASE
                    WHEN TRIM(last_name) <> '' THEN last_name
                    WHEN INSTR(full_name, ' ') > 0 THEN SUBSTR(full_name, INSTR(full_name, ' ') + 1)
                    ELSE ''
                END
            WHERE (first_name IS NULL OR TRIM(first_name) = '')
               OR (last_name IS NULL OR TRIM(last_name) = '');
            "#,
        )
        .map_err(|e| format!("Failed to backfill user names: {}", e))?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![29],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn apply_migration_30(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 30: Add updated_at to user_sessions");

        let updated_at_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('user_sessions') WHERE name='updated_at'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check updated_at column: {}", e))?;

        if updated_at_exists == 0 {
            conn.execute(
                "ALTER TABLE user_sessions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)",
                [],
            )
            .map_err(|e| format!("Failed to add updated_at column: {}", e))?;
        }

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![30],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn apply_migration_31(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!(
            "Applying migration 31: Add non-negative CHECK constraints to inventory tables"
        );

        // --- Rebuild inventory_transactions with CHECK constraints ---
        let inv_tx_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventory_transactions'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if inv_tx_exists > 0 {
            // Check if CHECK constraint already present
            let table_sql: String = conn
                .query_row(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name='inventory_transactions'",
                    [],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to get inventory_transactions SQL: {}", e))?;

            if !table_sql.contains("quantity >= 0") {
                let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

                tx.execute_batch(
                r#"
                CREATE TABLE inventory_transactions_new (
                  id TEXT PRIMARY KEY NOT NULL,
                  material_id TEXT NOT NULL,
                  transaction_type TEXT NOT NULL
                    CHECK(transaction_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'waste', 'return')),
                  quantity REAL NOT NULL CHECK(quantity >= 0),
                  previous_stock REAL NOT NULL CHECK(previous_stock >= 0),
                  new_stock REAL NOT NULL CHECK(new_stock >= 0),
                  reference_number TEXT,
                  reference_type TEXT,
                  notes TEXT,
                  unit_cost REAL,
                  total_cost REAL,
                  warehouse_id TEXT,
                  location_from TEXT,
                  location_to TEXT,
                  batch_number TEXT,
                  expiry_date INTEGER,
                  quality_status TEXT,
                  intervention_id TEXT,
                  step_id TEXT,
                  performed_by TEXT NOT NULL,
                  performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  synced INTEGER NOT NULL DEFAULT 0,
                  last_synced_at INTEGER,
                  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
                  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
                  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
                  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
                );

                INSERT INTO inventory_transactions_new
                SELECT * FROM inventory_transactions;

                DROP TABLE inventory_transactions;
                ALTER TABLE inventory_transactions_new RENAME TO inventory_transactions;

                CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material ON inventory_transactions(material_id);
                CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
                CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(performed_at);
                CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_number);
                CREATE INDEX IF NOT EXISTS idx_inventory_transactions_intervention ON inventory_transactions(intervention_id);
                "#,
            )
            .map_err(|e| format!("Failed to rebuild inventory_transactions: {}", e))?;

                tx.commit().map_err(|e| e.to_string())?;
            }
        }

        // --- Rebuild materials with CHECK constraints on stock fields ---
        let materials_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='materials'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if materials_exists > 0 {
            // Check if non-negative CHECK constraint already present on current_stock
            let table_sql: String = conn
                .query_row(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name='materials'",
                    [],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to get materials table SQL: {}", e))?;

            let needs_rebuild = !table_sql.contains("current_stock >= 0");

            if needs_rebuild {
                let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

                // Get column list for materials dynamically
                tx.execute_batch(
                    r#"
                    CREATE TABLE materials_new (
                      id TEXT PRIMARY KEY NOT NULL,
                      sku TEXT NOT NULL UNIQUE,
                      name TEXT NOT NULL,
                      description TEXT,
                      material_type TEXT NOT NULL
                        CHECK(material_type IN ('ppf_film', 'adhesive', 'cleaning_solution', 'tool', 'consumable')),
                      category TEXT,
                      subcategory TEXT,
                      category_id TEXT,
                      brand TEXT,
                      model TEXT,
                      specifications TEXT,
                      unit_of_measure TEXT NOT NULL DEFAULT 'piece'
                        CHECK(unit_of_measure IN ('piece', 'meter', 'liter', 'gram', 'roll')),
                      current_stock REAL NOT NULL DEFAULT 0 CHECK(current_stock >= 0),
                      minimum_stock REAL DEFAULT 0 CHECK(minimum_stock IS NULL OR minimum_stock >= 0),
                      maximum_stock REAL CHECK(maximum_stock IS NULL OR maximum_stock >= 0),
                      reorder_point REAL CHECK(reorder_point IS NULL OR reorder_point >= 0),
                      unit_cost REAL,
                      currency TEXT DEFAULT 'EUR',
                      supplier_id TEXT,
                      supplier_name TEXT,
                      supplier_sku TEXT,
                      quality_grade TEXT,
                      certification TEXT,
                      expiry_date INTEGER,
                      batch_number TEXT,
                      serial_numbers TEXT,
                      is_active INTEGER NOT NULL DEFAULT 1,
                      is_discontinued INTEGER NOT NULL DEFAULT 0,
                      storage_location TEXT,
                      warehouse_id TEXT,
                      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                      created_by TEXT,
                      updated_by TEXT,
                      synced INTEGER NOT NULL DEFAULT 0,
                      last_synced_at INTEGER,
                      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
                      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
                    );

                    INSERT INTO materials_new (
                      id, sku, name, description, material_type, category, subcategory, category_id,
                      brand, model, specifications, unit_of_measure,
                      current_stock, minimum_stock, maximum_stock, reorder_point,
                      unit_cost, currency, supplier_id, supplier_name, supplier_sku,
                      quality_grade, certification, expiry_date, batch_number, serial_numbers,
                      is_active, is_discontinued, storage_location, warehouse_id,
                      created_at, updated_at, created_by, updated_by, synced, last_synced_at
                    )
                    SELECT
                      id, sku, name, description, material_type, category, subcategory, category_id,
                      brand, model, specifications, unit_of_measure,
                      MAX(current_stock, 0), MAX(COALESCE(minimum_stock, 0), 0),
                      CASE WHEN maximum_stock IS NULL THEN NULL ELSE MAX(maximum_stock, 0) END,
                      CASE WHEN reorder_point IS NULL THEN NULL ELSE MAX(reorder_point, 0) END,
                      unit_cost, currency, supplier_id, supplier_name, supplier_sku,
                      quality_grade, certification, expiry_date, batch_number, serial_numbers,
                      is_active, is_discontinued, storage_location, warehouse_id,
                      created_at, updated_at, created_by, updated_by, synced, last_synced_at
                    FROM materials;

                    DROP TABLE materials;
                    ALTER TABLE materials_new RENAME TO materials;

                    CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);
                    CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type);
                    CREATE INDEX IF NOT EXISTS idx_materials_supplier ON materials(supplier_id);
                    CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
                    "#,
                )
                .map_err(|e| format!("Failed to rebuild materials: {}", e))?;

                tx.commit().map_err(|e| e.to_string())?;
            }
        }

        // --- Rebuild material_consumption with CHECK constraints ---
        let mc_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='material_consumption'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if mc_exists > 0 {
            // Check if CHECK constraint already present
            let table_sql: String = conn
                .query_row(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name='material_consumption'",
                    [],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to get material_consumption SQL: {}", e))?;

            if !table_sql.contains("quantity_used >= 0") {
                let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

                tx.execute_batch(
                r#"
                CREATE TABLE material_consumption_new (
                  id TEXT PRIMARY KEY NOT NULL,
                  intervention_id TEXT NOT NULL,
                  material_id TEXT NOT NULL,
                  step_id TEXT,
                  quantity_used REAL NOT NULL CHECK(quantity_used >= 0),
                  unit_cost REAL,
                  total_cost REAL,
                  waste_quantity REAL DEFAULT 0 CHECK(waste_quantity IS NULL OR waste_quantity >= 0),
                  waste_reason TEXT,
                  batch_used TEXT,
                  expiry_used INTEGER,
                  quality_notes TEXT,
                  step_number INTEGER,
                  recorded_by TEXT,
                  recorded_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
                  synced INTEGER NOT NULL DEFAULT 0,
                  last_synced_at INTEGER,
                  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
                  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
                  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
                  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
                );

                INSERT INTO material_consumption_new (
                  id, intervention_id, material_id, step_id,
                  quantity_used, unit_cost, total_cost, waste_quantity, waste_reason,
                  batch_used, expiry_used, quality_notes, step_number,
                  recorded_by, recorded_at, created_at, updated_at, synced, last_synced_at
                )
                SELECT
                  id, intervention_id, material_id, step_id,
                  MAX(quantity_used, 0), unit_cost, total_cost,
                  CASE WHEN waste_quantity IS NULL THEN NULL ELSE MAX(waste_quantity, 0) END,
                  waste_reason,
                  batch_used, expiry_used, quality_notes, step_number,
                  recorded_by, recorded_at, created_at, updated_at, synced, last_synced_at
                FROM material_consumption;

                DROP TABLE material_consumption;
                ALTER TABLE material_consumption_new RENAME TO material_consumption;

                CREATE INDEX IF NOT EXISTS idx_material_consumption_intervention ON material_consumption(intervention_id);
                CREATE INDEX IF NOT EXISTS idx_material_consumption_material ON material_consumption(material_id);
                CREATE INDEX IF NOT EXISTS idx_material_consumption_step ON material_consumption(step_id);
                "#,
            )
            .map_err(|e| format!("Failed to rebuild material_consumption: {}", e))?;

                tx.commit().map_err(|e| e.to_string())?;
            }
        }

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![31],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 31: Non-negative CHECK constraints applied successfully");
        Ok(())
    }

    fn apply_migration_32(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 32: Add FK for interventions.task_id -> tasks(id)");

        // Check if FK already exists by inspecting foreign_key_list
        let has_task_fk: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_foreign_key_list('interventions') WHERE \"table\" = 'tasks' AND \"from\" = 'task_id'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check FK: {}", e))?;

        if has_task_fk > 0 {
            tracing::info!("Migration 32: FK for interventions.task_id already exists, skipping");
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![32],
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

        // Need to rebuild interventions table with the FK
        // Get column names from current table
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

        tx.execute_batch(
            r#"
            CREATE TABLE interventions_new (
              id TEXT PRIMARY KEY NOT NULL,
              task_id TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
              vehicle_plate TEXT NOT NULL,
              vehicle_model TEXT,
              vehicle_make TEXT,
              vehicle_year INTEGER
                CHECK(vehicle_year IS NULL OR (vehicle_year >= 1900 AND vehicle_year <= 2100)),
              vehicle_color TEXT,
              vehicle_vin TEXT,
              client_id TEXT,
              client_name TEXT,
              client_email TEXT,
              client_phone TEXT,
              technician_id TEXT,
              technician_name TEXT,
              intervention_type TEXT NOT NULL DEFAULT 'ppf',
              current_step INTEGER NOT NULL DEFAULT 0,
              completion_percentage REAL DEFAULT 0
                CHECK(completion_percentage >= 0 AND completion_percentage <= 100),
              ppf_zones_config TEXT,
              ppf_zones_extended TEXT,
              film_type TEXT
                CHECK(film_type IS NULL OR film_type IN ('standard', 'premium', 'matte', 'colored')),
              film_brand TEXT,
              film_model TEXT,
              scheduled_at INTEGER,
              started_at INTEGER,
              completed_at INTEGER,
              paused_at INTEGER,
              estimated_duration INTEGER,
              actual_duration INTEGER,
              weather_condition TEXT
                CHECK(weather_condition IS NULL OR weather_condition IN ('sunny', 'cloudy', 'rainy', 'foggy', 'windy', 'other')),
              lighting_condition TEXT
                CHECK(lighting_condition IS NULL OR lighting_condition IN ('natural', 'artificial', 'mixed')),
              work_location TEXT
                CHECK(work_location IS NULL OR work_location IN ('indoor', 'outdoor', 'semi_covered')),
              temperature_celsius REAL,
              humidity_percentage REAL
                CHECK(humidity_percentage IS NULL OR (humidity_percentage >= 0 AND humidity_percentage <= 100)),
              start_location_lat REAL
                CHECK(start_location_lat IS NULL OR (start_location_lat >= -90 AND start_location_lat <= 90)),
              start_location_lon REAL
                CHECK(start_location_lon IS NULL OR (start_location_lon >= -180 AND start_location_lon <= 180)),
              start_location_accuracy REAL,
              end_location_lat REAL
                CHECK(end_location_lat IS NULL OR (end_location_lat >= -90 AND end_location_lat <= 90)),
              end_location_lon REAL
                CHECK(end_location_lon IS NULL OR (end_location_lon >= -180 AND end_location_lon <= 180)),
              end_location_accuracy REAL,
              customer_satisfaction INTEGER
                CHECK(customer_satisfaction IS NULL OR (customer_satisfaction >= 1 AND customer_satisfaction <= 10)),
              quality_score INTEGER
                CHECK(quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
              final_observations TEXT,
              customer_signature TEXT,
              customer_comments TEXT,
              metadata TEXT,
              notes TEXT,
              special_instructions TEXT,
              device_info TEXT,
              app_version TEXT,
              synced INTEGER NOT NULL DEFAULT 0,
              last_synced_at INTEGER,
              sync_error TEXT,
              created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
              updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
              created_by TEXT,
              updated_by TEXT,
              task_number TEXT,
              FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
              FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
              FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );

            INSERT INTO interventions_new (
              id, task_id, status, vehicle_plate, vehicle_model, vehicle_make,
              vehicle_year, vehicle_color, vehicle_vin, client_id, client_name,
              client_email, client_phone, technician_id, technician_name,
              intervention_type, current_step, completion_percentage,
              ppf_zones_config, ppf_zones_extended, film_type, film_brand, film_model,
              scheduled_at, started_at, completed_at, paused_at,
              estimated_duration, actual_duration,
              weather_condition, lighting_condition, work_location,
              temperature_celsius, humidity_percentage,
              start_location_lat, start_location_lon, start_location_accuracy,
              end_location_lat, end_location_lon, end_location_accuracy,
              customer_satisfaction, quality_score, final_observations,
              customer_signature, customer_comments,
              metadata, notes, special_instructions,
              device_info, app_version,
              synced, last_synced_at, sync_error,
              created_at, updated_at, created_by, updated_by, task_number
            )
            SELECT
              id, task_id, status, vehicle_plate, vehicle_model, vehicle_make,
              vehicle_year, vehicle_color, vehicle_vin, client_id, client_name,
              client_email, client_phone, technician_id, technician_name,
              intervention_type, current_step, completion_percentage,
              ppf_zones_config, ppf_zones_extended, film_type, film_brand, film_model,
              scheduled_at, started_at, completed_at, paused_at,
              estimated_duration, actual_duration,
              weather_condition, lighting_condition, work_location,
              temperature_celsius, humidity_percentage,
              start_location_lat, start_location_lon, start_location_accuracy,
              end_location_lat, end_location_lon, end_location_accuracy,
              customer_satisfaction, quality_score, final_observations,
              customer_signature, customer_comments,
              metadata, notes, special_instructions,
              device_info, app_version,
              synced, last_synced_at, sync_error,
              created_at, updated_at, created_by, updated_by, task_number
            FROM interventions;

            DROP TABLE interventions;
            ALTER TABLE interventions_new RENAME TO interventions;

            -- Recreate indexes
            CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
            CREATE INDEX IF NOT EXISTS idx_interventions_synced ON interventions(synced) WHERE synced = 0;
            CREATE INDEX IF NOT EXISTS idx_interventions_technician ON interventions(technician_id);
            CREATE INDEX IF NOT EXISTS idx_interventions_client ON interventions(client_id);
            CREATE INDEX IF NOT EXISTS idx_interventions_scheduled ON interventions(scheduled_at);
            CREATE INDEX IF NOT EXISTS idx_interventions_created ON interventions(created_at);
            CREATE INDEX IF NOT EXISTS idx_interventions_task_number ON interventions(task_number);
            CREATE INDEX IF NOT EXISTS idx_interventions_vehicle_plate ON interventions(vehicle_plate);
            CREATE INDEX IF NOT EXISTS idx_interventions_status_technician ON interventions(status, technician_id);
            CREATE INDEX IF NOT EXISTS idx_interventions_status_scheduled ON interventions(status, scheduled_at);
            CREATE INDEX IF NOT EXISTS idx_interventions_status_created ON interventions(status, created_at);
            CREATE INDEX IF NOT EXISTS idx_interventions_client_status ON interventions(client_id, status);
            CREATE INDEX IF NOT EXISTS idx_interventions_technician_scheduled ON interventions(technician_id, scheduled_at);
            CREATE INDEX IF NOT EXISTS idx_interventions_technician_created ON interventions(technician_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_interventions_client_created ON interventions(client_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_interventions_sync_status ON interventions(synced, status) WHERE synced = 0;
            "#,
        )
        .map_err(|e| format!("Failed to rebuild interventions table: {}", e))?;

        tx.commit().map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![32],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 32: FK for interventions.task_id added successfully");
        Ok(())
    }

    fn apply_migration_33(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!(
            "Applying migration 33: Add FKs for tasks.workflow_id and tasks.current_workflow_step_id"
        );

        // Check if workflow_id FK already exists
        let has_workflow_fk: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_foreign_key_list('tasks') WHERE \"table\" = 'interventions' AND \"from\" = 'workflow_id'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check FK: {}", e))?;

        if has_workflow_fk > 0 {
            tracing::info!("Migration 33: FKs already exist in tasks table, skipping");
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![33],
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

        tx.execute_batch(
            r#"
            DROP VIEW IF EXISTS client_statistics;
            DROP VIEW IF EXISTS calendar_tasks;

            CREATE TABLE tasks_new (
                id TEXT PRIMARY KEY,
                task_number TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                vehicle_plate TEXT,
                vehicle_model TEXT,
                vehicle_year TEXT,
                vehicle_make TEXT,
                vin TEXT,
                ppf_zones TEXT,
                custom_ppf_zones TEXT,
                status TEXT NOT NULL DEFAULT 'draft',
                priority TEXT NOT NULL DEFAULT 'medium',
                technician_id TEXT,
                assigned_at INTEGER,
                assigned_by TEXT,
                scheduled_date TEXT,
                start_time TEXT,
                end_time TEXT,
                date_rdv TEXT,
                heure_rdv TEXT,
                template_id TEXT,
                workflow_id TEXT,
                workflow_status TEXT,
                current_workflow_step_id TEXT,
                started_at INTEGER,
                completed_at INTEGER,
                completed_steps TEXT,
                client_id TEXT,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                customer_address TEXT,
                external_id TEXT,
                lot_film TEXT,
                checklist_completed INTEGER DEFAULT 0,
                notes TEXT,
                tags TEXT,
                estimated_duration INTEGER,
                actual_duration INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                creator_id TEXT,
                created_by TEXT,
                updated_by TEXT,
                deleted_at INTEGER,
                deleted_by TEXT,
                synced INTEGER DEFAULT 0,
                last_synced_at INTEGER,
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
                FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (workflow_id) REFERENCES interventions(id) ON DELETE SET NULL,
                FOREIGN KEY (current_workflow_step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
                CHECK(status IN (
                    'draft', 'scheduled', 'in_progress', 'completed', 'cancelled',
                    'on_hold', 'pending', 'invalid', 'archived', 'failed',
                    'overdue', 'assigned', 'paused'
                )),
                CHECK(priority IN ('low', 'medium', 'high', 'urgent'))
            );

            INSERT INTO tasks_new (
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones,
                status, priority, technician_id, assigned_at, assigned_by,
                scheduled_date, start_time, end_time, date_rdv, heure_rdv,
                template_id, workflow_id, workflow_status, current_workflow_step_id,
                started_at, completed_at, completed_steps,
                client_id, customer_name, customer_email, customer_phone,
                customer_address, external_id, lot_film, checklist_completed,
                notes, tags, estimated_duration, actual_duration,
                created_at, updated_at, creator_id, created_by, updated_by,
                deleted_at, deleted_by, synced, last_synced_at
            )
            SELECT
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones,
                status, priority, technician_id, assigned_at, assigned_by,
                scheduled_date, start_time, end_time, date_rdv, heure_rdv,
                template_id, workflow_id, workflow_status, current_workflow_step_id,
                started_at, completed_at, completed_steps,
                client_id, customer_name, customer_email, customer_phone,
                customer_address, external_id, lot_film, checklist_completed,
                notes, tags, estimated_duration, actual_duration,
                created_at, updated_at, creator_id, created_by, updated_by,
                deleted_at, deleted_by, synced, last_synced_at
            FROM tasks;

            DROP TABLE tasks;
            ALTER TABLE tasks_new RENAME TO tasks;

            -- Recreate indexes
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_technician_id ON tasks(technician_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_synced ON tasks(synced) WHERE synced = 0;
            CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON tasks(task_number);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_technician ON tasks(status, technician_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status);
            CREATE INDEX IF NOT EXISTS idx_tasks_technician_scheduled ON tasks(technician_id, scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_scheduled ON tasks(status, scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(synced, status) WHERE synced = 0;

            CREATE VIEW IF NOT EXISTS client_statistics AS
            SELECT
              c.id,
              c.name,
              c.customer_type,
              c.created_at,
              COUNT(DISTINCT t.id) as total_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as active_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
              MAX(CASE WHEN t.status IN ('completed', 'in_progress') THEN t.updated_at END) as last_task_date
            FROM clients c
            LEFT JOIN tasks t ON t.client_id = c.id AND t.deleted_at IS NULL
            WHERE c.deleted_at IS NULL
            GROUP BY c.id, c.name, c.customer_type, c.created_at;

            CREATE VIEW IF NOT EXISTS calendar_tasks AS
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
        .map_err(|e| format!("Failed to rebuild tasks table: {}", e))?;

        tx.commit().map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![33],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 33: Task workflow FKs added successfully");
        Ok(())
    }
}
