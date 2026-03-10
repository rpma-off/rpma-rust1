//! Session resolver — the single place where a raw session token is
//! turned into a [`RequestContext`].
//!
//! All session validation MUST happen here.  IPC handlers call
//! [`resolve_request_context`] (or the [`resolve_context!`] macro) and
//! then pass the resulting `RequestContext` downstream.
//!
//! **No service or repository may ever see a session token.**

use crate::shared::app_state::AppStateType;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::ipc::correlation::{init_correlation_context, update_correlation_context_user};
use crate::shared::ipc::{AppError, AppResult};
use sha2::{Digest, Sha256};
use tracing::{debug, instrument, warn};

use super::auth_context::AuthContext;
use super::request_context::RequestContext;

/// Validate `session_token`, enforce an optional role requirement, set up
/// correlation context, and return a fully-populated [`RequestContext`].
///
/// This is the **only** entry point for session validation in the
/// application.  The `authenticate!` macro delegates here.
#[instrument(skip(app), fields(token_hash = %format!("{:x}", Sha256::digest(session_token.as_bytes()))))]
pub fn resolve_request_context(
    app: &AppStateType,
    session_token: &str,
    required_role: Option<UserRole>,
    correlation_id: &Option<String>,
) -> AppResult<RequestContext> {
    // ── 1. Validate token ────────────────────────────────────────────
    if session_token.is_empty() {
        return Err(AppError::Authentication(
            "Session token is required".to_string(),
        ));
    }

    debug!("Resolving request context");

    let auth_service = app.auth_service.clone();
    let session: UserSession = auth_service.validate_session(session_token).map_err(|e| {
        warn!("Session validation failed: {}", e);
        AppError::Authentication(format!("Session validation failed: {}", e))
    })?;

    // ── 2. RBAC gate ─────────────────────────────────────────────────
    if let Some(ref required) = required_role {
        if !crate::shared::auth_middleware::AuthMiddleware::has_permission(
            &session.role,
            required,
        ) {
            warn!(
                "Authorization failed for user {} with role {:?}, required {:?}",
                session.user_id, session.role, required
            );
            return Err(AppError::Authorization(
                "Insufficient permissions for this operation".to_string(),
            ));
        }
    }

    // ── 3. Correlation context ───────────────────────────────────────
    let corr_id = init_correlation_context(correlation_id, Some(&session.user_id));
    update_correlation_context_user(&session.user_id);

    debug!(
        user_id = %session.user_id,
        correlation_id = %corr_id,
        "Request context resolved"
    );

    // ── 4. Build context ─────────────────────────────────────────────
    Ok(RequestContext::new(
        AuthContext::from_session(&session),
        corr_id,
    ))
}

/// Convenience: resolve without a role requirement.
pub fn resolve_request_context_any_role(
    app: &AppStateType,
    session_token: &str,
    correlation_id: &Option<String>,
) -> AppResult<RequestContext> {
    resolve_request_context(app, session_token, None, correlation_id)
}

/// Macro for resolving a [`RequestContext`] inside `#[tauri::command]` handlers.
///
/// # Variants
///
/// ```ignore
/// // authenticate any logged-in user
/// let ctx = resolve_context!(session_token, state, correlation_id);
///
/// // authenticate with a minimum role
/// let ctx = resolve_context!(session_token, state, correlation_id, UserRole::Admin);
/// ```
#[macro_export]
macro_rules! resolve_context {
    ($session_token:expr, $state:expr, $correlation_id:expr) => {
        $crate::shared::context::session_resolver::resolve_request_context(
            $state,
            $session_token,
            None,
            $correlation_id,
        )?
    };
    ($session_token:expr, $state:expr, $correlation_id:expr, $required_role:expr) => {
        $crate::shared::context::session_resolver::resolve_request_context(
            $state,
            $session_token,
            Some($required_role),
            $correlation_id,
        )?
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_token_is_rejected() {
        // We cannot construct a real AppStateType in a unit test, but we
        // can verify the guard fires before any service call.
        let result = resolve_request_context(
            // SAFETY: we expect an early return before the pointer is dereferenced.
            // This test only verifies the empty-token guard.
            unsafe { &*(std::ptr::null::<AppStateType>()) },
            "",
            None,
            &None,
        );
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::Authentication(msg) => assert!(msg.contains("required")),
            other => panic!("Expected Authentication error, got {:?}", other),
        }
    }
}
