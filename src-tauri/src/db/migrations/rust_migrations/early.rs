//! Rust-implemented migrations 002–012.
//!
//! These early migrations handle core schema restructuring: column renames,
//! table recreations, trigger additions, and duplicate-prevention constraints.

use crate::db::{Database, DbResult};
use rusqlite::params;

impl Database {
    pub(in crate::db::migrations) fn apply_migration_002(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_006(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_008(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_009(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_11(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 11: Adding task_id column to interventions table");

        // First, check if task_id column exists
        let task_id_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('interventions') WHERE name='task_id'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        tracing::info!("task_id column exists check: {}", task_id_exists);

        if task_id_exists == 0 {
            // Add task_id column if it doesn't exist
            conn.execute(
                "ALTER TABLE interventions ADD COLUMN task_id TEXT NOT NULL DEFAULT 'UNKNOWN'",
                [],
            )
            .map_err(|e| e.to_string())?;
            tracing::info!("Added task_id column to interventions table");
        } else {
            tracing::info!("task_id column already exists in interventions table");
        }

        // Populate task_id by joining with tasks table for records that don't have it
        let updated = conn.execute(
              "UPDATE interventions SET task_id = (SELECT id FROM tasks WHERE tasks.task_number = interventions.task_number) WHERE (task_id IS NULL OR task_id = '' OR task_id = 'UNKNOWN') AND interventions.task_number IS NOT NULL",
              [],
          ).map_err(|e| e.to_string())?;

        tracing::info!(
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

    pub(in crate::db::migrations) fn apply_migration_12(&self) -> DbResult<()> {
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
}
