//! Smoke tests for core services and migrations.

use crate::services::task_validation::TaskValidationService;
use crate::services::two_factor::TwoFactorService;
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
    assert!(sync_queue_exists > 0, "sync_queue table missing after migrations");
}
