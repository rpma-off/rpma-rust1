//! Migration regression and idempotency tests.

use super::*;
use rusqlite::params;
use tempfile::NamedTempFile;

fn reset_schema_version_to(conn: &rusqlite::Connection, max_inclusive: i32) {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000))",
        [],
    )
    .expect("Failed to ensure schema_version exists");
    conn.execute("DELETE FROM schema_version", [])
        .expect("Failed to clear schema_version");

    for v in 1..=max_inclusive {
        conn.execute(
            "INSERT OR IGNORE INTO schema_version (version) VALUES (?1)",
            params![v],
        )
        .expect("Failed to insert schema_version");
    }
}

/// Regression test: migration 038 must succeed even when inventory_transactions is absent.
///
/// Simulates a DB that has schema_version at 37 but is missing the
/// inventory_transactions table (e.g. due to a partial earlier migration run).
#[test]
fn test_migration_038_succeeds_without_inventory_transactions() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    // Initialise base schema (does NOT include inventory_transactions)
    db.init().expect("Failed to init schema");

    // Drop the table in case it appeared in the base schema in the future
    {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute_batch("DROP TABLE IF EXISTS inventory_transactions;")
            .expect("Failed to drop inventory_transactions");
    }

    // Pretend migrations 1-37 have already been applied
    {
        let conn = db.get_connection().expect("Failed to get connection");
        reset_schema_version_to(&conn, 37);
    }

    // Applying migration 38 must not panic or return an error
    db.migrate(38)
        .expect("Migration 038 must succeed even when inventory_transactions was absent");

    // Verify the table and the new composite index now exist
    let conn = db.get_connection().expect("Failed to get connection");

    let table_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventory_transactions'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to query sqlite_master for table");
    assert_eq!(
        table_exists, 1,
        "inventory_transactions table must exist after migration 038"
    );

    let index_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_inventory_transactions_material_performed_at'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to query sqlite_master for index");
    assert_eq!(
        index_exists, 1,
        "composite index must exist after migration 038"
    );
}

/// Idempotency test: running migration 038 twice must not error.
#[test]
fn test_migration_038_is_idempotent() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.init().expect("Failed to init schema");

    // First run: apply all migrations up to 38
    let latest = Database::get_latest_migration_version();
    db.migrate(latest)
        .expect("First migration run must succeed");

    // Second run: migrate(38) again must be a no-op (current_version >= 38)
    db.migrate(38)
        .expect("Second migration 038 run must be idempotent");
}

/// Regression test: migration 039 must succeed even when material_categories is absent.
///
/// Simulates a DB that has schema_version at 38 but is missing the
/// material_categories table (e.g. due to a partial earlier migration run).
#[test]
fn test_migration_039_succeeds_without_material_categories() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    // Initialise base schema. schema.sql pre-populates schema_version up to its
    // declared baseline (currently 1..39), so we must remove version 39 to allow
    // migrate(39) to actually execute rather than treat it as already applied.
    db.init().expect("Failed to init schema");

    // Drop the table to simulate a DB where migration 024 was skipped/partial
    {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute_batch("DROP TABLE IF EXISTS material_categories;")
            .expect("Failed to drop material_categories");
    }

    // Reset schema_version to exclude version 39: schema.sql pre-populates through version 39,
    // so we delete it to force migrate(39) to execute.
    {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute("DELETE FROM schema_version WHERE version >= 39", [])
            .expect("Failed to remove schema_version 39+");
    }

    // Applying migration 039 must not panic or return an error
    db.migrate(39)
        .expect("Migration 039 must succeed even when material_categories was absent");

    // Verify material_categories and its indexes now exist
    let conn = db.get_connection().expect("Failed to get connection");

    let table_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='material_categories'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to query sqlite_master for table");
    assert_eq!(
        table_exists, 1,
        "material_categories table must exist after migration 039"
    );

    let index_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_material_categories_created_by'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to query sqlite_master for index");
    assert_eq!(
        index_exists, 1,
        "idx_material_categories_created_by index must exist after migration 039"
    );
}

/// Idempotency test: running migration 039 twice must not error.
#[test]
fn test_migration_039_is_idempotent() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.init().expect("Failed to init schema");

    // First run: apply all migrations up to 39
    let latest = Database::get_latest_migration_version();
    db.migrate(latest)
        .expect("First migration run must succeed");

    // Second run: migrate(39) again must be a no-op (current_version >= 39)
    db.migrate(39)
        .expect("Second migration 039 run must be idempotent");
}

/// Regression test: migration 040 must succeed on a fresh DB where user_sessions
/// never existed (schema.sql starts with the `sessions` table instead).
///
/// This guards against the startup crash:
///   "Failed to execute migration SQL for version 40: no such table: main.user_sessions"
#[test]
fn test_migration_040_succeeds_on_fresh_db() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    // schema.sql now marks versions 1..43 as baseline; remove 40..43 so that
    // migrate(40) actually executes.
    db.init().expect("Failed to init schema");
    {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute("DELETE FROM schema_version WHERE version >= 40", [])
            .expect("Failed to remove schema_version 40+");
    }

    // On a fresh DB user_sessions does not exist — the custom handler must
    // skip that index gracefully and still record version 40.
    db.migrate(40)
        .expect("Migration 040 must succeed on a fresh DB without user_sessions");

    // Confirm that the inventory_transactions index was created.
    let conn = db.get_connection().expect("Failed to get connection");
    let index_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master \
             WHERE type='index' AND name='idx_inventory_transactions_reference_type_number'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to query sqlite_master for index");
    assert_eq!(
        index_exists, 1,
        "idx_inventory_transactions_reference_type_number must exist after migration 040"
    );

    // Confirm version 40 is recorded.
    let version_recorded: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM schema_version WHERE version = 40",
            [],
            |row| row.get(0),
        )
        .expect("Failed to query schema_version");
    assert_eq!(version_recorded, 1, "schema_version must include 40");
}

/// Regression test: migration 040 must also succeed on an older DB that still has
/// the user_sessions table (upgrade path).
#[test]
fn test_migration_040_succeeds_with_user_sessions() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.init().expect("Failed to init schema");

    // Simulate an older DB: create user_sessions and set schema_version to 39.
    {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                last_activity INTEGER NOT NULL DEFAULT 0
            );",
        )
        .expect("Failed to create user_sessions");
        conn.execute("DELETE FROM schema_version WHERE version >= 40", [])
            .expect("Failed to reset schema_version to 39");
    }

    // Migration 040 should create the index on user_sessions without error.
    db.migrate(40)
        .expect("Migration 040 must succeed when user_sessions is present");

    let conn = db.get_connection().expect("Failed to get connection");
    let index_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master \
             WHERE type='index' AND name='idx_user_sessions_last_activity_user'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to query sqlite_master for index");
    assert_eq!(
        index_exists, 1,
        "idx_user_sessions_last_activity_user must exist after migration 040 on an upgraded DB"
    );
}

/// Idempotency test: running migration 040 twice must not error.
#[test]
fn test_migration_040_is_idempotent() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.init().expect("Failed to init schema");

    // First run: apply all migrations up to latest
    let latest = Database::get_latest_migration_version();
    db.migrate(latest)
        .expect("First migration run must succeed");

    // Second run: migrate(40) again must be a no-op (current_version >= 40)
    db.migrate(40)
        .expect("Second migration 040 run must be idempotent");
}

/// Regression test: migration 046 must ensure the legacy signup trigger is absent.
#[test]
fn test_migration_046_removes_user_settings_signup_trigger() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.init().expect("Failed to init schema");
    let latest = Database::get_latest_migration_version();
    db.migrate(latest)
        .expect("Migration run must succeed up to latest");

    let conn = db.get_connection().expect("Failed to get connection");
    let trigger_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='user_insert_create_settings'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to query sqlite_master for trigger");
    assert_eq!(
        trigger_exists, 0,
        "user_insert_create_settings trigger must be absent after migration 046"
    );
}

/// Idempotency test: rerunning migrate(046) must remain a no-op.
#[test]
fn test_migration_046_is_idempotent() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.init().expect("Failed to init schema");
    let latest = Database::get_latest_migration_version();
    db.migrate(latest)
        .expect("First migration run must succeed");

    db.migrate(46)
        .expect("Second migration 046 run must be idempotent");
}

/// Regression test: legacy user_settings schemas must not block users inserts after 046.
#[test]
fn test_migration_046_unblocks_users_insert_on_legacy_user_settings_schema() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");
    db.init().expect("Failed to init schema");

    {
        let conn = db.get_connection().expect("Failed to get connection");
        // Simulate old/partial schema drift for user_settings.
        conn.execute_batch(
            r#"
            DROP TABLE IF EXISTS user_settings;
            CREATE TABLE user_settings (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL UNIQUE
            );
            "#,
        )
        .expect("Failed to create legacy user_settings schema");
        reset_schema_version_to(&conn, 43);
    }

    // Apply 044/045 so the trigger exists.
    db.migrate(45)
        .expect("Migration 045 must apply in legacy-schema test setup");

    {
        let conn = db.get_connection().expect("Failed to get connection");
        let trigger_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='user_insert_create_settings'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to query sqlite_master for trigger");
        assert_eq!(
            trigger_exists, 1,
            "user_insert_create_settings trigger must exist after migration 045"
        );
    }

    {
        let conn = db.get_connection().expect("Failed to get connection");
        let result = conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, full_name, role, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, (unixepoch() * 1000), (unixepoch() * 1000))",
            params![
                "legacy-trigger-fail-user",
                "legacy-trigger-fail@example.com",
                "legacy_trigger_fail",
                "hash",
                "Legacy",
                "Fail",
                "Legacy Fail",
                "viewer",
            ],
        );
        assert!(
            result.is_err(),
            "users insert should fail while legacy trigger depends on missing user_settings columns"
        );
    }

    // Drop trigger via migration 046 and verify insert now succeeds.
    db.migrate(46)
        .expect("Migration 046 must drop signup trigger on legacy schema");

    {
        let conn = db.get_connection().expect("Failed to get connection");
        let trigger_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='user_insert_create_settings'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to query sqlite_master for trigger");
        assert_eq!(
            trigger_exists, 0,
            "user_insert_create_settings trigger must be absent after migration 046"
        );
    }

    {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, full_name, role, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, (unixepoch() * 1000), (unixepoch() * 1000))",
            params![
                "legacy-trigger-pass-user",
                "legacy-trigger-pass@example.com",
                "legacy_trigger_pass",
                "hash",
                "Legacy",
                "Pass",
                "Legacy Pass",
                "viewer",
            ],
        )
        .expect("users insert should succeed once migration 046 removes the trigger");
    }
}

#[test]
fn migrations_fresh_db() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.init().expect("Failed to init schema on fresh DB");

    // Force sequential replay from baseline schema state.
    {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute("DELETE FROM schema_version", [])
            .expect("Failed to clear schema_version");
    }

    let latest = Database::get_latest_migration_version();
    db.migrate(latest)
        .expect("Full migration sequence must succeed on a fresh DB");
    db.ensure_required_views()
        .expect("Required views must be recreated after migration");

    let conn = db.get_connection().expect("Failed to get connection");

    for table in [
        "interventions",
        "tasks",
        "sessions",
        "notifications",
        "schema_version",
    ] {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                params![table],
                |row| row.get(0),
            )
            .expect("Failed to query sqlite_master for table");
        assert_eq!(exists, 1, "Expected table '{}' to exist", table);
    }

    for view in ["client_statistics", "calendar_tasks"] {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name=?1",
                params![view],
                |row| row.get(0),
            )
            .expect("Failed to query sqlite_master for view");
        assert_eq!(exists, 1, "Expected view '{}' to exist", view);
    }

    for trigger in ["validate_sessions_role"] {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name=?1",
                params![trigger],
                |row| row.get(0),
            )
            .expect("Failed to query sqlite_master for trigger");
        assert_eq!(exists, 1, "Expected trigger '{}' to exist", trigger);
    }

    // Confirm the DB reached the latest version.
    let version = db.get_version().expect("Failed to get version");
    assert_eq!(
        version, latest,
        "DB version must equal the latest migration version after a full run"
    );
}

/// Schema drift detection: a fresh DB created via schema.sql must contain
/// the same set of tables, views, indexes, and triggers as one that is
/// constructed purely through initialize_or_migrate().
#[test]
fn test_schema_drift_fresh_vs_initialize_or_migrate() {
    // --- Database A: fresh install via initialize_or_migrate ---
    let temp_a = NamedTempFile::new().expect("temp A");
    let db_a = Database::new(temp_a.path(), "").expect("db A");
    db_a.initialize_or_migrate()
        .expect("initialize_or_migrate must succeed on an empty DB");

    // --- Database B: init() + migrate(latest) + ensure_required_views ---
    let temp_b = NamedTempFile::new().expect("temp B");
    let db_b = Database::new(temp_b.path(), "").expect("db B");
    db_b.init().expect("init schema");
    let latest = Database::get_latest_migration_version();
    db_b.migrate(latest).expect("migrate to latest");
    db_b.ensure_required_views().expect("ensure views");

    let conn_a = db_a.get_connection().expect("conn A");
    let conn_b = db_b.get_connection().expect("conn B");

    // Helper: collect sorted list of (type, name) from sqlite_master
    fn schema_objects(conn: &rusqlite::Connection) -> Vec<(String, String)> {
        let mut stmt = conn
            .prepare(
                "SELECT type, name FROM sqlite_master \
                 WHERE name NOT LIKE 'sqlite_%' \
                 ORDER BY type, name",
            )
            .expect("prepare");
        let rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .expect("query_map")
            .filter_map(|r| r.ok())
            .collect();
        rows
    }

    let objects_a = schema_objects(&conn_a);
    let objects_b = schema_objects(&conn_b);

    // Both databases must have the same schema objects
    assert_eq!(
        objects_a,
        objects_b,
        "Schema drift detected: fresh DB (initialize_or_migrate) differs from init+migrate.\n\
         Only in A: {:?}\nOnly in B: {:?}",
        objects_a
            .iter()
            .filter(|o| !objects_b.contains(o))
            .collect::<Vec<_>>(),
        objects_b
            .iter()
            .filter(|o| !objects_a.contains(o))
            .collect::<Vec<_>>(),
    );
}

/// Verify that schema_version is properly populated on a fresh database
/// created via initialize_or_migrate.
#[test]
fn test_schema_version_fully_populated_on_fresh_db() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.initialize_or_migrate()
        .expect("initialize_or_migrate must succeed on fresh DB");

    let latest = Database::get_latest_migration_version();
    let version = db.get_version().expect("Failed to get version");
    assert_eq!(
        version, latest,
        "schema_version must be at latest ({}) after fresh initialize_or_migrate",
        latest,
    );

    // Verify all versions 1..latest are present
    let conn = db.get_connection().expect("conn");
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM schema_version", [], |row| row.get(0))
        .expect("count schema_version");
    assert_eq!(
        count, latest as i64,
        "schema_version must contain exactly {} rows (one per migration)",
        latest,
    );
}

/// Verify that ensure_required_views is called during initialize_or_migrate
/// and that the views exist.
#[test]
fn test_ensure_required_views_after_initialize_or_migrate() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.initialize_or_migrate()
        .expect("initialize_or_migrate must succeed");

    let conn = db.get_connection().expect("conn");
    for view in ["client_statistics", "calendar_tasks"] {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name=?1",
                params![view],
                |row| row.get(0),
            )
            .expect("query view");
        assert_eq!(
            exists, 1,
            "View '{}' must exist after initialize_or_migrate",
            view
        );
    }
}

/// Verify no user_sessions table exists on a fresh database.
#[test]
fn test_no_user_sessions_on_fresh_db() {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::new(temp_file.path(), "").expect("Failed to create database");

    db.initialize_or_migrate()
        .expect("initialize_or_migrate must succeed");

    let conn = db.get_connection().expect("conn");
    let user_sessions_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user_sessions'",
            [],
            |row| row.get(0),
        )
        .expect("query");
    assert_eq!(
        user_sessions_exists, 0,
        "user_sessions table must not exist on a fresh database"
    );

    // sessions table should exist
    let sessions_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sessions'",
            [],
            |row| row.get(0),
        )
        .expect("query");
    assert_eq!(
        sessions_exists, 1,
        "sessions table must exist on a fresh database"
    );
}
