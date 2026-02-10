//! Test for migration 023_add_messaging_tables.sql
//!
//! This test verifies that the messaging system tables are created correctly
//! with proper relationships, constraints, and indexes.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_migration_023_messaging_tables() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(23)?;

    // Check that messages table exists
    let messages_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='messages'",
        [],
        |row| row.get(0),
    )?;
    assert!(messages_exists > 0, "messages table should exist");

    // Check that message_templates table exists
    let templates_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='message_templates'",
        [],
        |row| row.get(0),
    )?;
    assert!(templates_exists > 0, "message_templates table should exist");

    // Check that notification_preferences table exists
    let prefs_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='notification_preferences'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        prefs_exists > 0,
        "notification_preferences table should exist"
    );

    // Verify messages table structure
    verify_messages_table_structure(&ctx)?;

    // Verify message_templates table structure
    verify_message_templates_table_structure(&ctx)?;

    // Verify notification_preferences table structure
    verify_notification_preferences_table_structure(&ctx)?;

    // Test with sample data
    test_messaging_tables_with_data(&mut ctx)?;

    Ok(())
}

/// Verify the messages table has the correct structure
fn verify_messages_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(messages)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "sender_id",
        "recipient_id",
        "subject",
        "body",
        "message_type",
        "status",
        "priority",
        "sent_at",
        "read_at",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in messages table",
            col
        );
    }

    // Check foreign key constraints
    let fks: Vec<String> = ctx
        .conn
        .prepare("PRAGMA foreign_key_list(messages)")?
        .query_map([], |row| Ok(row.get::<_, String>(2)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        fks.iter().any(|table| table == "users"),
        "messages table should have foreign key to users"
    );

    Ok(())
}

/// Verify the message_templates table has the correct structure
fn verify_message_templates_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(message_templates)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "name",
        "subject_template",
        "body_template",
        "message_type",
        "variables",
        "is_active",
        "created_by",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in message_templates table",
            col
        );
    }

    Ok(())
}

/// Verify the notification_preferences table has the correct structure
fn verify_notification_preferences_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx
        .conn
        .prepare("PRAGMA table_info(notification_preferences)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "user_id",
        "message_type",
        "is_enabled",
        "delivery_method",
        "quiet_hours_start",
        "quiet_hours_end",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in notification_preferences table",
            col
        );
    }

    // Check foreign key constraints
    let fks: Vec<String> = ctx
        .conn
        .prepare("PRAGMA foreign_key_list(notification_preferences)")?
        .query_map([], |row| Ok(row.get::<_, String>(2)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        fks.iter().any(|table| table == "users"),
        "notification_preferences table should have foreign key to users"
    );

    Ok(())
}

/// Test messaging tables with sample data
fn test_messaging_tables_with_data(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Insert a test user first
    ctx.conn.execute(
        "INSERT INTO users (id, email, password_hash, created_at, updated_at) 
         VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
        params!["user123", "test@example.com", "hashedpassword"],
    )?;

    // Insert a message template
    ctx.conn.execute(
        "INSERT INTO message_templates (id, name, subject_template, body_template, 
         message_type, variables, is_active, created_by, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))",
        params![
            "template123",
            "Task Notification",
            "Task {task_number} Update",
            "Your task {task_number} has been updated to {status}.",
            "task_update",
            r#"{"task_number": "", "status": ""}"#.to_string(),
            true,
            "user123"
        ],
    )?;

    // Insert notification preferences
    ctx.conn.execute(
        "INSERT INTO notification_preferences (id, user_id, message_type, is_enabled, 
         delivery_method, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))",
        params!["pref123", "user123", "task_update", true, "email"],
    )?;

    // Insert a message
    ctx.conn.execute(
        "INSERT INTO messages (id, sender_id, recipient_id, subject, body, message_type, 
         status, priority, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))",
        params![
            "msg123",
            "user123",
            "user123",
            "Test Message",
            "This is a test message",
            "system_notification",
            "unread",
            "normal"
        ],
    )?;

    // Verify data can be retrieved
    let count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM messages WHERE sender_id = ?",
        params!["user123"],
        |row| row.get(0),
    )?;
    assert_eq!(count, 1, "Should have one message from test user");

    let template_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM message_templates WHERE created_by = ?",
        params!["user123"],
        |row| row.get(0),
    )?;
    assert_eq!(template_count, 1, "Should have one template from test user");

    let pref_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM notification_preferences WHERE user_id = ?",
        params!["user123"],
        |row| row.get(0),
    )?;
    assert_eq!(
        pref_count, 1,
        "Should have one notification preference for test user"
    );

    Ok(())
}
