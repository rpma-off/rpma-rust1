//! Migration 040 tests: activity and inventory reference indexes
//!
//! On fresh databases, schema.sql creates the `sessions` table directly
//! (user_sessions never exists). Migration 040 is already recorded in the
//! baseline version seed and is a no-op. This test verifies the
//! inventory_transactions reference index exists on a fresh database.

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_040_fresh_db_inventory_reference_index_exists() {
    let ctx =
        MigrationTestContext::at_version(40).expect("Failed to create migration test context");

    // On fresh DB, user_sessions indexes should not exist
    let old_session_index_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_user_sessions_last_activity_user'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check old session activity index");
    assert_eq!(
        old_session_index_exists, 0,
        "user_sessions index should not exist on fresh DB"
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
