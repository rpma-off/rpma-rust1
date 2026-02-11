//! Migration 029 tests: first_name/last_name columns and backfill behavior

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_029_backfills_names_from_full_name() {
    let mut ctx = MigrationTestContext::at_version(28)
        .expect("Failed to create migration test context");

    let user_id = "user-029";

    ctx.conn
        .execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                user_id,
                "jane.doe@example.com",
                "jane_doe",
                "hash",
                "Jane Doe",
                "viewer",
                1,
                0,
                0,
            ],
        )
        .expect("Failed to insert test user");

    ctx.conn
        .execute(
            "UPDATE users SET first_name = '', last_name = '' WHERE id = ?1",
            [user_id],
        )
        .expect("Failed to clear name fields");

    ctx.migrate_to_version(29)
        .expect("Failed to run migration 29");

    let (first_name, last_name): (String, String) = ctx
        .conn
        .query_row(
            "SELECT first_name, last_name FROM users WHERE id = ?1",
            [user_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .expect("Failed to query user names");

    assert_eq!(first_name, "Jane");
    assert_eq!(last_name, "Doe");
}
