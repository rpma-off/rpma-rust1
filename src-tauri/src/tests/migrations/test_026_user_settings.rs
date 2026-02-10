//! Test for migration 026_fix_user_settings.sql
//!
//! This test verifies that the user settings tables are created correctly
//! and all constraints, indexes, and triggers are properly applied.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_migration_026_user_settings() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(26)?;

    // Check that user_settings table exists
    let settings_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='user_settings'",
        [],
        |row| row.get(0),
    )?;
    assert!(settings_exists > 0, "user_settings table should exist");

    // Check that user_preferences table exists
    let preferences_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='user_preferences'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        preferences_exists > 0,
        "user_preferences table should exist"
    );

    // Verify user_settings table structure
    verify_user_settings_table_structure(&ctx)?;

    // Verify user_preferences table structure
    verify_user_preferences_table_structure(&ctx)?;

    // Test with sample data
    test_user_settings_with_data(&mut ctx)?;

    Ok(())
}

/// Verify the user_settings table has the correct structure
fn verify_user_settings_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(user_settings)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "user_id",
        "setting_key",
        "setting_value",
        "setting_type",
        "is_encrypted",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in user_settings table",
            col
        );
    }

    // Check foreign key constraints
    let fks: Vec<String> = ctx
        .conn
        .prepare("PRAGMA foreign_key_list(user_settings)")?
        .query_map([], |row| Ok(row.get::<_, String>(2)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        fks.iter().any(|table| table == "users"),
        "user_settings table should have foreign key to users"
    );

    // Check indexes
    let indexes: Vec<String> = ctx
        .conn
        .prepare("PRAGMA index_list(user_settings)")?
        .query_map([], |row| Ok(row.get::<_, String>(1)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        indexes
            .iter()
            .any(|name| name == "idx_user_settings_user_key"),
        "Should have index on user_settings(user_id, setting_key)"
    );

    Ok(())
}

/// Verify the user_preferences table has the correct structure
fn verify_user_preferences_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(user_preferences)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "user_id",
        "theme",
        "language",
        "timezone",
        "date_format",
        "time_format",
        "notification_email",
        "notification_push",
        "notification_sms",
        "auto_save_interval",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in user_preferences table",
            col
        );
    }

    // Check foreign key constraints
    let fks: Vec<String> = ctx
        .conn
        .prepare("PRAGMA foreign_key_list(user_preferences)")?
        .query_map([], |row| Ok(row.get::<_, String>(2)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        fks.iter().any(|table| table == "users"),
        "user_preferences table should have foreign key to users"
    );

    Ok(())
}

/// Test user settings tables with sample data
fn test_user_settings_with_data(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Insert a test user first
    ctx.conn.execute(
        "INSERT INTO users (id, email, password_hash, created_at, updated_at) 
         VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
        params!["user123", "test@example.com", "hashedpassword"],
    )?;

    // Insert user settings
    ctx.conn.execute(
        "INSERT INTO user_settings (id, user_id, setting_key, setting_value, setting_type, 
         is_encrypted, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))",
        params![
            "setting123",
            "user123",
            "api_key",
            "sk-test123456789",
            "string",
            true,
        ],
    )?;

    // Insert more settings
    ctx.conn.execute(
        "INSERT INTO user_settings (id, user_id, setting_key, setting_value, setting_type, 
         is_encrypted, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))",
        params![
            "setting124",
            "user123",
            "session_timeout",
            "30",
            "integer",
            false,
        ],
    )?;

    // Insert user preferences
    ctx.conn.execute(
        "INSERT INTO user_preferences (id, user_id, theme, language, timezone, date_format, 
         time_format, notification_email, notification_push, auto_save_interval, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'), datetime('now'))",
        params![
            "pref123",
            "user123",
            "dark",
            "en",
            "America/New_York",
            "MM/DD/YYYY",
            "12-hour",
            true,
            true,
            5,
        ]
    )?;

    // Verify data can be retrieved
    let settings_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
        params!["user123"],
        |row| row.get(0),
    )?;
    assert_eq!(settings_count, 2, "Should have two user settings");

    let encrypted_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM user_settings WHERE user_id = ? AND is_encrypted = 1",
        params!["user123"],
        |row| row.get(0),
    )?;
    assert_eq!(encrypted_count, 1, "Should have one encrypted setting");

    let pref_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM user_preferences WHERE user_id = ?",
        params!["user123"],
        |row| row.get(0),
    )?;
    assert_eq!(pref_count, 1, "Should have one user preference record");

    // Test unique constraint on settings
    let result = ctx.conn.execute(
        "INSERT INTO user_settings (id, user_id, setting_key, setting_value, setting_type, 
         is_encrypted, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))",
        params![
            "setting125",
            "user123",
            "api_key", // Duplicate key
            "sk-different",
            "string",
            false,
        ],
    );

    assert!(
        result.is_err(),
        "Should prevent duplicate user_id/setting_key combination"
    );

    Ok(())
}
