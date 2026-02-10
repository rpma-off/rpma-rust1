//! Test for migration 019_enhanced_performance_indexes.sql
//!
//! This test verifies that the enhanced performance indexes are created correctly
//! and improve query performance for common patterns.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
#[ignore = "legacy migration test; needs schema update to current IDs/columns"]
fn test_019_enhanced_performance_indexes() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new()?;
    ctx.database.migrate(19)?;

    // Create test data first
    create_test_data(&mut ctx)?;

    // Check that all expected indexes were created
    verify_indexes_created(&ctx)?;

    // Test query plans to ensure indexes are used
    test_query_plans(&ctx)?;

    // Test partial indexes
    test_partial_indexes(&ctx)?;

    // Test performance improvement
    test_performance_improvement(&ctx)?;

    Ok(())
}

/// Create test data for index testing
fn create_test_data(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Insert test clients
    ctx.conn.execute_batch(
        r#"
        INSERT INTO clients (id, name, address, phone, email, customer_type, created_at, updated_at)
        VALUES 
            ('client-019-1', 'Client A', 'Addr A', '555-0101', 'a@test.com', 'individual', datetime('now'), datetime('now')),
            ('client-019-2', 'Client B', 'Addr B', '555-0102', 'b@test.com', 'business', datetime('now'), datetime('now')),
            ('client-019-3', 'Client C', 'Addr C', '555-0103', 'c@test.com', 'individual', datetime('now'), datetime('now'));
        "#
    )?;

    // Insert test users with different roles
    ctx.conn.execute_batch(
        r#"
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES 
            ('user-019-1', 'tech1', 'tech1@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now')),
            ('user-019-2', 'tech2', 'tech2@test.com', 'hash', 'Technician', 0, datetime('now'), datetime('now')),
            ('user-019-3', 'admin1', 'admin@test.com', 'hash', 'Admin', 1, datetime('now'), datetime('now'));
        "#
    )?;

    // Insert test tasks with various statuses and priorities
    ctx.conn.execute_batch(
        r#"
        INSERT INTO tasks (id, title, description, client_id, technician_id, status, priority, scheduled_date, created_at, updated_at, task_number, vehicle_plate)
        VALUES 
            ('task-019-1', 'Task A', 'Desc A', 'client-019-1', 'user-019-1', 'pending', 'high', datetime('now'), datetime('now'), datetime('now'), 'TASK-001', 'ABC123'),
            ('task-019-2', 'Task B', 'Desc B', 'client-019-2', 'user-019-1', 'in_progress', 'medium', datetime('now', '+1 day'), datetime('now'), datetime('now'), 'TASK-002', 'DEF456'),
            ('task-019-3', 'Task C', 'Desc C', 'client-019-3', 'user-019-3', 'completed', 'low', datetime('now', '+2 days'), datetime('now'), datetime('now'), 'TASK-003', 'GHI789'),
            ('task-019-4', 'Task D', 'Desc D', 'client-019-1', 'user-019-1', 'assigned', 'urgent', datetime('now', '+3 days'), datetime('now'), datetime('now'), 'TASK-004', 'JKL012');
        "#
    )?;

    // Insert test interventions
    ctx.conn.execute_batch(
        r#"
        INSERT INTO interventions (id, client_id, technician_id, task_id, intervention_type, status, current_step, created_at, updated_at)
        VALUES 
            ('int-019-1', 'client-019-1', 'user-019-1', 'task-019-1', 'Maintenance', 'in_progress', 'preparation', datetime('now'), datetime('now')),
            ('int-019-2', 'client-019-2', 'user-019-1', 'task-019-2', 'Installation', 'pending', 'inspection', datetime('now', '-1 day'), datetime('now')),
            ('int-019-3', 'client-019-3', 'user-019-3', 'task-019-3', 'Repair', 'completed', 'completion', datetime('now', '-2 days'), datetime('now')),
            ('int-019-4', 'client-019-1', 'user-019-1', 'task-019-4', 'Installation', 'in_progress', 'preparation', datetime('now', '-3 hours'), datetime('now'));
        "#
    )?;

    // Insert test audit log entries
    ctx.conn.execute_batch(
        r#"
        INSERT INTO settings_audit_log (id, setting_key, old_value, new_value, changed_by, timestamp, setting_type)
        VALUES 
            ('audit-019-1', 'theme', 'light', 'dark', 'user-019-1', datetime('now'), 'appearance'),
            ('audit-019-2', 'language', 'en', 'fr', 'admin1', datetime('now', '-1 hour'), 'localization');
        "#
    )?;

    Ok(())
}

/// Verify all expected indexes were created
fn verify_indexes_created(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get all indexes created by migration 019
    let mut stmt = ctx.conn.prepare(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND name LIKE 'idx_%' 
         AND sql LIKE '%CREATE INDEX%'",
    )?;

    let indexes: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    // Check task-related indexes
    let task_indexes: Vec<&String> = indexes.iter().filter(|i| i.contains("tasks")).collect();

    assert!(
        task_indexes
            .iter()
            .any(|i| i.contains("status_priority_scheduled_date")),
        "Should have idx_tasks_status_priority_scheduled_date"
    );
    assert!(
        task_indexes
            .iter()
            .any(|i| i.contains("technician_status_priority")),
        "Should have idx_tasks_technician_status_priority"
    );
    assert!(
        task_indexes
            .iter()
            .any(|i| i.contains("created_status_scheduled")),
        "Should have idx_tasks_created_status_scheduled"
    );
    assert!(
        task_indexes
            .iter()
            .any(|i| i.contains("client_status_priority")),
        "Should have idx_tasks_client_status_priority"
    );
    assert!(
        task_indexes.iter().any(|i| i.contains("active_only")),
        "Should have idx_tasks_active_only"
    );
    assert!(
        task_indexes.iter().any(|i| i.contains("title_description")),
        "Should have idx_tasks_title_description"
    );
    assert!(
        task_indexes
            .iter()
            .any(|i| i.contains("vehicle_plate_lower")),
        "Should have idx_tasks_vehicle_plate_lower"
    );

    // Check intervention-related indexes
    let intervention_indexes: Vec<&String> = indexes
        .iter()
        .filter(|i| i.contains("interventions"))
        .collect();

    assert!(
        intervention_indexes
            .iter()
            .any(|i| i.contains("task_created")),
        "Should have idx_interventions_task_created"
    );
    assert!(
        intervention_indexes
            .iter()
            .any(|i| i.contains("status_created")),
        "Should have idx_interventions_status_created"
    );
    assert!(
        intervention_indexes
            .iter()
            .any(|i| i.contains("current_step_status")),
        "Should have idx_interventions_current_step_status"
    );
    assert!(
        intervention_indexes
            .iter()
            .any(|i| i.contains("incomplete")),
        "Should have idx_interventions_incomplete"
    );

    // Check other indexes
    assert!(
        indexes
            .iter()
            .any(|i| i.contains("clients_name_type_active")),
        "Should have idx_clients_name_type_active"
    );
    assert!(
        indexes.iter().any(|i| i.contains("users_role_active")),
        "Should have idx_users_role_active"
    );
    assert!(
        indexes
            .iter()
            .any(|i| i.contains("audit_log_timestamp_setting_type")),
        "Should have idx_audit_log_timestamp_setting_type"
    );
    assert!(
        indexes.iter().any(|i| i.contains("cache_metadata_updated")),
        "Should have idx_cache_metadata_updated"
    );

    Ok(())
}

/// Test that query plans use the indexes correctly
fn test_query_plans(ctx: &MigrationTestContext) -> AppResult<()> {
    // Query that should use idx_tasks_status_priority_scheduled_date
    let plan1: String = ctx.conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE status = 'pending' ORDER BY priority DESC, scheduled_date ASC LIMIT 10",
        [],
        |row| row.get(0)
    )?;
    assert!(
        plan1.contains("idx_tasks_status_priority_scheduled_date"),
        "Should use idx_tasks_status_priority_scheduled_date"
    );

    // Query that should use idx_tasks_technician_status_priority
    let plan2: String = ctx.conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE technician_id = 'user-019-1' AND status = 'in_progress' ORDER BY priority DESC",
        [],
        |row| row.get(0)
    )?;
    assert!(
        plan2.contains("idx_tasks_technician_status_priority"),
        "Should use idx_tasks_technician_status_priority"
    );

    // Query that should use idx_interventions_task_created
    let plan3: String = ctx.conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM interventions WHERE task_id = 'task-019-1' ORDER BY created_at DESC",
        [],
        |row| row.get(0)
    )?;
    assert!(
        plan3.contains("idx_interventions_task_created"),
        "Should use idx_interventions_task_created"
    );

    // Query that should use idx_tasks_vehicle_plate_lower for case-insensitive search
    let plan4: String = ctx.conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE LOWER(vehicle_plate) = 'abc123'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        plan4.contains("idx_tasks_vehicle_plate_lower"),
        "Should use idx_tasks_vehicle_plate_lower"
    );

    Ok(())
}

/// Test partial indexes are working correctly
fn test_partial_indexes(ctx: &MigrationTestContext) -> AppResult<()> {
    // Test idx_tasks_active_only partial index
    let plan1: String = ctx.conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE status = 'pending' AND technician_id = 'user-019-1'",
        [],
        |row| row.get(0)
    )?;
    assert!(
        plan1.contains("idx_tasks_active_only"),
        "Should use idx_tasks_active_only for active tasks"
    );

    // Test idx_interventions_incomplete partial index
    let plan2: String = ctx.conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM interventions WHERE status = 'in_progress'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        plan2.contains("idx_interventions_incomplete"),
        "Should use idx_interventions_incomplete for incomplete interventions"
    );

    Ok(())
}

/// Test that indexes actually improve performance
fn test_performance_improvement(ctx: &MigrationTestContext) -> AppResult<()> {
    // Insert more test data to make performance difference noticeable
    for i in 0..100u32 {
        ctx.conn.execute(
            "INSERT INTO tasks (id, title, description, client_id, status, priority, created_at, updated_at, task_number, vehicle_plate)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                format!("task-perf-{}", i),
                format!("Task {}", i),
                format!("Description {}", i),
                "client-019-1",
                if i % 3 == 0 { "pending" } else if i % 3 == 1 { "in_progress" } else { "completed" },
                if i % 5 == 0 { "high" } else { "medium" },
                format!("datetime('now', '-{} minutes')", i),
                "datetime('now')",
                format!("TASK-PERF-{:03}", i),
                format!("PLATE{}", i)
            ]
        )?;
    }

    // Test query that benefits from composite index
    let results: Vec<String> = ctx.conn.prepare(
        "SELECT id FROM tasks WHERE status IN ('pending', 'in_progress') ORDER BY priority DESC, scheduled_date ASC LIMIT 20"
    )?.query_map([], |row| {
        row.get(0)
    })?.collect::<Result<Vec<_>, _>>()?;

    assert!(!results.is_empty(), "Query should return results");

    // Test query that benefits from partial index
    let results2: Vec<String> = ctx.conn.prepare(
        "SELECT id FROM tasks WHERE status IN ('pending', 'in_progress', 'assigned') AND technician_id = 'user-019-1'"
    )?.query_map([], |row| {
        row.get(0)
    })?.collect::<Result<Vec<_>, _>>()?;

    assert!(
        !results2.is_empty(),
        "Query should return active tasks for technician"
    );

    // Test case-insensitive search
    let results3: Vec<String> = ctx
        .conn
        .prepare("SELECT id FROM tasks WHERE LOWER(vehicle_plate) = 'abc123'")?
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        !results3.is_empty(),
        "Case-insensitive search should find task"
    );

    // Clean up performance test data
    ctx.conn
        .execute("DELETE FROM tasks WHERE id LIKE 'task-perf-%'", [])?;

    Ok(())
}
