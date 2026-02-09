//! Test migration 012: Add Material Tables
//!
//! This migration adds materials and material_consumption tables for material usage tracking.
//! It's critical to test because:
//! - Material tracking is essential for inventory management
//! - Foreign key constraints must work properly between materials and suppliers
//! - Material consumption must properly cascade when interventions are deleted
//! - Unit of measure and material type constraints must be enforced

use crate::commands::errors::AppResult;
use crate::db::Database;
use rusqlite::{params, Connection};
use tempfile::{tempdir, TempDir};

#[test]
fn test_012_material_tables() -> AppResult<()> {
    // Create a fresh database
    let temp_dir = tempdir()?;
    let db_path = temp_dir.path().join("test.db");
    let conn = Connection::open(db_path)?;
    let database = Database::new(conn.clone());

    // Run migrations up to 011 (before material tables)
    database.migrate(11)?;

    // Create test data before migration
    conn.execute_batch(
        r#"
        -- Insert test supplier (needed for material foreign key)
        INSERT INTO suppliers (id, name, contact_person, phone, email, address, city, state, country, zip, created_at, updated_at)
        VALUES ('supplier-1', 'Test Supplier', 'John Doe', '555-0100', 'supplier@test.com', '123 Supplier St', 'Supply City', 'SC', 'Test Country', '12345', datetime('now'), datetime('now'));
        
        -- Insert test user (needed for created_by/updated_by fields)
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ('user-1', 'testuser', 'user@test.com', 'hashedpassword', 'Technician', 1, datetime('now'), datetime('now'));
        
        -- Insert test client
        INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
        VALUES ('client-1', 'Test Client', '123 Client St', '555-0123', 'client@test.com', datetime('now'), datetime('now'));
        
        -- Insert test technician
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ('tech-1', 'tech1', 'tech@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now'));
        
        -- Insert test task
        INSERT INTO tasks (id, title, description, client_id, priority, status, ppf_zone, created_at, updated_at, task_number)
        VALUES ('task-1', 'Test Task', 'Description', 'client-1', 'Normal', 'Pending', 'ZONE-001', datetime('now'), datetime('now'), 'TASK-001');
        
        -- Insert test intervention
        INSERT INTO interventions (id, client_id, technician_id, task_id, intervention_type, status, created_at, updated_at)
        VALUES ('intervention-1', 'client-1', 'tech-1', 'task-1', 'Maintenance', 'InProgress', datetime('now'), datetime('now'));
        "#
    )?;

    // Verify tables don't exist before migration
    let table_check = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('materials', 'material_consumption')")?;
    let tables: Vec<String> = table_check
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    assert!(
        tables.is_empty(),
        "Material tables should not exist before migration"
    );

    // Run migration 012
    database.migrate(12)?;

    // Verify tables were created
    let tables: Vec<String> = table_check
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    assert_eq!(tables.len(), 2, "Both material tables should be created");
    assert!(tables.contains(&"materials".to_string()));
    assert!(tables.contains(&"material_consumption".to_string()));

    // Test materials table constraints
    // Test material_type CHECK constraint
    let result = conn.execute(
        "INSERT INTO materials (id, sku, name, material_type, unit_of_measure) VALUES (?, ?, ?, ?, ?)",
        params!["mat-1", "SKU001", "Test Material", "invalid_type", "piece"]
    );
    assert!(result.is_err(), "Should reject invalid material_type");

    // Test unit_of_measure CHECK constraint
    let result = conn.execute(
        "INSERT INTO materials (id, sku, name, material_type, unit_of_measure) VALUES (?, ?, ?, ?, ?)",
        params!["mat-2", "SKU002", "Test Material", "ppf_film", "invalid_uom"]
    );
    assert!(result.is_err(), "Should reject invalid unit_of_measure");

    // Test valid material insertion
    conn.execute(
        "INSERT INTO materials (id, sku, name, material_type, category, unit_of_measure, current_stock, minimum_stock, unit_cost, supplier_id, created_by, updated_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            "mat-3", "SKU003", "PPF Film", "ppf_film", "Films", "meter", 100.0, 10.0, 50.0, "supplier-1", "user-1", "user-1"
        ]
    )?;

    conn.execute(
        "INSERT INTO materials (id, sku, name, material_type, category, unit_of_measure, current_stock, minimum_stock, unit_cost, created_by, updated_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            "mat-4", "SKU004", "Adhesive", "adhesive", "Chemicals", "liter", 25.0, 5.0, 30.0, "supplier-1", "user-1", "user-1"
        ]
    )?;

    // Verify materials were inserted
    let material_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM materials", [], |row| row.get(0))?;
    assert_eq!(material_count, 2, "Should have 2 materials");

    // Test material_consumption table
    // Test valid consumption record
    conn.execute(
        "INSERT INTO material_consumption (id, intervention_id, material_id, quantity_used, unit_cost, total_cost, recorded_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params!["cons-1", "intervention-1", "mat-3", 5.5, 50.0, 275.0, "user-1"]
    )?;

    // Verify consumption was inserted
    let consumption_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM material_consumption", [], |row| {
            row.get(0)
        })?;
    assert_eq!(consumption_count, 1, "Should have 1 consumption record");

    // Test foreign key constraints
    // Test material_consumption -> materials (RESTRICT)
    let result = conn.execute("DELETE FROM materials WHERE id = 'mat-3'", []);
    assert!(
        result.is_err(),
        "Should not allow deleting material referenced by consumption"
    );

    // Test material_consumption -> interventions (CASCADE)
    conn.execute("DELETE FROM interventions WHERE id = 'intervention-1'", [])?;

    // Verify consumption was cascaded
    let consumption_count_after: i64 =
        conn.query_row("SELECT COUNT(*) FROM material_consumption", [], |row| {
            row.get(0)
        })?;
    assert_eq!(
        consumption_count_after, 0,
        "Consumption should be deleted when intervention is deleted"
    );

    // Test material -> suppliers (SET NULL)
    conn.execute("DELETE FROM suppliers WHERE id = 'supplier-1'", [])?;

    let supplier_id: Option<String> = conn.query_row(
        "SELECT supplier_id FROM materials WHERE id = 'mat-3'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        supplier_id.is_none(),
        "Supplier ID should be set to NULL after supplier deletion"
    );

    // Test indexes
    let index_check = conn.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='materials' AND name IN ('idx_materials_sku', 'idx_materials_type', 'idx_materials_supplier', 'idx_materials_active')"
    )?;
    let material_indexes: Vec<String> = index_check
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    assert_eq!(
        material_indexes.len(),
        4,
        "All material indexes should be created"
    );

    let consumption_index_check = conn.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='material_consumption' AND name IN ('idx_material_consumption_intervention', 'idx_material_consumption_material', 'idx_material_consumption_step')"
    )?;
    let consumption_indexes: Vec<String> = consumption_index_check
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    assert_eq!(
        consumption_indexes.len(),
        3,
        "All consumption indexes should be created"
    );

    // Test data integrity
    let integrity_check: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
    assert_eq!(integrity_check, "ok", "Database integrity compromised");

    let fk_check: i32 = conn
        .query_row("PRAGMA foreign_key_check", [], |row| row.get(0))
        .unwrap_or(0);
    assert_eq!(fk_check, 0, "Foreign key constraints violated");

    Ok(())
}
