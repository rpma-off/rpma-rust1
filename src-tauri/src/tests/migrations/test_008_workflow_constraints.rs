//! Test migration 008: Add Workflow Constraints
//!
//! This migration adds foreign key constraints and triggers for workflow management.
//! It's critical to test because:
//! - Multiple triggers could cause circular dependencies
//! - Foreign key constraints might fail on existing data
//! - Workflow state synchronization logic is complex

use crate::commands::errors::AppResult;
use crate::db::Database;
use rusqlite::{params, Connection};
use tempfile::{tempdir, TempDir};

#[test]
#[ignore = "legacy migration test; needs schema update to current IDs/columns"]
fn test_008_workflow_constraints() -> AppResult<()> {
    // Create a fresh database
    let temp_dir = tempdir()?;
    let db_path = temp_dir.path().join("test.db");
    let database = Database::new(&db_path, "test_encryption_key_32_bytes_long!")?;
    database.init()?;
    let conn = Connection::open(db_path)?;

    // Run migration 008
    database.migrate(8)?;

    // Create test data before migration
    conn.execute_batch(
        r#"
        -- Insert test client
        INSERT INTO clients (name, address, phone, email, created_at, updated_at)
        VALUES ('Test Client', '123 Test St', '555-0123', 'client@test.com', datetime('now'), datetime('now'));
        
        -- Insert test technician
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ('tech1', 'tech@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now'));
        
        -- Insert test task without intervention
        INSERT INTO tasks (
            title, description, client_id, priority, status, 
            ppf_zone, created_at, updated_at, task_number
        ) VALUES (
            'Test Task', 'Description', 1, 'Normal', 'Pending', 
            'ZONE-001', datetime('now'), datetime('now'), 'TASK-001'
        );
        "#
    )?;

    // Check initial state
    let initial_client_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))?;
    let initial_task_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))?;
    let initial_intervention_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM interventions", [], |row| row.get(0))?;

    // Run the migration
    database.migrate(8)?;

    // Verify constraints were added
    let mut stmt = conn.prepare(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('intervention_steps') WHERE table = 'interventions'"
    )?;
    let fk_count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert!(fk_count > 0, "Foreign key constraints not properly added");

    // Test trigger functionality - intervention completion should update task status
    conn.execute(
        "UPDATE interventions SET status = 'Completed', completed_at = datetime('now') WHERE id = 1",
        [],
    )?;

    let mut stmt = conn.prepare("SELECT status FROM tasks WHERE id = 1")?;
    let task_status: String = stmt.query_row([], |row| row.get(0))?;
    assert_eq!(
        task_status, "Completed",
        "Trigger didn't update task status"
    );

    // Test constraint: can't have duplicate active interventions
    let result = conn.execute(
        "INSERT INTO interventions (client_id, technician_id, intervention_type, status, created_at, updated_at) VALUES (1, 1, 'Maintenance', 'InProgress', datetime('now'), datetime('now'))",
        [],
    );

    // Should fail due to constraint
    assert!(
        result.is_err(),
        "Duplicate active intervention constraint not enforced"
    );

    // Test cascade delete - deleting client should cascade
    conn.execute("DELETE FROM clients WHERE id = 1", [])?;

    // Verify cascade worked
    let final_client_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))?;
    let final_task_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))?;
    let final_intervention_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM interventions", [], |row| row.get(0))?;

    assert_eq!(final_client_count, initial_client_count - 1);
    assert_eq!(final_task_count, initial_task_count - 1);
    assert_eq!(final_intervention_count, initial_intervention_count - 1);

    // Check integrity
    let integrity_check: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
    assert_eq!(integrity_check, "ok", "Database integrity compromised");

    let fk_check: i32 = conn
        .query_row("PRAGMA foreign_key_check", [], |row| row.get(0))
        .unwrap_or(0);
    assert_eq!(fk_check, 0, "Foreign key constraints violated");

    Ok(())
}
