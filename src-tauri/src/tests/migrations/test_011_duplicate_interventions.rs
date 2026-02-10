//! Test migration 011: Prevent Duplicate Interventions
//!
//! This migration adds a partial unique index to prevent duplicate active interventions.
//! It's critical to test because:
//! - It modifies existing data (cancels duplicates)
//! - Partial unique index could impact application queries
//! - Complex CTE for identifying duplicates

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
#[ignore = "legacy migration test; needs schema update to current IDs/columns"]
fn test_011_duplicate_interventions() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new()?;
    ctx.database.migrate(11)?;

    // Create test data with duplicate interventions
    ctx.conn.execute_batch(
        r#"
        -- Insert test client
        INSERT INTO clients (name, address, phone, email, created_at, updated_at)
        VALUES ('Test Client', '123 Test St', '555-0123', 'client@test.com', datetime('now'), datetime('now'));
        
        -- Insert test technician
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ('tech1', 'tech@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now'));
        
        -- Insert multiple interventions for the same client (should be duplicates)
        INSERT INTO interventions (
            client_id, technician_id, intervention_type, status,
            created_at, updated_at
        ) VALUES 
            (1, 1, 'Maintenance', 'InProgress', datetime('now', '-2 days'), datetime('now', '-2 days')),
            (1, 1, 'Maintenance', 'InProgress', datetime('now', '-1 day'), datetime('now', '-1 day')),
            (1, 1, 'Installation', 'Pending', datetime('now', '-3 days'), datetime('now', '-3 days'));
        
        -- Insert a completed intervention (should not be affected)
        INSERT INTO interventions (
            client_id, technician_id, intervention_type, status,
            created_at, updated_at, completed_at
        ) VALUES 
            (1, 1, 'Maintenance', 'Completed', datetime('now', '-5 days'), datetime('now', '-5 days'), datetime('now', '-4 days'));
        "#
    )?;

    let initial_intervention_count = ctx.count_rows("interventions")?;

    // Run migration 011
    ctx.migrate_to_version(11)?;

    // Verify that duplicates were cancelled
    let mut stmt = ctx.conn.prepare(
        "SELECT COUNT(*) FROM interventions WHERE client_id = 1 AND status = 'Cancelled'",
    )?;
    let cancelled_count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert!(
        cancelled_count > 0,
        "Expected some interventions to be cancelled"
    );

    // Verify that only one active intervention remains
    let mut stmt = ctx.conn.prepare(
        "SELECT COUNT(*) FROM interventions WHERE client_id = 1 AND status IN ('Pending', 'InProgress')"
    )?;
    let active_count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert_eq!(
        active_count, 1,
        "Should only have one active intervention per client"
    );

    // Verify completed intervention was not affected
    let mut stmt = ctx.conn.prepare(
        "SELECT COUNT(*) FROM interventions WHERE client_id = 1 AND status = 'Completed'",
    )?;
    let completed_count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert_eq!(
        completed_count, 1,
        "Completed intervention should not be affected"
    );

    // Test the unique constraint by trying to insert a duplicate
    let result = ctx.conn.execute(
        "INSERT INTO interventions (client_id, technician_id, intervention_type, status, created_at, updated_at) VALUES (1, 1, 'Maintenance', 'InProgress', datetime('now'), datetime('now'))",
        [],
    );

    assert!(
        result.is_err(),
        "Unique constraint should prevent duplicate active interventions"
    );

    // But should be able to insert for a different client
    ctx.conn.execute(
        "INSERT INTO clients (name, address, phone, email, created_at, updated_at) VALUES ('Client 2', '456 St', '555-0456', 'c2@test.com', datetime('now'), datetime('now'))",
        [],
    )?;

    let result = ctx.conn.execute(
        "INSERT INTO interventions (client_id, technician_id, intervention_type, status, created_at, updated_at) VALUES (2, 1, 'Maintenance', 'InProgress', datetime('now'), datetime('now'))",
        [],
    );
    assert!(
        result.is_ok(),
        "Should allow intervention for different client"
    );

    // Verify the partial unique index exists
    let mut stmt = ctx
        .conn
        .prepare("SELECT COUNT(*) FROM pragma_index_list('interventions') WHERE origin = 'u'")?;
    let unique_index_count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert!(unique_index_count > 0, "Unique index should be created");

    Ok(())
}

#[test]
#[ignore = "legacy migration test; needs schema update to current IDs/columns"]
fn test_011_duplicate_interventions_edge_cases() -> Result<(), Box<dyn std::error::Error>> {
    let mut ctx = MigrationTestContext::new()?;

    // Test edge case: interventions with different statuses
    ctx.conn.execute_batch(
        r#"
        INSERT INTO clients (name, address, phone, email, created_at, updated_at)
        VALUES ('Edge Client', '999 Edge St', '555-9999', 'edge@test.com', datetime('now'), datetime('now'));
        
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ('edge_tech', 'edge@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now'));
        
        -- Create interventions with various statuses
        INSERT INTO interventions (
            client_id, technician_id, intervention_type, status,
            created_at, updated_at
        ) VALUES 
            (1, 1, 'Maintenance', 'Paused', datetime('now', '-1 day'), datetime('now', '-1 day')),
            (1, 1, 'Installation', 'InProgress', datetime('now'), datetime('now')),
            (1, 1, 'Repair', 'Pending', datetime('now', '-2 days'), datetime('now', '-2 days'));
        "#
    )?;

    // Run migration
    ctx.migrate_to_version(11)?;

    // Verify only one non-completed status remains
    let mut stmt = ctx.conn.prepare(
        "SELECT status FROM interventions WHERE client_id = 1 AND status NOT IN ('Completed', 'Cancelled')"
    )?;
    let statuses: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()?;

    assert_eq!(
        statuses.len(),
        1,
        "Should only have one non-completed intervention"
    );

    // Test that we can have multiple completed interventions for the same client
    ctx.conn.execute(
        "INSERT INTO interventions (client_id, technician_id, intervention_type, status, created_at, updated_at, completed_at) VALUES (1, 1, 'Maintenance', 'Completed', datetime('now', '-10 days'), datetime('now', '-9 days'), datetime('now', '-9 days'))",
        [],
    )?;

    let mut stmt = ctx.conn.prepare(
        "SELECT COUNT(*) FROM interventions WHERE client_id = 1 AND status = 'Completed'",
    )?;
    let completed_count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert!(
        completed_count > 1,
        "Should allow multiple completed interventions"
    );

    Ok(())
}
