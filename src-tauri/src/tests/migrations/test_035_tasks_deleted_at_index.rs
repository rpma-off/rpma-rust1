//! Migration 035 tests: Partial index for active tasks (deleted_at IS NULL)

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_035_adds_tasks_deleted_at_index() {
    let mut ctx =
        MigrationTestContext::at_version(34).expect("Failed to create migration test context");

    ctx.migrate_to_version(35)
        .expect("Failed to run migration 35");

    let index_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_tasks_active'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check index");

    assert_eq!(index_exists, 1, "idx_tasks_active index should exist");
}
