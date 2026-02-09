//! Test migration 008: Add Workflow Constraints
//!
//! This migration adds foreign key constraints and triggers for workflow management.
//! It's critical to test because:
//! - Multiple triggers could cause circular dependencies
//! - Foreign key constraints might fail on existing data
//! - Workflow state synchronization logic is complex

use super::*;

test_migration!(8, test_008_workflow_constraints, {
    // Create test data before migration
    ctx.conn.execute_batch(
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
        
        -- Insert intervention without steps (should be valid)
        INSERT INTO interventions (
            client_id, technician_id, intervention_type, status,
            created_at, updated_at
        ) VALUES (
            1, 1, 'Maintenance', 'InProgress',
            datetime('now'), datetime('now')
        );
        "#
    )?;

    // Check initial state
    let initial_client_count = ctx.count_rows("clients")?;
    let initial_task_count = ctx.count_rows("tasks")?;
    let initial_intervention_count = ctx.count_rows("interventions")?;

    // Run migration 008
    ctx.migrate_to_version(8)?;

    // Verify constraints were added
    let mut stmt = ctx.conn.prepare(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('intervention_steps') WHERE table = 'interventions'"
    )?;
    let fk_count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert!(fk_count > 0, "Foreign key constraints not properly added");

    // Test trigger functionality - intervention completion should update task status
    ctx.conn.execute(
        "UPDATE interventions SET status = 'Completed', completed_at = datetime('now') WHERE id = 1",
        [],
    )?;

    // Check if task status was updated by trigger
    let mut stmt = ctx.conn.prepare("SELECT status FROM tasks WHERE id = 1")?;
    let task_status: String = stmt.query_row([], |row| row.get(0))?;
    assert_eq!(
        task_status, "Completed",
        "Trigger didn't update task status"
    );

    // Test constraint: can't have duplicate active interventions
    let result = ctx.conn.execute(
        "INSERT INTO interventions (client_id, technician_id, intervention_type, status, created_at, updated_at) VALUES (1, 1, 'Maintenance', 'InProgress', datetime('now'), datetime('now'))",
        [],
    );

    // Should fail due to constraint
    assert!(
        result.is_err(),
        "Duplicate active intervention constraint not enforced"
    );

    // Test cascade delete - deleting client should cascade
    ctx.conn.execute("DELETE FROM clients WHERE id = 1", [])?;

    // Verify cascade worked
    let final_client_count = ctx.count_rows("clients")?;
    let final_task_count = ctx.count_rows("tasks")?;
    let final_intervention_count = ctx.count_rows("interventions")?;

    assert_eq!(final_client_count, initial_client_count - 1);
    assert_eq!(final_task_count, initial_task_count - 1);
    assert_eq!(final_intervention_count, initial_intervention_count - 1);

    // Verify database integrity after all operations
    assert!(ctx.check_integrity()?, "Database integrity compromised");
    assert!(
        ctx.check_foreign_keys()?,
        "Foreign key constraints violated"
    );
});

#[test]
fn test_008_workflow_constraints_with_real_data() -> Result<(), Box<dyn std::error::Error>> {
    let ctx = MigrationTestContext::new()?;

    // Create more realistic test data
    ctx.conn.execute_batch(
        r#"
        -- Insert multiple clients
        INSERT INTO clients (name, address, phone, email, created_at, updated_at)
        VALUES 
            ('Client A', '123 A St', '555-0001', 'a@test.com', datetime('now'), datetime('now')),
            ('Client B', '456 B St', '555-0002', 'b@test.com', datetime('now'), datetime('now')),
            ('Client C', '789 C St', '555-0003', 'c@test.com', datetime('now'), datetime('now'));
        
        -- Insert technicians
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES 
            ('tech_a', 'tech_a@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now')),
            ('tech_b', 'tech_b@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now'));
        
        -- Insert tasks with different statuses
        INSERT INTO tasks (title, description, client_id, priority, status, ppf_zone, created_at, updated_at, task_number)
        VALUES 
            ('Task 1', 'Desc 1', 1, 'Normal', 'Pending', 'ZONE-001', datetime('now'), datetime('now'), 'TASK-001'),
            ('Task 2', 'Desc 2', 2, 'High', 'InProgress', 'ZONE-002', datetime('now'), datetime('now'), 'TASK-002'),
            ('Task 3', 'Desc 3', 3, 'Normal', 'Completed', 'ZONE-003', datetime('now'), datetime('now'), 'TASK-003');
        
        -- Insert some interventions
        INSERT INTO interventions (client_id, technician_id, intervention_type, status, created_at, updated_at)
        VALUES 
            (1, 1, 'Maintenance', 'InProgress', datetime('now'), datetime('now')),
            (2, 2, 'Installation', 'Completed', datetime('now'), datetime('now'));
        "#
    )?;

    // Run migration
    ctx.migrate_to_version(8)?;

    // Test workflow transitions
    // 1. Start new intervention for Client C (should work)
    ctx.conn.execute(
        "INSERT INTO interventions (client_id, technician_id, intervention_type, status, created_at, updated_at) VALUES (3, 1, 'Maintenance', 'InProgress', datetime('now'), datetime('now'))",
        [],
    )?;

    // 2. Try to start another for Client C (should fail)
    let result = ctx.conn.execute(
        "INSERT INTO interventions (client_id, technician_id, intervention_type, status, created_at, updated_at) VALUES (3, 2, 'Maintenance', 'InProgress', datetime('now'), datetime('now'))",
        [],
    );
    assert!(
        result.is_err(),
        "Should not allow duplicate active interventions"
    );

    // 3. Complete intervention for Client A and verify task update
    ctx.conn.execute(
        "UPDATE interventions SET status = 'Completed', completed_at = datetime('now') WHERE client_id = 1",
        [],
    )?;

    let mut stmt = ctx
        .conn
        .prepare("SELECT status FROM tasks WHERE client_id = 1")?;
    let task_status: String = stmt.query_row([], |row| row.get(0))?;
    assert_eq!(
        task_status, "Completed",
        "Task should be updated when intervention completes"
    );

    Ok(())
}
