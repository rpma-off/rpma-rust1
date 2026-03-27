//! Rust-implemented migrations 040+.
//!
//! Late-stage migrations that add activity and reference lookup indexes,
//! and schema constraint updates (065+).

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

    /// Migration 065: Add 'archived' to interventions.status CHECK constraint.
    ///
    /// SQLite requires a full table rebuild to modify CHECK constraints.
    /// Idempotent: skips the rebuild if 'archived' is already present.
    pub(in crate::db::migrations) fn apply_migration_65(&self) -> DbResult<()> {
        let mut conn = self.get_connection()?;
        tracing::info!("Migration 065: Adding 'archived' to interventions.status CHECK constraint");

        // Check idempotency: is 'archived' already in the table definition?
        let sql: String = conn
            .query_row(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='interventions'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Migration 065: failed to read table DDL: {}", e))?;

        if sql.contains("'archived'") {
            tracing::info!("Migration 065: 'archived' already present in CHECK constraint, skipping rebuild");
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![65],
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

        tx.execute_batch(
            r#"
            CREATE TABLE interventions_new (
              id TEXT PRIMARY KEY NOT NULL,
              task_id TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled', 'archived')),
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
            CREATE UNIQUE INDEX IF NOT EXISTS idx_interventions_active_per_task
              ON interventions(task_id)
              WHERE status IN ('pending', 'in_progress', 'paused');
            "#,
        )
        .map_err(|e| format!("Migration 065: failed to rebuild interventions table: {}", e))?;

        tx.commit().map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![65],
        )
        .map_err(|e| e.to_string())?;

        tracing::info!("Migration 065: 'archived' status added to interventions table successfully");
        Ok(())
    }
}
