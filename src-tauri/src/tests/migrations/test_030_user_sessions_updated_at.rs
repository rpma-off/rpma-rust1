//! Migration 030 tests: user_sessions updated_at column

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_030_adds_user_sessions_updated_at() {
    let mut ctx = MigrationTestContext::at_version(29)
        .expect("Failed to create migration test context");

    ctx.migrate_to_version(30)
        .expect("Failed to run migration 30");

    let updated_at_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('user_sessions') WHERE name='updated_at'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check updated_at column");

    assert_eq!(updated_at_exists, 1, "updated_at column should exist");
}
