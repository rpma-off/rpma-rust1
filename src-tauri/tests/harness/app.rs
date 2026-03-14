//! Central test application fixture.
//!
//! [`TestApp`] wires the complete backend — database, repositories, and
//! all services — through the same [`ServiceBuilder`] path that
//! production startup uses.  The only difference is the underlying
//! SQLite database: each `TestApp::new()` call receives a fresh,
//! isolated in-memory instance so tests are fully deterministic and
//! never interfere with each other.
//!
//! # Role contexts
//!
//! `TestApp` provides a pre-built [`RequestContext`] for every
//! supported RBAC role.  These contexts use non-expiring sessions
//! (year 2099) so tests never fail due to clock skew.
//!
//! # Session store injection
//!
//! IPC command handlers call `resolve_context!(state, correlation_id)`
//! which reads from `state.session_store`.  Use [`TestApp::inject_session`]
//! before invoking such handlers so the store contains a valid session
//! for the desired role.
//!
//! # Example
//!
//! ```rust,no_run
//! mod harness;
//!
//! #[tokio::test]
//! async fn example() {
//!     let app = harness::app::TestApp::new().await;
//!
//!     // Direct service call (preferred — no session store needed):
//!     let ctx = app.admin_ctx();
//!     // app.state.task_service.list_tasks(..., &ctx).expect("list tasks");
//!
//!     // IPC-layer call (needs a session in the store):
//!     app.inject_session(rpma_ppf_intervention::shared::contracts::auth::UserRole::Admin);
//!     // let result = some_ipc_command(&app.state, ...).await;
//! }
//! ```

use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::service_builder::ServiceBuilder;
use rpma_ppf_intervention::shared::app_state::AppStateType;
use rpma_ppf_intervention::shared::context::request_context::RequestContext;
use rpma_ppf_intervention::shared::contracts::auth::UserRole;
use std::sync::Arc;

use super::{auth, fixtures};

/// Fully wired backend fixture for integration tests.
///
/// Each instance is backed by its own isolated in-memory SQLite database
/// so tests running in parallel cannot affect each other.
pub struct TestApp {
    /// The complete application state, wired identically to production.
    ///
    /// All service fields are `pub` on [`AppStateType`], so tests can
    /// reach any service directly:
    ///
    /// ```rust,no_run
    /// app.state.task_service.list_tasks(...)
    /// app.state.quote_service.create_quote(...)
    /// ```
    pub state: AppStateType,

    /// Direct handle to the underlying in-memory database.
    ///
    /// Use this for low-level assertions — e.g. counting rows, checking
    /// raw column values — without going through a service layer.
    pub db: Arc<Database>,
}

impl TestApp {
    /// Build a fresh [`TestApp`] backed by an isolated in-memory database.
    ///
    /// Uses [`ServiceBuilder`] so every service, repository, session
    /// store, and event bus are initialized in the canonical dependency
    /// order used by the production binary.
    ///
    /// # Panics
    ///
    /// Panics if the database cannot be created or if service
    /// initialization fails.  Both conditions indicate a broken
    /// environment, not a test failure.
    pub async fn new() -> Self {
        Self::build().await
    }

    /// Build a [`TestApp`] with standard seed data already inserted.
    ///
    /// Seeds one client (`"Seeded Client"`) and one task (`"SEED-001"`)
    /// using the same service path as production, so the DB reflects a
    /// realistic starting state without manual row insertion.
    ///
    /// Use this when a test needs pre-existing entities to operate on
    /// (e.g. updating a client, creating a quote for an existing task).
    /// Use [`TestApp::new`] when the test wants a completely empty DB.
    ///
    /// # Panics
    ///
    /// Panics if any seed operation fails.
    pub async fn seeded() -> Self {
        let app = Self::build().await;
        let admin_id = "test-user-Admin";

        app.state
            .client_service
            .create_client(fixtures::client_fixture("Seeded Client"), admin_id)
            .await
            .expect("harness: failed to seed client");

        app.state
            .task_service
            .create_task_async(fixtures::task_fixture("SEED-001"), admin_id)
            .await
            .expect("harness: failed to seed task");

        app
    }

    async fn build() -> Self {
        let db = Arc::new(
            Database::new_in_memory()
                .await
                .expect("harness: failed to create in-memory database"),
        );
        let repos = Arc::new(
            rpma_ppf_intervention::shared::repositories::Repositories::new(db.clone(), 64).await,
        );
        let state = ServiceBuilder::new(db.clone(), repos, std::env::temp_dir())
            .build()
            .expect("harness: ServiceBuilder::build failed");

        Self { db, state }
    }

    // ── RequestContext shortcuts ─────────────────────────────────────

    /// Admin [`RequestContext`] with correlation ID `"test-corr-admin"`.
    pub fn admin_ctx(&self) -> RequestContext {
        auth::make_context_with_corr(UserRole::Admin, "test-corr-admin")
    }

    /// Technician [`RequestContext`] with correlation ID `"test-corr-tech"`.
    pub fn technician_ctx(&self) -> RequestContext {
        auth::make_context_with_corr(UserRole::Technician, "test-corr-tech")
    }

    /// Supervisor [`RequestContext`] with correlation ID `"test-corr-supervisor"`.
    pub fn supervisor_ctx(&self) -> RequestContext {
        auth::make_context_with_corr(UserRole::Supervisor, "test-corr-supervisor")
    }

    /// Viewer [`RequestContext`] with correlation ID `"test-corr-viewer"`.
    pub fn viewer_ctx(&self) -> RequestContext {
        auth::make_context_with_corr(UserRole::Viewer, "test-corr-viewer")
    }

    /// [`RequestContext`] for any `role`, with an auto-generated correlation ID.
    ///
    /// Useful when a test is parameterised over roles or needs a role that
    /// does not have its own dedicated shortcut method.
    pub fn ctx_for_role(&self, role: UserRole) -> RequestContext {
        auth::make_context(role)
    }

    // ── Session store helpers ────────────────────────────────────────

    /// Inject a session for `role` into the session store.
    ///
    /// This is required before calling any IPC handler that resolves
    /// the current session via `resolve_context!(state, …)`.  The
    /// injected session never expires.
    pub fn inject_session(&self, role: UserRole) {
        self.state.session_store.set(auth::make_session(role));
    }

    /// Clear the active session from the session store.
    ///
    /// Use this to simulate an unauthenticated caller when testing
    /// commands that should return `AppError::Authentication`.
    pub fn clear_session(&self) {
        self.state.session_store.clear();
    }
}
