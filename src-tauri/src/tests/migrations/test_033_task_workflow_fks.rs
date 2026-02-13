//! Migration 033 tests: FKs for tasks.workflow_id and tasks.current_workflow_step_id

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_033_adds_task_workflow_fks() {
    let mut ctx =
        MigrationTestContext::at_version(32).expect("Failed to create migration test context");

    ctx.migrate_to_version(33)
        .expect("Failed to run migration 33");

    // Check that FK for workflow_id -> interventions(id) exists
    let has_workflow_fk: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_foreign_key_list('tasks') WHERE \"table\" = 'interventions' AND \"from\" = 'workflow_id'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check workflow FK");

    assert_eq!(
        has_workflow_fk, 1,
        "tasks.workflow_id FK to interventions should exist"
    );

    // Check that FK for current_workflow_step_id -> intervention_steps(id) exists
    let has_step_fk: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_foreign_key_list('tasks') WHERE \"table\" = 'intervention_steps' AND \"from\" = 'current_workflow_step_id'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check step FK");

    assert_eq!(
        has_step_fk, 1,
        "tasks.current_workflow_step_id FK to intervention_steps should exist"
    );
}
