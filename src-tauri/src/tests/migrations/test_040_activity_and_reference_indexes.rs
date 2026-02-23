//! Migration 040 tests: activity and inventory reference indexes

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_040_adds_recent_activity_and_reference_indexes() {
    let mut ctx =
        MigrationTestContext::at_version(39).expect("Failed to create migration test context");

    ctx.migrate_to_version(40)
        .expect("Failed to run migration 040");

    let session_index_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_user_sessions_last_activity_user'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check session activity index");
    assert_eq!(
        session_index_exists, 1,
        "idx_user_sessions_last_activity_user index should exist"
    );

    let reference_index_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_inventory_transactions_reference_type_number'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check inventory reference index");
    assert_eq!(
        reference_index_exists, 1,
        "idx_inventory_transactions_reference_type_number index should exist"
    );
}
