//! Shared authentication guard for IPC command adapters.

use crate::shared::app_state::AppState;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::AppResult;

/// Thin authentication helper used by IPC adapters to resolve a `RequestContext`.
pub struct AuthGuard;

impl AuthGuard {
    /// Resolves a `RequestContext` for any authenticated user regardless of role.
    pub fn require_authenticated(
        state: &AppState<'_>,
        correlation_id: &Option<String>,
    ) -> AppResult<RequestContext> {
        crate::shared::context::session_resolver::resolve_request_context(state, None, correlation_id)
    }

    /// Resolves a `RequestContext` and verifies the caller holds the given role.
    pub fn require_role(
        state: &AppState<'_>,
        required_role: UserRole,
        correlation_id: &Option<String>,
    ) -> AppResult<RequestContext> {
        crate::shared::context::session_resolver::resolve_request_context(
            state,
            Some(required_role),
            correlation_id,
        )
    }
}
