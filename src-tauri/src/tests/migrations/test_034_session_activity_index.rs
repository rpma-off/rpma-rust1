//! Migration 034 tests: Composite index for session activity sorting

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_034_adds_session_activity_index() {
    let mut ctx =
        MigrationTestContext::at_version(33).expect("Failed to create migration test context");

    ctx.migrate_to_version(34)
        .expect("Failed to run migration 34");

    let index_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_user_sessions_user_expires_activity'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check index");

    assert_eq!(
        index_exists, 1,
        "idx_user_sessions_user_expires_activity index should exist"
    );
}
