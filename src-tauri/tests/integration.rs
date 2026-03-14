//! Integration test harness entry point.
//!
//! Run with: `cd src-tauri && cargo test --test integration -- --nocapture`
//!
//! This file is the `[[test]]` entry point for the shared harness.
//! Domain-specific integration tests live in `tests/commands/` and have
//! their own `[[test]]` entries in `Cargo.toml`.

mod harness;

use rpma_ppf_intervention::shared::contracts::auth::UserRole;

// ── Harness smoke tests ───────────────────────────────────────────────────────

#[tokio::test]
async fn test_harness_new_initialises_without_panic() {
    let _app = harness::app::TestApp::new().await;
}

#[tokio::test]
async fn test_harness_seeded_initialises_without_panic() {
    let _app = harness::app::TestApp::seeded().await;
}

#[tokio::test]
async fn test_harness_admin_ctx_has_admin_role() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.admin_ctx();
    assert_eq!(*ctx.role(), UserRole::Admin);
}

#[tokio::test]
async fn test_harness_technician_ctx_has_technician_role() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.technician_ctx();
    assert_eq!(*ctx.role(), UserRole::Technician);
}

#[tokio::test]
async fn test_harness_supervisor_ctx_has_supervisor_role() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.supervisor_ctx();
    assert_eq!(*ctx.role(), UserRole::Supervisor);
}

#[tokio::test]
async fn test_harness_viewer_ctx_has_viewer_role() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.viewer_ctx();
    assert_eq!(*ctx.role(), UserRole::Viewer);
}

#[tokio::test]
async fn test_harness_inject_and_clear_session() {
    let app = harness::app::TestApp::new().await;
    app.inject_session(UserRole::Admin);
    let session = app
        .state
        .session_store
        .get()
        .expect("session should be present after inject");
    assert_eq!(session.role, UserRole::Admin);

    app.clear_session();
    assert!(
        app.state.session_store.get().is_err(),
        "session store should be empty after clear_session()"
    );
}

#[tokio::test]
async fn test_harness_db_is_queryable() {
    let app = harness::app::TestApp::new().await;
    let count: i64 = app
        .db
        .query_single_value("SELECT COUNT(*) FROM tasks", [])
        .expect("tasks table should exist after migrations");
    assert_eq!(count, 0, "fresh database should have zero tasks");
}

#[tokio::test]
async fn test_harness_two_apps_are_isolated() {
    let app1 = harness::app::TestApp::new().await;
    let app2 = harness::app::TestApp::new().await;

    app1.db
        .execute(
            "INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, \
             scheduled_date, status, created_at, updated_at) \
             VALUES ('iso-test-id','TSK-ISO-001','Isolation task','ISO-1','Model','[\"hood\"]', \
             '2025-01-01T00:00:00Z','pending', \
             strftime('%s','now')*1000, strftime('%s','now')*1000)",
            [],
        )
        .expect("insert into app1");

    let count: i64 = app2
        .db
        .query_single_value(
            "SELECT COUNT(*) FROM tasks WHERE id='iso-test-id'",
            [],
        )
        .expect("query app2");
    assert_eq!(count, 0, "app2 database must be isolated from app1");
}

// ── Fixture helpers ───────────────────────────────────────────────────────────

#[test]
fn test_fixtures_client_fixture_has_correct_name() {
    let req = harness::fixtures::client_fixture("Acme Corp");
    assert_eq!(req.name, "Acme Corp");
}

#[test]
fn test_fixtures_task_fixture_has_correct_plate() {
    let req = harness::fixtures::task_fixture("TEST-001");
    assert_eq!(req.vehicle_plate, "TEST-001");
}

#[test]
fn test_fixtures_unique_id_produces_distinct_values() {
    let a = harness::fixtures::unique_id();
    let b = harness::fixtures::unique_id();
    assert_ne!(a, b);
}
