//! Smoke tests for core services and migrations.

use crate::domains::tasks::infrastructure::task_validation::TaskValidationService;
use crate::domains::auth::infrastructure::two_factor::TwoFactorService;
use crate::test_utils::TestDatabase;
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;
use totp_rs::{Algorithm, TOTP};

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

fn ensure_two_factor_columns(db: &crate::db::Database) {
    let conn = db.get_connection().expect("Failed to get connection");

    let has_enabled: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='two_factor_enabled'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if has_enabled == 0 {
        conn.execute(
            "ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0",
            [],
        )
        .expect("Failed to add two_factor_enabled column");
    }

    let has_secret: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='two_factor_secret'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if has_secret == 0 {
        conn.execute("ALTER TABLE users ADD COLUMN two_factor_secret TEXT", [])
            .expect("Failed to add two_factor_secret column");
    }

    let has_backup: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='backup_codes'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if has_backup == 0 {
        conn.execute("ALTER TABLE users ADD COLUMN backup_codes TEXT", [])
            .expect("Failed to add backup_codes column");
    }

    let has_verified_at: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='verified_at'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if has_verified_at == 0 {
        conn.execute("ALTER TABLE users ADD COLUMN verified_at TEXT", [])
            .expect("Failed to add verified_at column");
    }
}

fn seed_two_factor_config(
    db: &crate::db::Database,
    user_id: &str,
    enabled: bool,
    secret: Option<String>,
    backup_codes: Vec<String>,
    verified_at: Option<String>,
) {
    let conn = db.get_connection().expect("Failed to get connection");
    let backup_codes_json =
        serde_json::to_string(&backup_codes).expect("Failed to serialize backup codes");
    conn.execute(
        "UPDATE users SET two_factor_enabled = ?1, two_factor_secret = ?2, backup_codes = ?3, verified_at = ?4, updated_at = ?5 WHERE id = ?6",
        params![
            enabled as i32,
            secret,
            backup_codes_json,
            verified_at,
            Utc::now().timestamp_millis(),
            user_id
        ],
    )
    .expect("Failed to update two-factor config");
}

fn encrypt_secret_base64(secret: &[u8]) -> String {
    let key = b"development_key_not_secure";
    let encrypted: Vec<u8> = secret
        .iter()
        .enumerate()
        .map(|(i, &byte)| byte ^ key[i % key.len()])
        .collect();
    general_purpose::STANDARD.encode(encrypted)
}

fn totp_for_secret(secret: &[u8]) -> TOTP {
    TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret.to_vec(),
        Some("RPMA".to_string()),
        "test-user".to_string(),
    )
    .expect("Failed to create TOTP")
}

#[tokio::test]
async fn smoke_two_factor_verify_code() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = test_db.db();
    let service = TwoFactorService::new(Arc::clone(&db));

    ensure_two_factor_columns(db.as_ref());
    insert_user(db.as_ref(), "twofactor-user", "technician", true);

    let secret_bytes = b"0123456789ABCDEF0123456789ABCDEF".to_vec();
    let encrypted_secret = encrypt_secret_base64(&secret_bytes);
    seed_two_factor_config(
        db.as_ref(),
        "twofactor-user",
        true,
        Some(encrypted_secret),
        vec![],
        Some(Utc::now().to_rfc3339()),
    );

    let totp = totp_for_secret(&secret_bytes);
    let valid_code = totp
        .generate_current()
        .expect("Should generate current TOTP code");

    let result = service
        .verify_code("twofactor-user", &valid_code)
        .await
        .expect("Verification should not error");
    assert!(result, "Valid TOTP code should verify successfully");
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
        "user_sessions",
        "user_settings",
        "sync_queue",
        "suppliers",
        "materials",
        "material_consumption",
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
