//! Test migration 019: Enhanced Performance Indexes
//!
//! This migration adds composite and partial indexes for improved query performance.
//! It's critical to test because:
//! - Performance indexes directly impact application responsiveness
//! - Composite indexes must be in correct column order for query optimization
//! - Partial indexes must have correct WHERE clauses
//! - Missing indexes can cause severe performance degradation

use crate::commands::errors::AppResult;
use crate::db::Database;
use rusqlite::{params, Connection};
use tempfile::{tempdir, TempDir};

#[test]
fn test_019_enhanced_performance_indexes() -> AppResult<()> {
    // Create a fresh database
    let temp_dir = tempdir()?;
    let db_path = temp_dir.path().join("test.db");
    let conn = Connection::open(db_path)?;
    let database = Database::new(conn.clone());

    // Run migrations up to 018 (before performance indexes)
    database.migrate(18)?;

    // Create test data for index testing
    conn.execute_batch(
        r#"
        -- Insert test clients
        INSERT INTO clients (id, name, address, phone, email, customer_type, created_at, updated_at)
        VALUES 
            ('client-1', 'Client A', 'Addr A', '555-0101', 'a@test.com', 'individual', datetime('now'), datetime('now')),
            ('client-2', 'Client B', 'Addr B', '555-0102', 'b@test.com', 'business', datetime('now'), datetime('now')),
            ('client-3', 'Client C', 'Addr C', '555-0103', 'c@test.com', 'individual', datetime('now'), datetime('now'));
        
        -- Insert test users with different roles
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES 
            ('user-1', 'tech1', 'tech1@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now')),
            ('user-2', 'tech2', 'tech2@test.com', 'hash', 'Technician', 0, datetime('now'), datetime('now')),
            ('user-3', 'admin1', 'admin@test.com', 'hash', 'Admin', 1, datetime('now'), datetime('now'));
        
        -- Insert test tasks with various statuses and priorities
        INSERT INTO tasks (id, title, description, client_id, technician_id, status, priority, scheduled_date, created_at, updated_at, task_number, vehicle_plate)
        VALUES 
            ('task-1', 'Task A', 'Desc A', 'client-1', 'user-1', 'pending', 'high', datetime('now'), datetime('now'), datetime('now'), 'TASK-001', 'ABC123'),
            ('task-2', 'Task B', 'Desc B', 'client-2', 'user-1', 'in_progress', 'normal', datetime('now', '+1 day'), datetime('now'), datetime('now'), 'TASK-002', 'DEF456'),
            ('task-3', 'Task C', 'Desc C', 'client-3', 'user-3', 'completed', 'low', datetime('now', '+2 days'), datetime('now'), datetime('now'), 'TASK-003', 'GHI789');
        
        -- Insert test interventions
        INSERT INTO interventions (id, client_id, technician_id, task_id, intervention_type, status, current_step, created_at, updated_at)
        VALUES 
            ('int-1', 'client-1', 'user-1', 'task-1', 'Maintenance', 'in_progress', 'preparation', datetime('now'), datetime('now')),
            ('int-2', 'client-2', 'user-1', 'task-2', 'Installation', 'pending', 'inspection', datetime('now', '-1 day'), datetime('now')),
            ('int-3', 'client-3', 'user-3', 'task-3', 'Repair', 'completed', 'completion', datetime('now', '-2 days'), datetime('now'));
        
        -- Insert test audit log entries
        INSERT INTO settings_audit_log (id, setting_key, old_value, new_value, changed_by, timestamp, setting_type)
        VALUES 
            ('audit-1', 'theme', 'light', 'dark', 'user-1', datetime('now'), 'appearance'),
            ('audit-2', 'language', 'en', 'fr', 'admin1', datetime('now', '-1 hour'), 'localization');
        "#
    )?;

    // Verify performance indexes don't exist before migration
    let index_check = conn.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' AND tbl_name IN ('tasks', 'interventions', 'clients', 'users', 'settings_audit_log')"
    )?;
    let indexes_before: Vec<String> = index_check
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    // Should have basic indexes but not the enhanced ones
    assert!(!indexes_before.contains(&"idx_tasks_status_priority_scheduled_date".to_string()));
    assert!(!indexes_before.contains(&"idx_tasks_active_only".to_string()));

    // Run migration 019
    database.migrate(19)?;

    // Verify all expected indexes were created
    let index_check_after = conn.prepare(
        "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
    )?;
    let indexes_after: Vec<(String, String, String)> = index_check_after
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    // Check task-related indexes
    let task_indexes: Vec<&(String, String, String)> = indexes_after
        .iter()
        .filter(|(_, table, _)| table == "tasks")
        .collect();

    assert!(task_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_tasks_status_priority_scheduled_date"));
    assert!(task_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_tasks_technician_status_priority"));
    assert!(task_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_tasks_created_status_scheduled"));
    assert!(task_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_tasks_client_status_priority"));
    assert!(task_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_tasks_active_only"));
    assert!(task_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_tasks_title_description"));
    assert!(task_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_tasks_vehicle_plate_lower"));

    // Check intervention-related indexes
    let intervention_indexes: Vec<&(String, String, String)> = indexes_after
        .iter()
        .filter(|(_, table, _)| table == "interventions")
        .collect();

    assert!(intervention_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_interventions_task_created"));
    assert!(intervention_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_interventions_status_created"));
    assert!(intervention_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_interventions_current_step_status"));
    assert!(intervention_indexes
        .iter()
        .any(|(name, _, _)| name == "idx_interventions_incomplete"));

    // Check partial index WHERE clauses
    let active_only_index = indexes_after
        .iter()
        .find(|(name, _, _)| name == "idx_tasks_active_only")
        .unwrap();
    assert!(active_only_index
        .2
        .contains("WHERE status IN ('pending', 'in_progress', 'assigned')"));

    let incomplete_index = indexes_after
        .iter()
        .find(|(name, _, _)| name == "idx_interventions_incomplete")
        .unwrap();
    assert!(incomplete_index
        .2
        .contains("WHERE status NOT IN ('completed', 'cancelled')"));

    // Test that indexes are actually used by query planner
    // Query that should use idx_tasks_status_priority_scheduled_date
    let query_plan: String = conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE status = 'pending' ORDER BY priority DESC, scheduled_date ASC LIMIT 10",
        [],
        |row| row.get(0)
    )?;
    assert!(query_plan.contains("idx_tasks_status_priority_scheduled_date"), 
        "Query planner should use idx_tasks_status_priority_scheduled_date for status+priority+scheduled_date query");

    // Query that should use idx_tasks_active_only partial index
    let active_query_plan: String = conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE status = 'pending' AND technician_id = 'user-1'",
        [],
        |row| row.get(0)
    )?;
    assert!(
        active_query_plan.contains("idx_tasks_active_only"),
        "Query planner should use idx_tasks_active_only for active task query"
    );

    // Query that should use idx_tasks_vehicle_plate_lower for case-insensitive search
    let vehicle_query_plan: String = conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE LOWER(vehicle_plate) = 'abc123'",
        [],
        |row| row.get(0),
    )?;
    assert!(vehicle_query_plan.contains("idx_tasks_vehicle_plate_lower"), 
        "Query planner should use idx_tasks_vehicle_plate_lower for case-insensitive vehicle plate search");

    // Query that should use idx_interventions_incomplete partial index
    let incomplete_int_plan: String = conn.query_row(
        "EXPLAIN QUERY PLAN SELECT * FROM interventions WHERE status = 'in_progress'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        incomplete_int_plan.contains("idx_interventions_incomplete"),
        "Query planner should use idx_interventions_incomplete for incomplete intervention query"
    );

    // Test performance improvement with actual queries
    use std::time::Instant;

    // Insert more test data to make performance difference noticeable
    for i in 0..100 {
        conn.execute(
            "INSERT INTO tasks (id, title, description, client_id, status, priority, created_at, updated_at, task_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                format!("task-{}", i + 100),
                format!("Task {}", i),
                format!("Description {}", i),
                "client-1",
                if i % 3 == 0 { "pending" } else if i % 3 == 1 { "in_progress" } else { "completed" },
                if i % 5 == 0 { "high" } else { "normal" },
                datetime("now", format!("-{} minutes", i).as_str()),
                datetime("now"),
                format!("TASK-{:03}", i + 100)
            ]
        )?;
    }

    // Test query that benefits from idx_tasks_status_priority_scheduled_date
    let start = Instant::now();
    let _tasks: Vec<_> = conn.prepare(
        "SELECT * FROM tasks WHERE status IN ('pending', 'in_progress') ORDER BY priority DESC, scheduled_date ASC LIMIT 20"
    )?.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?, // id
            row.get::<_, String>(1)?, // title
            row.get::<_, String>(6)?, // status
            row.get::<_, String>(7)?  // priority
        ))
    })?.collect::<Result<Vec<_>, _>>()?;
    let indexed_duration = start.elapsed();

    // Temporarily drop the index to compare performance
    conn.execute(
        "DROP INDEX IF EXISTS idx_tasks_status_priority_scheduled_date",
        [],
    )?;

    let start = Instant::now();
    let _tasks_no_index: Vec<_> = conn.prepare(
        "SELECT * FROM tasks WHERE status IN ('pending', 'in_progress') ORDER BY priority DESC, scheduled_date ASC LIMIT 20"
    )?.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?, // id
            row.get::<_, String>(1)?, // title
            row.get::<_, String>(6)?, // status
            row.get::<_, String>(7)?  // priority
        ))
    })?.collect::<Result<Vec<_>, _>>()?;
    let no_index_duration = start.elapsed();

    // Restore the index
    conn.execute(
        "CREATE INDEX idx_tasks_status_priority_scheduled_date ON tasks (status, priority DESC, scheduled_date ASC)",
        []
    )?;

    // The indexed version should be faster (though this might not always be true in testing)
    // We're mainly checking that the index exists and can be used
    println!(
        "Indexed query: {:?}, No index: {:?}",
        indexed_duration, no_index_duration
    );

    // Check database integrity after all index operations
    let integrity_check: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
    assert_eq!(integrity_check, "ok", "Database integrity compromised");

    Ok(())
}
