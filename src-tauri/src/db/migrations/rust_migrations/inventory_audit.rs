//! Rust-implemented migrations 024–027.
//!
//! These migrations introduce the enhanced inventory management system,
//! comprehensive audit logging, performance optimization indexes, and CHECK
//! constraints on the tasks table.

use crate::db::{Database, DbResult};
use rusqlite::params;

impl Database {
    pub(in crate::db::migrations) fn apply_migration_24(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_25(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_26(&self) -> DbResult<()> {
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

    pub(in crate::db::migrations) fn apply_migration_27(&self) -> DbResult<()> {
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
}
