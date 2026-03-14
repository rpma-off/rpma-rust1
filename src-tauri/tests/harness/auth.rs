//! Authentication and request-context helpers for integration tests.
//!
//! Provides factory functions that build [`UserSession`] and
//! [`RequestContext`] values for every supported RBAC role without
//! touching the database or the session store.  The produced sessions
//! use a far-future expiry (year 2099) so tests never fail due to clock
//! skew.
//!
//! # Usage
//!
//! ```rust,no_run
//! use harness::auth;
//! use rpma_ppf_intervention::shared::contracts::auth::UserRole;
//!
//! let ctx = auth::admin_ctx();
//! assert_eq!(*ctx.role(), UserRole::Admin);
//!
//! // Inject into the session store when testing IPC-layer code:
//! // app.state.session_store.set(auth::make_session(UserRole::Technician));
//! ```

use rpma_ppf_intervention::shared::context::auth_context::AuthContext;
use rpma_ppf_intervention::shared::context::request_context::RequestContext;
use rpma_ppf_intervention::shared::contracts::auth::{UserRole, UserSession};
use uuid::Uuid;

// ── Session factory ──────────────────────────────────────────────────

/// Build a non-expiring [`UserSession`] for the given `role`.
///
/// The token and session ID are stable, human-readable identifiers
/// derived from the role name so failures are easy to diagnose.  The
/// session expires in the year 2099 — tests never need to worry about
/// timing.
pub fn make_session(role: UserRole) -> UserSession {
    let role_str = role.to_string();
    UserSession::new(
        format!("test-user-{role_str}"),
        format!("test_{role_str}"),
        format!("test_{role_str}@rpma.test"),
        role,
        format!("test-token-{role_str}"),
        // 10 years in seconds — effectively non-expiring for tests.
        86_400 * 365 * 10,
    )
}

// ── RequestContext factories ─────────────────────────────────────────

/// Build a [`RequestContext`] for `role` with an auto-generated UUID
/// correlation ID.
///
/// Each call produces a unique correlation ID so parallel tests remain
/// distinguishable in logs.
pub fn make_context(role: UserRole) -> RequestContext {
    let session = make_session(role);
    let corr = format!("test-{}", Uuid::new_v4());
    RequestContext::new(AuthContext::from(&session), corr)
}

/// Build a [`RequestContext`] for `role` with a caller-supplied
/// `correlation_id`.
///
/// Useful when tests need to assert on the exact correlation ID stored
/// in audit records or log output.
pub fn make_context_with_corr(role: UserRole, correlation_id: &str) -> RequestContext {
    let session = make_session(role);
    RequestContext::new(AuthContext::from(&session), correlation_id.to_string())
}

// ── Per-role shortcuts ───────────────────────────────────────────────

/// Admin [`RequestContext`] with a fixed, predictable correlation ID.
pub fn admin_ctx() -> RequestContext {
    make_context_with_corr(UserRole::Admin, "test-corr-admin")
}

/// Technician [`RequestContext`] with a fixed, predictable correlation ID.
pub fn technician_ctx() -> RequestContext {
    make_context_with_corr(UserRole::Technician, "test-corr-tech")
}

/// Supervisor [`RequestContext`] with a fixed, predictable correlation ID.
pub fn supervisor_ctx() -> RequestContext {
    make_context_with_corr(UserRole::Supervisor, "test-corr-supervisor")
}

/// Viewer [`RequestContext`] with a fixed, predictable correlation ID.
pub fn viewer_ctx() -> RequestContext {
    make_context_with_corr(UserRole::Viewer, "test-corr-viewer")
}
