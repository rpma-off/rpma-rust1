//! Session resolver — the single place where a raw session token is
//! turned into a [`RequestContext`].
//!
//! All session validation MUST happen here.  IPC handlers call
//! [`resolve_request_context`] (or the [`resolve_context!`] macro) and
//! then pass the resulting `RequestContext` downstream.
//!
//! **No service or repository may ever see a session token.**

use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::ipc::correlation::{init_correlation_context, update_correlation_context_user};
use crate::shared::ipc::{AppError, AppResult};
use tracing::{debug, instrument, warn};

use super::AppContext;
use super::auth_context::AuthContext;
use super::request_context::RequestContext;

/// Resolve a [`RequestContext`] from the active in-memory session.
#[instrument(skip(app))]
pub fn resolve_context(app: &AppContext) -> AppResult<RequestContext> {
    resolve_request_context(app, None, &None)
}

/// Resolve the active session, enforce an optional role requirement, set up
/// correlation context, and return a fully-populated [`RequestContext`].
#[instrument(skip(app))]
pub fn resolve_request_context(
    app: &AppContext,
    required_role: Option<UserRole>,
    correlation_id: &Option<String>,
) -> AppResult<RequestContext> {
    // ── 1. Validate token ────────────────────────────────────────────
    debug!("Resolving request context from session store");

    let session: UserSession = app.session_store.get().map_err(|e| {
        warn!("Session resolution failed: {}", e);
        e
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
    app: &AppContext,
    correlation_id: &Option<String>,
) -> AppResult<RequestContext> {
    resolve_request_context(app, None, correlation_id)
}

/// Macro for resolving a [`RequestContext`] inside `#[tauri::command]` handlers.
///
/// # Variants
///
/// ```ignore
/// // authenticate any logged-in user
/// let ctx = resolve_context!(state, correlation_id);
///
/// // authenticate with a minimum role
/// let ctx = resolve_context!(state, correlation_id, UserRole::Admin);
/// ```
#[macro_export]
macro_rules! resolve_context {
    ($state:expr, $correlation_id:expr) => {
        $crate::shared::context::session_resolver::resolve_request_context(
            $state,
            None,
            $correlation_id,
        )?
    };
    ($state:expr, $correlation_id:expr, $required_role:expr) => {
        $crate::shared::context::session_resolver::resolve_request_context(
            $state,
            Some($required_role),
            $correlation_id,
        )?
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn missing_session_is_rejected() {
        let db = std::sync::Arc::new(crate::db::Database::new_in_memory().await.expect("db"));
        let repositories =
            std::sync::Arc::new(crate::shared::repositories::Repositories::new(db.clone(), 1000).await);
        let app_data_dir = std::path::PathBuf::from("/tmp/test");
        let app_state = crate::service_builder::ServiceBuilder::new(db, repositories, app_data_dir)
            .build()
            .expect("build app state");

        let result = resolve_request_context(&app_state, None, &None);
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::Authentication(msg) => assert!(msg.to_lowercase().contains("not")),
            other => panic!("Expected Authentication error, got {:?}", other),
        }
    }
}
