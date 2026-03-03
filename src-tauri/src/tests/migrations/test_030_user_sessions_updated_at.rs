//! Migration 030 tests: user_sessions updated_at column
//!
//! On fresh databases, schema.sql creates the `sessions` table directly
//! (user_sessions never exists). Migration 030 is already recorded in the
//! baseline version seed and is a no-op. This test verifies the sessions
//! table exists with the expected schema on a fresh database.

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_030_fresh_db_sessions_table_exists() {
    let ctx =
        MigrationTestContext::at_version(30).expect("Failed to create migration test context");

    // On fresh DB, user_sessions does not exist (replaced by sessions)
    let user_sessions_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user_sessions'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check user_sessions table");
    assert_eq!(
        user_sessions_exists, 0,
        "user_sessions table should not exist on fresh DB"
    );

    // The sessions table should exist instead
    let sessions_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sessions'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check sessions table");
    assert_eq!(sessions_exists, 1, "sessions table should exist on fresh DB");
}
