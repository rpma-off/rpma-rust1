//! Migration 034 tests: Composite index for session activity sorting
//!
//! On fresh databases, schema.sql creates the `sessions` table directly
//! (user_sessions never exists). Migration 034 is already recorded in the
//! baseline version seed and is a no-op. This test verifies the sessions
//! table indexes exist on a fresh database.

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_034_fresh_db_session_indexes_exist() {
    let ctx =
        MigrationTestContext::at_version(34).expect("Failed to create migration test context");

    // On fresh DB, user_sessions indexes should not exist
    let old_index_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_user_sessions_user_expires_activity'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check old index");
    assert_eq!(
        old_index_exists, 0,
        "user_sessions index should not exist on fresh DB"
    );

    // The sessions table should exist with its base indexes
    let sessions_user_idx: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_sessions_user_id'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check sessions user_id index");
    assert_eq!(
        sessions_user_idx, 1,
        "idx_sessions_user_id index should exist on fresh DB"
    );
}
