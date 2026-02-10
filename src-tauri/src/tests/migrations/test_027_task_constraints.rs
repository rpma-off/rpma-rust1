//! Test for migration 027_add_task_constraints.sql
//!
//! This test verifies that the tasks table is rebuilt correctly with the new
//! CHECK constraints and foreign key relationships.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_migration_027_task_constraints() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(27)?;

    // Check that tasks table exists with correct structure
    verify_tasks_table_structure(&ctx)?;

    // Verify CHECK constraints are in place
    verify_check_constraints(&ctx)?;

    // Test foreign key constraints
    verify_foreign_key_constraints(&mut ctx)?;

    // Verify indexes were recreated
    verify_indexes_recreated(&ctx)?;

    // Test data integrity
    test_data_integrity(&mut ctx)?;

    Ok(())
}

/// Verify that the tasks table has the correct structure after migration
fn verify_tasks_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Check that tasks table exists
    let table_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='tasks'",
        [],
        |row| row.get(0),
    )?;
    assert!(table_exists > 0, "tasks table should exist");

    // Check critical columns exist
    let mut stmt = ctx
        .conn
        .prepare("SELECT name FROM pragma_table_info('tasks') ORDER BY cid")?;
    let columns: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    let required_columns = vec![
        "id",
        "task_number",
        "title",
        "description",
        "vehicle_plate",
        "vehicle_model",
        "vehicle_year",
        "vehicle_make",
        "vin",
        "ppf_zones",
        "custom_ppf_zones",
        "status",
        "priority",
        "technician_id",
        "assigned_at",
        "assigned_by",
        "scheduled_date",
        "start_time",
        "end_time",
        "date_rdv",
        "heure_rdv",
        "template_id",
        "workflow_id",
        "workflow_status",
        "current_workflow_step_id",
        "started_at",
        "completed_at",
        "completed_steps",
        "client_id",
        "customer_name",
        "customer_email",
        "customer_phone",
        "customer_address",
        "external_id",
        "lot_film",
        "checklist_completed",
        "notes",
        "tags",
        "estimated_duration",
        "actual_duration",
        "created_at",
        "updated_at",
        "creator_id",
        "created_by",
        "updated_by",
        "deleted_at",
        "deleted_by",
        "synced",
        "last_synced_at",
    ];

    for col in required_columns {
        assert!(
            columns.contains(&col.to_string()),
            "tasks table should have column: {}",
            col
        );
    }

    // Check task_number is unique
    let unique_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM pragma_index_list('tasks') 
         WHERE origin='u' AND partial=0",
        [],
        |row| row.get(0),
    )?;

    assert!(
        unique_count > 0,
        "tasks should have unique constraint on task_number"
    );

    // Check required columns have NOT NULL constraints
    let not_null_columns = vec![
        "id",
        "task_number",
        "title",
        "status",
        "priority",
        "created_at",
        "updated_at",
    ];
    for col in not_null_columns {
        let not_null_count: i64 = ctx.conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('tasks') 
             WHERE name=? AND NOT NULL = 1",
            params![col],
            |row| row.get(0),
        )?;

        assert!(not_null_count > 0, "{} should be NOT NULL", col);
    }

    Ok(())
}

/// Verify that CHECK constraints are properly defined
fn verify_check_constraints(ctx: &MigrationTestContext) -> AppResult<()> {
    // Test valid status values
    let valid_statuses = vec![
        "draft",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "on_hold",
        "pending",
        "invalid",
        "archived",
        "failed",
        "overdue",
        "assigned",
        "paused",
    ];

    for status in valid_statuses {
        // Create a test task with this status
        let test_id = format!("test-status-{}", status);
        ctx.conn.execute(
            "INSERT INTO tasks (id, task_number, title, status, priority, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'medium', datetime('now'), datetime('now'))",
            params![
                &test_id,
                format!("TSN-{}", status),
                format!("Test Task {}", status),
                status
            ],
        )?;

        // Clean up
        ctx.conn
            .execute("DELETE FROM tasks WHERE id = ?", params![&test_id])?;
    }

    // Test invalid status should fail
    let invalid_status_result = ctx.conn.execute(
        "INSERT INTO tasks (id, task_number, title, status, priority, created_at, updated_at)
         VALUES ('test-invalid', 'TSN-INVALID', 'Test Invalid', 'invalid_status', 'medium', datetime('now'), datetime('now'))",
        [],
    );

    assert!(
        invalid_status_result.is_err(),
        "Invalid status should be rejected by CHECK constraint"
    );

    // Test valid priority values
    let valid_priorities = vec!["low", "medium", "high", "urgent"];

    for priority in valid_priorities {
        let test_id = format!("test-priority-{}", priority);
        ctx.conn.execute(
            "INSERT INTO tasks (id, task_number, title, status, priority, created_at, updated_at)
             VALUES (?, ?, ?, 'draft', ?, datetime('now'), datetime('now'))",
            params![
                &test_id,
                format!("TSN-PRI-{}", priority),
                format!("Test Priority {}", priority),
                priority
            ],
        )?;

        // Clean up
        ctx.conn
            .execute("DELETE FROM tasks WHERE id = ?", params![&test_id])?;
    }

    // Test invalid priority should fail
    let invalid_priority_result = ctx.conn.execute(
        "INSERT INTO tasks (id, task_number, title, status, priority, created_at, updated_at)
         VALUES ('test-priority-invalid', 'TSN-PRI-INVALID', 'Test Invalid', 'draft', 'invalid_priority', datetime('now'), datetime('now'))",
        [],
    );

    assert!(
        invalid_priority_result.is_err(),
        "Invalid priority should be rejected by CHECK constraint"
    );

    Ok(())
}

/// Verify that foreign key constraints are properly defined
fn verify_foreign_key_constraints(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Check foreign key to clients table
    let fk_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('tasks') 
         WHERE table='clients'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        fk_count > 0,
        "tasks should have foreign key to clients table"
    );

    // Check foreign key to users table (for technician_id)
    let tech_fk_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('tasks') 
         WHERE table='users'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        tech_fk_count > 0,
        "tasks should have foreign key to users table for technician_id"
    );

    // Create test data for foreign key testing
    ctx.conn.execute_batch(
        r#"
        INSERT INTO clients (id, name, created_at, updated_at)
         VALUES ('fk-test-client', 'FK Test Client', datetime('now'), datetime('now'));
        
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
         VALUES ('fk-test-user', 'fktest', 'fk@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now'));
        "#
    )?;

    // Test valid foreign key references
    ctx.conn.execute(
        "INSERT INTO tasks (id, task_number, title, status, priority, client_id, technician_id, created_at, updated_at)
         VALUES ('fk-test-valid', 'TSN-FK-VALID', 'FK Valid Test', 'draft', 'medium', 'fk-test-client', 'fk-test-user', datetime('now'), datetime('now'))",
        [],
    )?;

    // Test invalid client_id should fail
    let invalid_client_result = ctx.conn.execute(
        "INSERT INTO tasks (id, task_number, title, status, priority, client_id, created_at, updated_at)
         VALUES ('fk-test-invalid-client', 'TSN-FK-INV-CLIENT', 'FK Invalid Client Test', 'draft', 'medium', 'non-existent-client', datetime('now'), datetime('now'))",
        [],
    );

    assert!(
        invalid_client_result.is_err(),
        "Invalid client_id should be rejected by foreign key constraint"
    );

    // Test invalid technician_id should fail
    let invalid_tech_result = ctx.conn.execute(
        "INSERT INTO tasks (id, task_number, title, status, priority, technician_id, created_at, updated_at)
         VALUES ('fk-test-invalid-tech', 'TSN-FK-INV-TECH', 'FK Invalid Tech Test', 'draft', 'medium', 'non-existent-user', datetime('now'), datetime('now'))",
        [],
    );

    assert!(
        invalid_tech_result.is_err(),
        "Invalid technician_id should be rejected by foreign key constraint"
    );

    // Clean up test data
    ctx.conn
        .execute("DELETE FROM tasks WHERE id LIKE 'fk-test%'", [])?;
    ctx.conn
        .execute("DELETE FROM users WHERE id = 'fk-test-user'", [])?;
    ctx.conn
        .execute("DELETE FROM clients WHERE id = 'fk-test-client'", [])?;

    Ok(())
}

/// Verify that indexes were recreated after the table rebuild
fn verify_indexes_recreated(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get all indexes for tasks table
    let mut stmt = ctx.conn.prepare(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='tasks'
         AND name NOT LIKE 'sqlite_autoindex_%'",
    )?;

    let indexes: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    // Check for expected indexes
    let expected_indexes = vec![
        "idx_tasks_status",
        "idx_tasks_technician_id",
        "idx_tasks_client_id",
        "idx_tasks_priority",
        "idx_tasks_scheduled_date",
        "idx_tasks_created_at",
        "idx_tasks_synced",
        "idx_tasks_task_number",
        "idx_tasks_status_technician",
        "idx_tasks_status_priority",
        "idx_tasks_client_status",
        "idx_tasks_technician_scheduled",
        "idx_tasks_status_scheduled",
        "idx_tasks_sync_status",
    ];

    for index in expected_indexes {
        assert!(
            indexes.iter().any(|i| i.contains(index)),
            "Should have index: {}",
            index
        );
    }

    Ok(())
}

/// Test data integrity after migration
fn test_data_integrity(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Create test data
    ctx.conn.execute_batch(
        r#"
        INSERT INTO clients (id, name, created_at, updated_at)
         VALUES ('integrity-test-client', 'Integrity Test Client', datetime('now'), datetime('now'));
        
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
         VALUES ('integrity-test-user', 'integritytest', 'integrity@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now'));
        "#
    )?;

    // Insert a task with all fields
    ctx.conn.execute(
        "INSERT INTO tasks (
            id, task_number, title, description, vehicle_plate, vehicle_model, vehicle_year,
            vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
            assigned_at, assigned_by, scheduled_date, start_time, end_time, date_rdv,
            heure_rdv, template_id, workflow_id, workflow_status, current_workflow_step_id,
            started_at, completed_at, completed_steps, client_id, customer_name, customer_email,
            customer_phone, customer_address, external_id, lot_film, checklist_completed,
            notes, tags, estimated_duration, actual_duration, created_at, updated_at,
            creator_id, created_by, updated_by
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )",
        params![
            "integrity-test-task",
            "TSN-INTEGRITY-001",
            "Integrity Test Task",
            "This is a comprehensive test task",
            "ABC123",
            "Model X",
            "2023",
            "Make",
            "VIN123456789",
            "Full Hood, Fenders",
            "[\"Custom Zone 1\", \"Custom Zone 2\"]",
            "in_progress",
            "high",
            "integrity-test-user",
            1234567890,
            "creator",
            "2023-12-01",
            "09:00",
            "17:00",
            "01/12/2023",
            "09:00",
            "template-001",
            "workflow-001",
            "in_progress",
            "step-002",
            1234567890,
            1234567990,
            "[\"step-001\"]",
            "integrity-test-client",
            "Test Customer",
            "customer@test.com",
            "555-1234",
            "123 Test St",
            "EXT-001",
            "Film Lot 001",
            1,
            "Test notes",
            "[\"tag1\", \"tag2\"]",
            480,  // 8 hours in minutes
            500,  // actual duration in minutes
            "datetime('now')",
            "datetime('now')",
            "integrity-test-user",
            "integrity-test-user",
            "integrity-test-user"
        ],
    )?;

    // Verify all fields were saved correctly
    let (task_number, title, description, vehicle_plate, vehicle_model): (
        String,
        String,
        String,
        String,
        String,
    ) = ctx.conn.query_row(
        "SELECT task_number, title, description, vehicle_plate, vehicle_model
         FROM tasks WHERE id = 'integrity-test-task'",
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

    assert_eq!(task_number, "TSN-INTEGRITY-001");
    assert_eq!(title, "Integrity Test Task");
    assert_eq!(description, "This is a comprehensive test task");
    assert_eq!(vehicle_plate, "ABC123");
    assert_eq!(vehicle_model, "Model X");

    // Verify JSON fields were saved correctly
    let (custom_ppf_zones, tags): (Option<String>, Option<String>) = ctx.conn.query_row(
        "SELECT custom_ppf_zones, tags
         FROM tasks WHERE id = 'integrity-test-task'",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    assert_eq!(
        custom_ppf_zones,
        Some("[\"Custom Zone 1\", \"Custom Zone 2\"]".to_string())
    );
    assert_eq!(tags, Some("[\"tag1\", \"tag2\"]".to_string()));

    // Clean up
    ctx.conn
        .execute("DELETE FROM tasks WHERE id = 'integrity-test-task'", [])?;
    ctx.conn
        .execute("DELETE FROM users WHERE id = 'integrity-test-user'", [])?;
    ctx.conn
        .execute("DELETE FROM clients WHERE id = 'integrity-test-client'", [])?;

    Ok(())
}

#[test]
fn test_027_task_constraints_unique_constraint() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(27)?;

    // Create first task
    ctx.conn.execute(
        "INSERT INTO tasks (id, task_number, title, status, priority, created_at, updated_at)
         VALUES ('unique-test-1', 'TSN-UNIQUE-001', 'Test Task 1', 'draft', 'medium', datetime('now'), datetime('now'))",
        [],
    )?;

    // Try to create second task with same task_number
    let duplicate_result = ctx.conn.execute(
        "INSERT INTO tasks (id, task_number, title, status, priority, created_at, updated_at)
         VALUES ('unique-test-2', 'TSN-UNIQUE-001', 'Test Task 2', 'draft', 'medium', datetime('now'), datetime('now'))",
        [],
    )?;

    // Should fail due to unique constraint on task_number
    assert!(
        duplicate_result.is_err(),
        "Duplicate task_number should be rejected by unique constraint"
    );

    // Clean up
    ctx.conn
        .execute("DELETE FROM tasks WHERE id = 'unique-test-1'", [])?;

    Ok(())
}
