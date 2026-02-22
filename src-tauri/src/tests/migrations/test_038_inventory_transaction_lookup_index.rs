//! Migration 038 tests: inventory transaction lookup index

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_038_adds_inventory_transaction_lookup_index() {
    let mut ctx =
        MigrationTestContext::at_version(37).expect("Failed to create migration test context");

    ctx.migrate_to_version(38)
        .expect("Failed to run migration 38");

    let index_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_inventory_transactions_material_performed_at'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check index");

    assert_eq!(
        index_exists, 1,
        "idx_inventory_transactions_material_performed_at index should exist"
    );
}
