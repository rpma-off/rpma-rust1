//! Test for migration 024_add_inventory_management.sql
//!
//! This test verifies that the inventory management tables are created correctly
//! with proper relationships, constraints, and indexes for inventory tracking.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_migration_024_inventory_management() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(24)?;

    // Check that inventory_categories table exists
    let categories_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='inventory_categories'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        categories_exists > 0,
        "inventory_categories table should exist"
    );

    // Check that inventory_locations table exists
    let locations_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='inventory_locations'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        locations_exists > 0,
        "inventory_locations table should exist"
    );

    // Check that inventory_adjustments table exists
    let adjustments_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='inventory_adjustments'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        adjustments_exists > 0,
        "inventory_adjustments table should exist"
    );

    // Verify inventory_categories table structure
    verify_inventory_categories_table_structure(&ctx)?;

    // Verify inventory_locations table structure
    verify_inventory_locations_table_structure(&ctx)?;

    // Verify inventory_adjustments table structure
    verify_inventory_adjustments_table_structure(&ctx)?;

    // Test with sample data
    test_inventory_management_with_data(&mut ctx)?;

    Ok(())
}

/// Verify the inventory_categories table has the correct structure
fn verify_inventory_categories_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx
        .conn
        .prepare("PRAGMA table_info(inventory_categories)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "name",
        "description",
        "parent_category_id",
        "is_active",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in inventory_categories table",
            col
        );
    }

    // Check foreign key constraint
    let fks: Vec<String> = ctx
        .conn
        .prepare("PRAGMA foreign_key_list(inventory_categories)")?
        .query_map([], |row| Ok(row.get::<_, String>(2)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        fks.iter().any(|table| table == "inventory_categories"),
        "inventory_categories table should have self-referencing foreign key"
    );

    Ok(())
}

/// Verify the inventory_locations table has the correct structure
fn verify_inventory_locations_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(inventory_locations)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "name",
        "description",
        "address",
        "is_active",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in inventory_locations table",
            col
        );
    }

    Ok(())
}

/// Verify the inventory_adjustments table has the correct structure
fn verify_inventory_adjustments_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx
        .conn
        .prepare("PRAGMA table_info(inventory_adjustments)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "material_id",
        "location_id",
        "adjustment_type",
        "quantity_before",
        "quantity_after",
        "adjustment_quantity",
        "reason",
        "reference_id",
        "reference_type",
        "created_by",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in inventory_adjustments table",
            col
        );
    }

    // Check foreign key constraints
    let fks: Vec<String> = ctx
        .conn
        .prepare("PRAGMA foreign_key_list(inventory_adjustments)")?
        .query_map([], |row| Ok(row.get::<_, String>(2)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        fks.iter().any(|table| table == "materials"),
        "inventory_adjustments table should have foreign key to materials"
    );
    assert!(
        fks.iter().any(|table| table == "inventory_locations"),
        "inventory_adjustments table should have foreign key to inventory_locations"
    );
    assert!(
        fks.iter().any(|table| table == "users"),
        "inventory_adjustments table should have foreign key to users"
    );

    Ok(())
}

/// Test inventory management tables with sample data
fn test_inventory_management_with_data(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Insert a test user first
    ctx.conn.execute(
        "INSERT INTO users (id, email, password_hash, created_at, updated_at) 
         VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
        params!["user123", "test@example.com", "hashedpassword"],
    )?;

    // Insert test material
    ctx.conn.execute(
        "INSERT INTO materials (id, sku, name, description, unit_cost, quantity, 
         reorder_point, unit_of_measure, material_type, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now'))",
        params![
            "material123",
            "INV001",
            "Test Material",
            "A test material for inventory management",
            10.50,
            100.0,
            20.0,
            "unit",
            "consumable",
        ],
    )?;

    // Insert inventory category
    ctx.conn.execute(
        "INSERT INTO inventory_categories (id, name, description, is_active, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, datetime('now'), datetime('now'))",
        params!["cat123", "Test Category", "A test category", true]
    )?;

    // Insert inventory location
    ctx.conn.execute(
        "INSERT INTO inventory_locations (id, name, description, address, is_active, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))",
        params![
            "loc123",
            "Main Warehouse",
            "Primary storage location",
            "123 Storage St, Warehouse City",
            true
        ]
    )?;

    // Insert inventory adjustment
    ctx.conn.execute(
        "INSERT INTO inventory_adjustments (id, material_id, location_id, adjustment_type, 
         quantity_before, quantity_after, adjustment_quantity, reason, created_by, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now'))",
        params![
            "adj123",
            "material123",
            "loc123",
            "initial",
            0.0,
            100.0,
            100.0,
            "Initial inventory count",
            "user123"
        ]
    )?;

    // Verify data can be retrieved
    let category_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM inventory_categories WHERE name = ?",
        params!["Test Category"],
        |row| row.get(0),
    )?;
    assert_eq!(category_count, 1, "Should have one test category");

    let location_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM inventory_locations WHERE name = ?",
        params!["Main Warehouse"],
        |row| row.get(0),
    )?;
    assert_eq!(location_count, 1, "Should have one test location");

    let adjustment_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM inventory_adjustments WHERE material_id = ?",
        params!["material123"],
        |row| row.get(0),
    )?;
    assert_eq!(adjustment_count, 1, "Should have one inventory adjustment");

    Ok(())
}
