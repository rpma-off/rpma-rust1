//! Migration 032 tests: FK for interventions.task_id -> tasks(id)

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_032_adds_intervention_task_fk() {
    let mut ctx =
        MigrationTestContext::at_version(31).expect("Failed to create migration test context");

    ctx.migrate_to_version(32)
        .expect("Failed to run migration 32");

    // Check that FK for task_id -> tasks(id) exists
    let has_task_fk: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_foreign_key_list('interventions') WHERE \"table\" = 'tasks' AND \"from\" = 'task_id'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check FK");

    assert_eq!(
        has_task_fk, 1,
        "interventions.task_id FK to tasks should exist"
    );
}
