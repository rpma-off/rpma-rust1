//! Smoke tests for the integration test harness.
//!
//! These tests verify that:
//! - [`TestApp`] initialises without panicking.
//! - All four role contexts carry the expected [`UserRole`].
//! - [`TestApp::inject_session`] / [`TestApp::clear_session`] work correctly.
//! - The database handle is live and queryable.
//! - The standalone helpers in `auth` and `fixtures` produce valid values.

mod harness;

use rpma_ppf_intervention::shared::contracts::auth::UserRole;

// ── TestApp construction ─────────────────────────────────────────────

#[tokio::test]
async fn test_app_new_initialises_without_panic() {
    let _app = harness::app::TestApp::new().await;
    // If we reach this line the ServiceBuilder wired successfully.
}

// ── Role contexts ────────────────────────────────────────────────────

#[tokio::test]
async fn test_app_admin_ctx_has_admin_role() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.admin_ctx();
    assert_eq!(*ctx.role(), UserRole::Admin);
}

#[tokio::test]
async fn test_app_technician_ctx_has_technician_role() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.technician_ctx();
    assert_eq!(*ctx.role(), UserRole::Technician);
}

#[tokio::test]
async fn test_app_supervisor_ctx_has_supervisor_role() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.supervisor_ctx();
    assert_eq!(*ctx.role(), UserRole::Supervisor);
}

#[tokio::test]
async fn test_app_viewer_ctx_has_viewer_role() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.viewer_ctx();
    assert_eq!(*ctx.role(), UserRole::Viewer);
}

// ── Session store ────────────────────────────────────────────────────

#[tokio::test]
async fn test_app_inject_session_makes_session_available() {
    let app = harness::app::TestApp::new().await;
    app.inject_session(UserRole::Admin);
    // Session store should now return a valid session.
    let session = app.state.session_store.get().expect("session should be present");
    assert_eq!(session.role, UserRole::Admin);
}

#[tokio::test]
async fn test_app_clear_session_removes_active_session() {
    let app = harness::app::TestApp::new().await;
    app.inject_session(UserRole::Admin);
    app.clear_session();
    // After clearing, the store should return an authentication error.
    let result = app.state.session_store.get();
    assert!(
        result.is_err(),
        "session store should be empty after clear_session()"
    );
}

// ── Database handle ──────────────────────────────────────────────────

#[tokio::test]
async fn test_app_db_is_queryable() {
    let app = harness::app::TestApp::new().await;
    // The tasks table must exist because all migrations have been applied.
    let count: i64 = app
        .db
        .query_single_value("SELECT COUNT(*) FROM tasks", [])
        .expect("tasks table should exist after migration");
    assert_eq!(count, 0, "fresh database should have zero tasks");
}

// ── Standalone auth helpers ──────────────────────────────────────────

#[test]
fn auth_make_session_produces_non_expired_session_for_admin() {
    use rpma_ppf_intervention::shared::contracts::auth::UserSession;
    let session: UserSession = harness::auth::make_session(UserRole::Admin);
    assert!(!session.is_expired(), "test session must not be expired");
    assert_eq!(session.role, UserRole::Admin);
}

#[test]
fn auth_make_context_has_unique_correlation_ids() {
    let ctx1 = harness::auth::make_context(UserRole::Technician);
    let ctx2 = harness::auth::make_context(UserRole::Technician);
    assert_ne!(
        ctx1.correlation_id, ctx2.correlation_id,
        "each make_context() call should produce a unique correlation ID"
    );
}

#[test]
fn auth_role_shortcuts_return_correct_roles() {
    assert_eq!(*harness::auth::admin_ctx().role(), UserRole::Admin);
    assert_eq!(*harness::auth::technician_ctx().role(), UserRole::Technician);
    assert_eq!(*harness::auth::supervisor_ctx().role(), UserRole::Supervisor);
    assert_eq!(*harness::auth::viewer_ctx().role(), UserRole::Viewer);
}

// ── Standalone fixtures ──────────────────────────────────────────────

#[test]
fn fixtures_client_fixture_has_correct_name() {
    let req = harness::fixtures::client_fixture("Acme Corp");
    assert_eq!(req.name, "Acme Corp");
    assert!(
        req.email.as_deref().unwrap_or("").contains("acme"),
        "email should be derived from name"
    );
}

#[test]
fn fixtures_task_fixture_has_correct_plate() {
    let req = harness::fixtures::task_fixture("TEST-001");
    assert_eq!(req.vehicle_plate, "TEST-001");
}

#[test]
fn fixtures_unique_id_produces_distinct_values() {
    let a = harness::fixtures::unique_id();
    let b = harness::fixtures::unique_id();
    assert_ne!(a, b);
}

// ── Database isolation ───────────────────────────────────────────────

#[tokio::test]
async fn two_test_apps_are_isolated() {
    let app1 = harness::app::TestApp::new().await;
    let app2 = harness::app::TestApp::new().await;

    // Insert a task directly into app1's database.
    app1.db
        .execute(
            "INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, \
             scheduled_date, status, created_at, updated_at) \
             VALUES ('isolation-test-id','TSK-ISO-001','Isolation task','ISO-1','Model','[\"hood\"]', \
             '2025-01-01T00:00:00Z','pending', \
             strftime('%s','now')*1000, strftime('%s','now')*1000)",
            [],
        )
        .expect("insert into app1");

    // app2's database must not see the row.
    let count: i64 = app2
        .db
        .query_single_value("SELECT COUNT(*) FROM tasks WHERE id='isolation-test-id'", [])
        .expect("query app2");
    assert_eq!(count, 0, "app2 database must be isolated from app1");
}
