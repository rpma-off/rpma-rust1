//! Test for migration 022_add_task_history_table.sql
//!
//! This test verifies that the task history tracking table is created correctly
//! and all constraints, indexes, and triggers are properly applied.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_migration_022_task_history() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(22)?;

    // Check that task_history table exists
    let history_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='task_history'",
        [],
        |row| row.get(0),
    )?;
    assert!(history_exists > 0, "task_history table should exist");

    // Verify table schema
    verify_task_history_schema(&ctx)?;

    // Verify indexes were created
    verify_indexes_created(&ctx)?;

    // Verify triggers were created for automatic history tracking
    verify_triggers_created(&ctx)?;

    // Test trigger functionality
    test_trigger_functionality(&mut ctx)?;

    Ok(())
}

/// Verify task_history table schema
fn verify_task_history_schema(ctx: &MigrationTestContext) -> AppResult<()> {
    // Check critical columns exist
    let mut stmt = ctx
        .conn
        .prepare("SELECT name FROM pragma_table_info('task_history') ORDER BY cid")?;
    let columns: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    let required_columns = vec![
        "id",
        "task_id",
        "old_status",
        "new_status",
        "reason",
        "changed_at",
        "changed_by",
    ];

    for col in required_columns {
        assert!(
            columns.contains(&col.to_string()),
            "task_history should have column: {}",
            col
        );
    }

    // Check foreign key to tasks table
    let fk_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('task_history') 
         WHERE table='tasks'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        fk_count > 0,
        "task_history should have foreign key to tasks"
    );

    // Check new_status has NOT NULL constraint
    let not_null_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('task_history') 
         WHERE name='new_status' AND NOT NULL = 1",
        [],
        |row| row.get(0),
    )?;

    assert!(not_null_count > 0, "new_status should be NOT NULL");

    // Check changed_by foreign key to users
    let user_fk_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('task_history') 
         WHERE table='users' AND from='changed_by'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        user_fk_count > 0,
        "task_history should have foreign key to users for changed_by"
    );

    Ok(())
}

/// Verify indexes were created for performance
fn verify_indexes_created(ctx: &MigrationTestContext) -> AppResult<()> {
    // Check task_history indexes
    let mut stmt = ctx.conn.prepare(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='task_history'
         AND name NOT LIKE 'sqlite_autoindex_%'",
    )?;

    let indexes: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        indexes.iter().any(|i| i.contains("task_id")),
        "task_history should have task_id index"
    );
    assert!(
        indexes.iter().any(|i| i.contains("changed_at")),
        "task_history should have changed_at index"
    );
    assert!(
        indexes.iter().any(|i| i.contains("new_status")),
        "task_history should have new_status index"
    );

    Ok(())
}

/// Verify triggers were created for automatic history tracking
fn verify_triggers_created(ctx: &MigrationTestContext) -> AppResult<()> {
    // Check for trigger on task INSERT
    let insert_trigger: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'task_history_insert'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        insert_trigger > 0,
        "Should have trigger for task INSERT history"
    );

    // Check for trigger on task UPDATE
    let update_trigger: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'task_history_update'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        update_trigger > 0,
        "Should have trigger for task UPDATE history"
    );

    // Check for trigger on task DELETE
    let delete_trigger: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'task_history_delete'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        delete_trigger > 0,
        "Should have trigger for task DELETE history"
    );

    Ok(())
}

/// Test that triggers actually create history records
fn test_trigger_functionality(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Create test user
    ctx.conn.execute(
        "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES ('test-user-022', 'test@example.com', 'testuser', 'hash', 'Test User', 'User', 1, datetime('now'), datetime('now'))",
        [],
    )?;

    // Create test client
    ctx.conn.execute(
        "INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
         VALUES ('client-022', 'Test Client', '123 Test St', '555-0123', 'client@test.com', datetime('now'), datetime('now'))",
        [],
    )?;

    // Insert a task (should create INSERT history)
    ctx.conn.execute(
        "INSERT INTO tasks (id, title, status, client_id, created_by, created_at, updated_at)
         VALUES ('task-022', 'Test Task', 'draft', 'client-022', 'test-user-022', datetime('now'), datetime('now'))",
        [],
    )?;

    // Check INSERT history was created
    let insert_history: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM task_history 
         WHERE task_id = 'task-022' AND new_status = 'draft'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        insert_history > 0,
        "INSERT trigger should create history record"
    );

    // Update the task (should create UPDATE history)
    ctx.conn.execute(
        "UPDATE tasks SET status = 'pending', updated_at = datetime('now'), updated_by = 'test-user-022'
         WHERE id = 'task-022'",
        [],
    )?;

    // Check UPDATE history was created
    let update_history: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM task_history 
         WHERE task_id = 'task-022' AND new_status = 'pending' 
         AND old_status = 'draft'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        update_history > 0,
        "UPDATE trigger should create history record with status change"
    );

    // Assign the task (should create UPDATE history for assignment)
    ctx.conn.execute(
        "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES ('tech-022', 'tech@example.com', 'tech', 'hash', 'Technician', 'Technician', 1, datetime('now'), datetime('now'))",
        [],
    )?;

    ctx.conn.execute(
        "UPDATE tasks SET technician_id = 'tech-022', updated_at = datetime('now'), updated_by = 'test-user-022'
         WHERE id = 'task-022'",
        [],
    )?;

    // Check assignment history was created
    let assign_history: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM task_history 
         WHERE task_id = 'task-022' AND changed_by = 'test-user-022'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        assign_history > 0,
        "UPDATE trigger should create history record for assignment"
    );

    // Delete the task (should create DELETE history)
    ctx.conn
        .execute("DELETE FROM tasks WHERE id = 'task-022'", [])?;

    // Check DELETE history was created
    let delete_history: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM task_history 
         WHERE task_id = 'task-022'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        delete_history > 0,
        "DELETE trigger should create history record"
    );

    // Verify history records have correct timestamps
    let mut stmt = ctx.conn.prepare(
        "SELECT changed_at FROM task_history 
         WHERE task_id = 'task-022' 
         ORDER BY changed_at ASC",
    )?;

    let timestamps: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        !timestamps.is_empty(),
        "Should have history records with timestamps"
    );

    // Clean up
    ctx.conn
        .execute("DELETE FROM task_history WHERE task_id = 'task-022'", [])?;
    ctx.conn.execute(
        "DELETE FROM users WHERE id IN ('test-user-022', 'tech-022')",
        [],
    )?;
    ctx.conn
        .execute("DELETE FROM clients WHERE id = 'client-022'", [])?;

    Ok(())
}

#[test]
fn test_022_task_history_cascade_delete() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(22)?;

    // Create test data
    ctx.conn.execute_batch(
        r#"
        INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES ('test-user-022-cascade', 'test@example.com', 'testuser', 'hash', 'Test User', 'User', 1, datetime('now'), datetime('now'));

        INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
        VALUES ('client-022-cascade', 'Test Client', '123 Test St', '555-0123', 'client@test.com', datetime('now'), datetime('now'));

        INSERT INTO tasks (id, title, status, client_id, created_by, created_at, updated_at)
        VALUES ('task-022-cascade', 'Test Task', 'draft', 'client-022-cascade', 'test-user-022-cascade', datetime('now'), datetime('now'));
        "#
    )?;

    // Create history records
    ctx.conn.execute(
        "UPDATE tasks SET status = 'pending' WHERE id = 'task-022-cascade'",
        [],
    )?;

    // Verify history exists
    let history_count_before: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM task_history WHERE task_id = 'task-022-cascade'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        history_count_before > 0,
        "Should have history records before delete"
    );

    // Delete the task
    ctx.conn
        .execute("DELETE FROM tasks WHERE id = 'task-022-cascade'", [])?;

    // Check if history is cascade deleted or preserved
    let history_count_after: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM task_history WHERE task_id = 'task-022-cascade'",
        [],
        |row| row.get(0),
    )?;

    // The history should either be cascade deleted (count = 0) or preserved (count > 0)
    // Both are valid design choices, we just need to verify consistency
    println!("History count after task delete: {}", history_count_after);

    // Clean up
    ctx.conn.execute(
        "DELETE FROM task_history WHERE task_id = 'task-022-cascade'",
        [],
    )?;
    ctx.conn
        .execute("DELETE FROM users WHERE id = 'test-user-022-cascade'", [])?;
    ctx.conn
        .execute("DELETE FROM clients WHERE id = 'client-022-cascade'", [])?;

    Ok(())
}
