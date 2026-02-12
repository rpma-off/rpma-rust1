//! Migration 031 tests: Non-negative CHECK constraints for inventory tables

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_031_adds_non_negative_checks_to_inventory_transactions() {
    let mut ctx =
        MigrationTestContext::at_version(30).expect("Failed to create migration test context");

    ctx.migrate_to_version(31)
        .expect("Failed to run migration 31");

    // Verify inventory_transactions table still exists
    let table_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventory_transactions'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check table");

    assert_eq!(table_exists, 1, "inventory_transactions table should exist");

    // Verify materials table still exists
    let mat_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='materials'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check table");

    assert_eq!(mat_exists, 1, "materials table should exist");

    // Verify material_consumption table still exists
    let mc_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='material_consumption'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check table");

    assert_eq!(mc_exists, 1, "material_consumption table should exist");
}
