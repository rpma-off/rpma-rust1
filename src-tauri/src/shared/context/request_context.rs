//! Per-request context carrying authentication and correlation data.
//!
//! Every authenticated IPC command resolves a `RequestContext` once at the
//! boundary.  It is then threaded through application services so they
//! can perform RBAC, audit logging and correlation without ever seeing
//! the raw session token.

use crate::shared::contracts::auth::UserRole;

use super::auth_context::AuthContext;

/// Context for the current request, resolved at the IPC boundary.
///
/// * `auth`           — the caller's identity and role
/// * `correlation_id` — opaque id for distributed tracing
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub auth: AuthContext,
    pub correlation_id: String,
}

impl RequestContext {
    /// Create a new request context.
    pub fn new(auth: AuthContext, correlation_id: String) -> Self {
        Self {
            auth,
            correlation_id,
        }
    }

    /// Create a minimal context for pre-authentication (bootstrap) checks.
    ///
    /// Intended for IPC commands that run before any session exists (e.g.
    /// `HasAdmins`).  The resulting context carries an empty `AuthContext`
    /// with `UserRole::Viewer` and must NEVER be used for RBAC-enforcing
    /// commands.
    pub fn unauthenticated(correlation_id: String) -> Self {
        Self {
            auth: AuthContext {
                user_id: String::new(),
                role: UserRole::Viewer,
                session_id: String::new(),
                username: String::new(),
                email: String::new(),
            },
            correlation_id,
        }
    }

    // ── convenience accessors ────────────────────────────────────────

    /// Shorthand for `self.auth.user_id`.
    #[inline]
    pub fn user_id(&self) -> &str {
        &self.auth.user_id
    }

    /// Shorthand for `self.auth.role`.
    #[inline]
    pub fn role(&self) -> &UserRole {
        &self.auth.role
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::auth::domain::models::auth::{UserRole, UserSession};

    #[test]
    fn convenience_accessors() {
        let session = UserSession::new(
            "u1".into(),
            "bob".into(),
            "bob@x.com".into(),
            UserRole::Admin,
            "tok".into(),
            3600,
        );
        let ctx = RequestContext::new(AuthContext::from(&session), "corr-1".into());

        assert_eq!(ctx.user_id(), "u1");
        assert_eq!(*ctx.role(), UserRole::Admin);
        assert_eq!(ctx.correlation_id, "corr-1");
    }

    #[test]
    fn unauthenticated_context_has_empty_auth() {
        let ctx = RequestContext::unauthenticated("corr-bootstrap".into());
        assert_eq!(ctx.user_id(), "");
        assert_eq!(*ctx.role(), UserRole::Viewer);
        assert_eq!(ctx.correlation_id, "corr-bootstrap");
    }
}
