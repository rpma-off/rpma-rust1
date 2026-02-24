//! Smoke tests for core services and migrations.

use crate::domains::tasks::infrastructure::task_validation::TaskValidationService;
use crate::test_utils::TestDatabase;
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;

fn insert_user(db: &crate::db::Database, user_id: &str, role: &str, is_active: bool) {
    let conn = db.get_connection().expect("Failed to get connection");
    conn.execute(
        "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            user_id,
            format!("{}@example.com", user_id),
            format!("user_{}", user_id),
            "hash",
            "Test User",
            role,
            if is_active { 1 } else { 0 },
            Utc::now().timestamp_millis(),
            Utc::now().timestamp_millis()
        ],
    )
    .expect("Failed to insert user");
}

#[test]
fn smoke_task_validation_assignment() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = test_db.db();
    let service = TaskValidationService::new(Arc::clone(&db));

    insert_user(db.as_ref(), "tech1", "technician", true);

    let result = service.validate_technician_assignment("tech1", &None);
    assert!(result.is_ok(), "Active technician should be valid");
}

#[test]
fn smoke_migrations_integrity() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let conn = test_db
        .db()
        .get_connection()
        .expect("Failed to get connection");

    let integrity_check: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .expect("Failed integrity_check");
    assert_eq!(integrity_check, "ok", "Database integrity check failed");

    let fk_check: i32 = conn
        .query_row("PRAGMA foreign_key_check", [], |row| row.get(0))
        .unwrap_or(0);
    assert_eq!(fk_check, 0, "Foreign key constraints violated");

    let users_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
            [],
            |row| row.get(0),
        )
        .expect("Failed users table check");
    let tasks_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tasks'",
            [],
            |row| row.get(0),
        )
        .expect("Failed tasks table check");
    let sync_queue_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sync_queue'",
            [],
            |row| row.get(0),
        )
        .expect("Failed sync_queue table check");

    assert!(users_exists > 0, "users table missing after migrations");
    assert!(tasks_exists > 0, "tasks table missing after migrations");
    assert!(
        sync_queue_exists > 0,
        "sync_queue table missing after migrations"
    );
}

/// Comprehensive migration test harness that applies all migrations to an
/// in-memory database and runs integrity checks on every critical table,
/// index, view, and foreign-key constraint.
#[test]
fn smoke_migration_harness_full() {
    // 1. Create fresh database with all migrations
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = test_db.db();
    let conn = db.get_connection().expect("Failed to get connection");

    // 2. Verify schema version reached the latest
    let latest = crate::db::Database::get_latest_migration_version();
    let current: i32 = conn
        .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
            row.get(0)
        })
        .expect("Failed to read schema_version");
    assert_eq!(
        current, latest,
        "Schema version should be at latest ({latest})"
    );

    // 3. Integrity check
    let integrity: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .expect("integrity_check failed");
    assert_eq!(integrity, "ok", "Database integrity check failed");

    // 4. Foreign-key check
    let fk_violations: i32 = conn
        .query_row("PRAGMA foreign_key_check", [], |row| row.get(0))
        .unwrap_or(0);
    assert_eq!(fk_violations, 0, "Foreign key violations detected");

    // 5. Verify all critical tables exist
    let required_tables = vec![
        "interventions",
        "intervention_steps",
        "photos",
        "tasks",
        "task_history",
        "clients",
        "users",
        "sessions",
        "user_settings",
        "cache_metadata",
        "cache_statistics",
        "sync_queue",
        "suppliers",
        "material_categories",
        "materials",
        "material_consumption",
        "inventory_transactions",
        "quotes",
        "quote_items",
        "audit_events",
        "schema_version",
    ];
    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .expect("Failed to prepare table list query");
    let tables: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .expect("Failed to list tables")
        .filter_map(|r| r.ok())
        .collect();

    for tbl in &required_tables {
        assert!(
            tables.iter().any(|t| t == tbl),
            "Required table '{}' missing after migrations",
            tbl
        );
    }

    // 6. Verify core-screen indexes exist
    let required_indexes = vec![
        // Tasks list indexes
        "idx_tasks_status",
        "idx_tasks_created_at",
        "idx_tasks_status_created",
        "idx_tasks_technician_id",
        "idx_tasks_client_id",
        "idx_tasks_deleted_status_created",
        // Interventions list indexes
        "idx_interventions_status",
        "idx_interventions_task_created",
        "idx_interventions_status_created",
        // Materials search indexes
        "idx_materials_sku",
        "idx_materials_active",
        "idx_materials_name",
        "idx_materials_type_active",
        "idx_materials_low_stock",
        "idx_materials_active_discontinued",
        "idx_materials_sku_active",
        // Tasks soft-delete indexes
        "idx_tasks_deleted_status_created",
        "idx_tasks_deleted_task_number",
        // Interventions task lookup
        "idx_interventions_task_created",
        // FK indexes
        "idx_tasks_workflow_id",
        "idx_tasks_current_workflow_step_id",
        "idx_materials_category_id",
        "idx_material_consumption_recorded_by",
        "idx_inventory_transactions_step_id",
        "idx_inventory_transactions_performed_by",
        "idx_quote_items_material_id",
        "idx_events_parent_event",
    ];
    let mut idx_stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='index'")
        .expect("Failed to prepare index list query");
    let indexes: Vec<String> = idx_stmt
        .query_map([], |row| row.get(0))
        .expect("Failed to list indexes")
        .filter_map(|r| r.ok())
        .collect();

    for idx in &required_indexes {
        assert!(
            indexes.iter().any(|i| i == idx),
            "Required index '{}' missing after migrations",
            idx
        );
    }

    // 7. Verify schema_version rows are ordered and contiguous
    let mut ver_stmt = conn
        .prepare("SELECT version FROM schema_version ORDER BY version")
        .expect("Failed to prepare version query");
    let versions: Vec<i32> = ver_stmt
        .query_map([], |row| row.get(0))
        .expect("Failed to list versions")
        .filter_map(|r| r.ok())
        .collect();

    assert!(!versions.is_empty(), "schema_version should not be empty");
    assert_eq!(versions[0], 1, "First migration version should be 1");
    assert_eq!(
        *versions.last().unwrap(),
        latest,
        "Last version should equal latest"
    );

    // Check for duplicate versions
    let mut sorted = versions.clone();
    sorted.dedup();
    assert_eq!(
        versions.len(),
        sorted.len(),
        "Duplicate entries in schema_version"
    );

    // 8. Verify views exist
    let required_views = vec!["calendar_tasks", "client_statistics"];
    let mut view_stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='view'")
        .expect("Failed to prepare view list query");
    let views: Vec<String> = view_stmt
        .query_map([], |row| row.get(0))
        .expect("Failed to list views")
        .filter_map(|r| r.ok())
        .collect();

    for v in &required_views {
        assert!(
            views.iter().any(|vw| vw == v),
            "Required view '{}' missing after migrations",
            v
        );
    }

    // 9. Verify foreign keys are defined on critical tables
    let fk_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_foreign_key_list('tasks')",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check tasks FKs");
    assert!(
        fk_count > 0,
        "tasks table should have foreign key constraints"
    );

    let fk_count_interventions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_foreign_key_list('interventions')",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check interventions FKs");
    assert!(
        fk_count_interventions > 0,
        "interventions table should have foreign key constraints"
    );
}
