//! Rust-implemented migrations 028–034.
//!
//! These migrations handle user-related columns (2FA, names, sessions),
//! non-negative CHECK constraints on inventory tables, foreign key additions
//! to interventions and tasks, and session activity indexes.

use crate::db::{Database, DbResult};
use rusqlite::params;

impl Database {
    pub(in crate::db::migrations) fn apply_migration_28(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_29(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_30(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 30: Add updated_at to user_sessions");

        let user_sessions_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user_sessions'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check user_sessions table: {}", e))?;

        if user_sessions_exists == 0 {
            tracing::info!(
                "Migration 030: user_sessions table absent, skipping ALTER TABLE for fresh/new schema"
            );
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                params![30],
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

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

    pub(in crate::db::migrations) fn apply_migration_31(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_32(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_33(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_34(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        tracing::info!("Applying migration 34: Add session activity index");

        let user_sessions_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user_sessions'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check user_sessions table: {}", e))?;

        if user_sessions_exists > 0 {
            conn.execute_batch(
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires_activity \
                 ON user_sessions(user_id, expires_at, last_activity DESC);",
            )
            .map_err(|e| {
                format!(
                    "Migration 034: failed to create user_sessions activity index: {}",
                    e
                )
            })?;
        } else {
            let sessions_exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sessions'",
                    [],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to check sessions table: {}", e))?;

            if sessions_exists > 0 {
                conn.execute_batch(
                    "CREATE INDEX IF NOT EXISTS idx_sessions_user_expires_activity \
                     ON sessions(user_id, expires_at, last_activity DESC);",
                )
                .map_err(|e| {
                    format!(
                        "Migration 034: failed to create sessions activity index: {}",
                        e
                    )
                })?;
            } else {
                return Err(
                    "Migration 034: neither user_sessions nor sessions table exists".to_string(),
                );
            }
        }

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            params![34],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }
}
