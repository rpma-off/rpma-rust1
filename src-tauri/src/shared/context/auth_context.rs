//! Authentication context extracted from a validated session.
//!
//! `AuthContext` is the identity slice that application services and
//! domain logic may inspect.  It is always constructed by the session
//! resolver after successful token validation — never by hand in
//! production code.

use crate::shared::contracts::auth::{UserRole, UserSession};

/// Immutable authentication identity for the current request.
///
/// Constructed exclusively by [`super::session_resolver::resolve_request_context`].
/// Services use this to perform RBAC checks and audit logging without
/// ever touching the raw session token.
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: String,
    pub role: UserRole,
    pub session_id: String,
    pub username: String,
    pub email: String,
}

impl AuthContext {
    /// Build an `AuthContext` from a validated [`UserSession`].
    pub(crate) fn from_session(session: &UserSession) -> Self {
        Self {
            user_id: session.user_id.clone(),
            role: session.role.clone(),
            session_id: session.id.clone(),
            username: session.username.clone(),
            email: session.email.clone(),
        }
    }

    /// Reconstruct a [`UserSession`] from this context.
    ///
    /// Useful when downstream APIs still accept `&UserSession`. The
    /// returned session carries a synthetic token and a far-future
    /// expiry — it MUST NOT be used for authentication.
    pub fn to_user_session(&self) -> UserSession {
        UserSession::new(
            self.user_id.clone(),
            self.username.clone(),
            self.email.clone(),
            self.role.clone(),
            self.session_id.clone(),
            86_400,
        )
    }
}

impl From<&UserSession> for AuthContext {
    fn from(session: &UserSession) -> Self {
        Self::from_session(session)
    }
}

impl From<UserSession> for AuthContext {
    fn from(session: UserSession) -> Self {
        Self {
            user_id: session.user_id,
            role: session.role,
            session_id: session.id,
            username: session.username,
            email: session.email,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::auth::domain::models::auth::UserRole;

    fn sample_session() -> UserSession {
        UserSession::new(
            "user-1".into(),
            "alice".into(),
            "alice@example.com".into(),
            UserRole::Technician,
            "tok-abc".into(),
            3600,
        )
    }

    #[test]
    fn from_session_preserves_fields() {
        let s = sample_session();
        let ctx = AuthContext::from(&s);

        assert_eq!(ctx.user_id, "user-1");
        assert_eq!(ctx.role, UserRole::Technician);
        assert_eq!(ctx.session_id, s.id);
        assert_eq!(ctx.username, "alice");
        assert_eq!(ctx.email, "alice@example.com");
    }
}
