//! Session service — lifecycle management (create, validate, revoke).

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::auth::domain::models::auth::{UserRole, UserSession};
use crate::domains::auth::infrastructure::session_repository::SessionRepository;
use chrono::Utc;
use std::sync::Arc;
use tracing::{info, instrument};

const SESSION_DURATION_SECONDS: i64 = 8 * 3600; // 8 hours

#[derive(Clone, Debug)]
pub struct SessionService {
    repository: SessionRepository,
}

impl SessionService {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repository: SessionRepository::new(db),
        }
    }

    /// Validate a session token and return the session if valid.
    #[instrument(skip(self), err)]
    pub async fn validate_session(&self, token: &str) -> Result<Option<UserSession>, AppError> {
        let now_ms = Utc::now().timestamp_millis();
        self.repository.find_valid_session(token, now_ms)
    }

    /// Create a new UUID-based session.
    #[instrument(skip(self), err)]
    pub async fn create_session(
        &self,
        user_id: String,
        username: String,
        email: String,
        role: UserRole,
    ) -> Result<UserSession, AppError> {
        let token = uuid::Uuid::new_v4().to_string();
        let session = UserSession::new(
            user_id,
            username.clone(),
            email,
            role,
            token,
            SESSION_DURATION_SECONDS,
        );
        self.repository.insert_session(&session)?;
        info!("Created new session for user: {}", username);
        Ok(session)
    }

    /// Update session activity timestamp.
    #[instrument(skip(self), err)]
    pub async fn update_session_activity(&self, token: &str) -> Result<(), AppError> {
        let now_ms = Utc::now().timestamp_millis();
        self.repository.update_last_activity(token, now_ms)
    }

    /// Revoke a specific session.
    #[instrument(skip(self), err)]
    pub async fn revoke_session(&self, token: &str) -> Result<(), AppError> {
        self.repository.delete_session(token)?;
        info!("Revoked session");
        Ok(())
    }

    /// Revoke all sessions for a user.
    #[instrument(skip(self), err)]
    pub async fn revoke_all_user_sessions(&self, user_id: &str) -> Result<usize, AppError> {
        let n = self.repository.delete_user_sessions(user_id)?;
        info!("Revoked {} sessions for user: {}", n, user_id);
        Ok(n)
    }

    /// Get active sessions for a user.
    #[instrument(skip(self), err)]
    pub async fn get_user_active_sessions(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserSession>, AppError> {
        let now_ms = Utc::now().timestamp_millis();
        self.repository.list_user_sessions(user_id, now_ms)
    }

    /// Revoke all sessions for a user except the current session.
    #[instrument(skip(self), err)]
    pub async fn revoke_all_sessions_except_current(
        &self,
        user_id: &str,
        current_token: &str,
    ) -> Result<u32, AppError> {
        let n = self
            .repository
            .delete_user_sessions_except(user_id, current_token)?;
        info!("Revoked {} other sessions for user: {}", n, user_id);
        Ok(n as u32)
    }

    /// Get session timeout configuration (fixed value — no longer configurable).
    pub async fn get_session_timeout_config(
        &self,
    ) -> crate::domains::auth::domain::models::auth::SessionTimeoutConfig {
        crate::domains::auth::domain::models::auth::SessionTimeoutConfig::default()
    }

    /// Update session timeout (no-op — session duration is now fixed at 8h).
    pub async fn update_session_timeout(&self, _timeout_minutes: u32) -> Result<(), AppError> {
        Ok(())
    }

    /// Clean up expired sessions.
    #[instrument(skip(self), err)]
    pub async fn cleanup_expired_sessions(&self) -> Result<usize, AppError> {
        let now_ms = Utc::now().timestamp_millis();
        self.repository.cleanup_expired(now_ms)
    }
}
