//! Test for migration 021_add_client_statistics_view.sql
//!
//! This test verifies that the client statistics view is created correctly
//! and provides accurate aggregated data.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_migration_021_client_statistics() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(21)?;

    // Check that client_statistics view exists
    let view_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='view' AND name='client_statistics'",
        [],
        |row| row.get(0),
    )?;
    assert!(view_exists > 0, "client_statistics view should exist");

    // Verify view structure
    verify_view_structure(&ctx)?;

    // Test view with sample data
    test_view_with_data(&mut ctx)?;

    // Verify view updates correctly with new data
    test_view_updates(&mut ctx)?;

    Ok(())
}

/// Verify the client_statistics view has the correct structure
fn verify_view_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get view columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(client_statistics)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "name",
        "customer_type",
        "created_at",
        "total_tasks",
        "active_tasks",
        "completed_tasks",
        "last_task_date",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "client_statistics view should have column: {}",
            col
        );
    }

    Ok(())
}

/// Test the view with actual sample data
fn test_view_with_data(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Create test data
    ctx.conn.execute_batch(
        r#"
        -- Insert test users
        INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES ('tech-021', 'tech@example.com', 'tech', 'hash', 'Technician', 'Technician', 1, datetime('now'), datetime('now'));

        -- Insert test clients
        INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
        VALUES 
            ('client-021', 'Test Client Statistics', '123 Test St', '555-0123', 'client@test.com', datetime('now'), datetime('now')),
            ('client-021-2', 'Another Client', '456 Test St', '555-0124', 'client2@test.com', datetime('now'), datetime('now'));

        -- Insert tasks with different statuses
        INSERT INTO tasks (id, title, status, client_id, technician_id, created_at, updated_at, task_number)
        VALUES 
            ('task-021-1', 'Completed Task', 'completed', 'client-021', 'tech-021', datetime('now', '-7 days'), datetime('now', '-5 days'), 'TASK-001'),
            ('task-021-2', 'In Progress Task', 'in_progress', 'client-021', 'tech-021', datetime('now', '-3 days'), datetime('now', '-2 days'), 'TASK-002'),
            ('task-021-3', 'Pending Task', 'pending', 'client-021', NULL, datetime('now', '-1 days'), datetime('now'), 'TASK-003'),
            ('task-021-4', 'Completed Task 2', 'completed', 'client-021-2', 'tech-021', datetime('now', '-4 days'), datetime('now', '-2 days'), 'TASK-004');
        "#
    )?;

    // Query the view
    let mut stmt = ctx.conn.prepare(
        "SELECT id, name, total_tasks, active_tasks, completed_tasks 
         FROM client_statistics 
         WHERE id = 'client-021'",
    )?;

    let (id, name, total_tasks, active_tasks, completed_tasks): (String, String, i64, i64, i64) =
        stmt.query_row([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        })?;

    // Verify the calculations
    assert_eq!(id, "client-021");
    assert_eq!(name, "Test Client Statistics");
    assert_eq!(total_tasks, 3);
    assert_eq!(active_tasks, 1);
    assert_eq!(completed_tasks, 1);

    // Test view for second client
    let (id2, name2, total_tasks2, active_tasks2, completed_tasks2): (
        String,
        String,
        i64,
        i64,
        i64,
    ) = ctx.conn.query_row(
        "SELECT id, name, total_tasks, active_tasks, completed_tasks 
             FROM client_statistics 
             WHERE id = 'client-021-2'",
        [],
        |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        },
    )?;

    assert_eq!(id2, "client-021-2");
    assert_eq!(name2, "Another Client");
    assert_eq!(total_tasks2, 1);
    assert_eq!(active_tasks2, 0);
    assert_eq!(completed_tasks2, 1);

    // Clean up test data
    ctx.conn.execute(
        "DELETE FROM tasks WHERE id IN ('task-021-1', 'task-021-2', 'task-021-3', 'task-021-4')",
        [],
    )?;
    ctx.conn.execute(
        "DELETE FROM clients WHERE id IN ('client-021', 'client-021-2')",
        [],
    )?;
    ctx.conn
        .execute("DELETE FROM users WHERE id = 'tech-021'", [])?;

    Ok(())
}

/// Test that the view updates correctly when data changes
fn test_view_updates(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Create minimal test data
    ctx.conn.execute_batch(
        r#"
        -- Insert test client
        INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
        VALUES ('client-021-update', 'Update Test Client', '456 Update St', '555-9999', 'update@test.com', datetime('now'), datetime('now'));

        -- Insert initial task
        INSERT INTO tasks (id, title, status, client_id, created_at, updated_at)
        VALUES ('task-021-update-1', 'Initial Task', 'pending', 'client-021-update', datetime('now'), datetime('now'));
        "#
    )?;

    // Check initial statistics
    let (initial_total, initial_pending): (i64, i64) = ctx.conn.query_row(
        "SELECT total_tasks, active_tasks FROM client_statistics WHERE id = 'client-021-update'",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    assert_eq!(initial_total, 1); // total_tasks
    assert_eq!(initial_pending, 1); // active_tasks (pending is considered active)

    // Add another task
    ctx.conn.execute(
        "INSERT INTO tasks (id, title, status, client_id, created_at, updated_at)
         VALUES ('task-021-update-2', 'Second Task', 'completed', 'client-021-update', datetime('now'), datetime('now'))",
        [],
    )?;

    // Check updated statistics
    let (updated_total, updated_pending, updated_completed): (i64, i64, i64) = ctx.conn.query_row(
        "SELECT total_tasks, active_tasks, completed_tasks FROM client_statistics WHERE id = 'client-021-update'",
        [],
        |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        }
    )?;

    assert_eq!(updated_total, 2); // total_tasks
    assert_eq!(updated_pending, 1); // active_tasks (pending is still pending)
    assert_eq!(updated_completed, 1); // completed_tasks

    // Clean up
    ctx.conn.execute(
        "DELETE FROM tasks WHERE id IN ('task-021-update-1', 'task-021-update-2')",
        [],
    )?;
    ctx.conn
        .execute("DELETE FROM clients WHERE id = 'client-021-update'", [])?;

    Ok(())
}

#[test]
fn test_021_client_statistics_view_logic() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(21)?;

    // Test that deleted clients are not included in the view
    ctx.conn.execute_batch(
        r#"
        INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
        VALUES ('client-021-deleted', 'Deleted Client', '123 Deleted St', '555-0123', 'deleted@test.com', datetime('now'), datetime('now'));

        INSERT INTO tasks (id, title, status, client_id, created_at, updated_at)
        VALUES ('task-021-deleted', 'Task for Deleted Client', 'completed', 'client-021-deleted', datetime('now'), datetime('now'));

        -- Soft delete the client
        UPDATE clients SET deleted_at = datetime('now') WHERE id = 'client-021-deleted';
        "#
    )?;

    // Check that deleted client is not in the view
    let deleted_client_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM client_statistics WHERE id = 'client-021-deleted'",
        [],
        |row| row.get(0),
    )?;

    assert_eq!(
        deleted_client_count, 0,
        "Deleted client should not be in statistics view"
    );

    // Test that deleted tasks are not included
    ctx.conn.execute_batch(
        r#"
        INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
        VALUES ('client-021-deleted-task', 'Client with Deleted Task', '456 Test St', '555-0124', 'client2@test.com', datetime('now'), datetime('now'));

        INSERT INTO tasks (id, title, status, client_id, created_at, updated_at)
        VALUES ('task-021-deleted-task', 'Deleted Task', 'completed', 'client-021-deleted-task', datetime('now'), datetime('now'));

        -- Soft delete the task
        UPDATE tasks SET deleted_at = datetime('now') WHERE id = 'task-021-deleted-task';
        "#
    )?;

    // Check that deleted task is not counted
    let (total_tasks, _): (i64, i64) = ctx.conn.query_row(
        "SELECT total_tasks, completed_tasks FROM client_statistics WHERE id = 'client-021-deleted-task'",
        [],
        |row| {
            Ok((row.get(0)?, row.get(1)?))
        }
    )?;

    assert_eq!(total_tasks, 0, "Deleted task should not be counted");

    // Clean up
    ctx.conn
        .execute("DELETE FROM tasks WHERE id LIKE 'task-021-deleted%'", [])?;
    ctx.conn.execute(
        "DELETE FROM clients WHERE id LIKE 'client-021-deleted%'",
        [],
    )?;

    Ok(())
}
