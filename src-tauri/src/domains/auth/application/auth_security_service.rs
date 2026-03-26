//! Application-layer service for auth security operations (ADR-018).
//!
//! Encapsulates session ownership verification, timeout validation,
//! and session revocation logic that was previously inline in IPC handlers.
//!
//! Input validation is delegated to `AuthInputValidator` (ADR-001).

use std::sync::Arc;
use tracing::{error, info};

use crate::commands::AppError;
use crate::domains::auth::infrastructure::session::SessionService;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;
use crate::shared::services::validation::ValidationService;

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
        ctx: &RequestContext,
    ) -> Result<String, AppError> {
        if ctx.auth.role != UserRole::Admin {
            return Err(AppError::Authorization(
                "Insufficient permissions to update session timeout".to_string(),
            ));
        }

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

// ── Password change — ADR-008: validation in application layer ────────────────

impl AuthSecurityService {
    /// Change the authenticated user's password.
    ///
    /// Validates new password strength (ADR-008), verifies the current password,
    /// then updates the hash in the database.
    pub fn change_password(
        &self,
        ctx: &RequestContext,
        auth_service: &crate::domains::auth::infrastructure::auth::AuthService,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), AppError> {
        // Validate new password strength (ADR-008: validation in application layer)
        ValidationService::new()
            .validate_password(new_password)
            .map_err(|e| AppError::Validation(e.to_string()))?;

        // Verify current password
        let is_valid = auth_service
            .verify_user_password(&ctx.auth.user_id, current_password)
            .map_err(|e| AppError::Authentication(format!("Password verification failed: {}", e)))?;

        if !is_valid {
            return Err(AppError::Authentication(
                "Current password is incorrect".to_string(),
            ));
        }

        // Update password hash in the database
        auth_service
            .change_password(&ctx.auth.user_id, new_password)
            .map_err(|e| AppError::Internal(format!("Failed to change password: {}", e)))?;

        info!(user_id = %ctx.auth.user_id, "Password changed successfully");
        Ok(())
    }
}

// ── Input validation — delegated to AuthInputValidator (ADR-001) ──────────────

impl AuthSecurityService {
    /// Validate and normalise login inputs.
    /// Returns `(validated_email, validated_password)` or an `AppError::Validation`.
    pub fn validate_login_input(
        &self,
        email: &str,
        password: &str,
    ) -> Result<(String, String), AppError> {
        crate::domains::auth::application::auth_input_validator::AuthInputValidator::new()
            .validate_login_input(email, password)
    }

    /// Validate signup fields and return a sanitised `SignupRequest`.
    pub fn validate_signup_input(
        &self,
        request: &crate::domains::auth::domain::models::auth::SignupRequest,
    ) -> Result<crate::domains::auth::domain::models::auth::SignupRequest, AppError> {
        crate::domains::auth::application::auth_input_validator::AuthInputValidator::new()
            .validate_signup_input(request)
    }
}
