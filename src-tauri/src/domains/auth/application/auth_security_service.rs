//! Application-layer service for auth security operations (ADR-018).
//!
//! Encapsulates session ownership verification, timeout validation,
//! and session revocation logic that was previously inline in IPC handlers.

use std::sync::Arc;
use tracing::{info, error};

use crate::commands::AppError;
use crate::domains::auth::infrastructure::session::SessionService;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;

/// Orchestrates security-related session operations.
pub struct AuthSecurityService {
    session_service: Arc<SessionService>,
}

impl AuthSecurityService {
    pub fn new(session_service: Arc<SessionService>) -> Self {
        Self { session_service }
    }

    /// Revoke a specific session, enforcing ownership rules:
    /// - Users can revoke their own sessions.
    /// - Only Admins can revoke other users' sessions.
    ///
    /// Returns `true` if the revoked session is the caller's current session.
    pub async fn revoke_session(
        &self,
        session_id: &str,
        ctx: &RequestContext,
    ) -> Result<bool, AppError> {
        let session = self
            .session_service
            .validate_session(session_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Session not found".to_string()))?;

        if session.user_id != ctx.auth.user_id && ctx.auth.role != UserRole::Admin {
            return Err(AppError::Authorization(
                "You can only revoke your own sessions".to_string(),
            ));
        }

        self.session_service
            .revoke_session(session_id)
            .await
            .map_err(|e| {
                error!(error = %e, session_id = %session_id, "Failed to revoke session");
                AppError::Internal("Failed to revoke session".to_string())
            })?;

        let is_current_session = session_id == ctx.auth.session_id;

        info!(session_id = %session_id, user_id = %ctx.auth.user_id, "Session revoked");
        Ok(is_current_session)
    }

    /// Validate and update session timeout configuration.
    pub async fn update_timeout(
        &self,
        timeout_minutes: u32,
    ) -> Result<String, AppError> {
        if timeout_minutes == 0 {
            return Err(AppError::Validation(
                "Timeout must be greater than 0 minutes".to_string(),
            ));
        }

        self.session_service
            .update_session_timeout(timeout_minutes)
            .await
            .map_err(|e| {
                error!(error = %e, timeout_minutes = timeout_minutes, "Failed to update session timeout");
                AppError::Internal("Failed to update session timeout".to_string())
            })?;

        info!(timeout_minutes = timeout_minutes, "Session timeout updated");
        Ok(format!(
            "Session timeout updated to {} minutes",
            timeout_minutes
        ))
    }

    /// Restore a session from the database using a token.
    ///
    /// Returns `Ok(session)` if valid, or an authentication error.
    pub async fn restore_session(
        &self,
        token: &str,
    ) -> Result<crate::shared::contracts::auth::UserSession, AppError> {
        match self.session_service.validate_session(token).await? {
            Some(s) => {
                info!("Session restored from database for user: {}", s.username);
                Ok(s)
            }
            None => Err(AppError::Authentication("Not authenticated".to_string())),
        }
    }
}
