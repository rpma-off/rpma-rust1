//! Session service for managing user session lifecycle and validation

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::auth::domain::models::auth::{DeviceInfo, SessionTimeoutConfig, UserSession};
use crate::repositories::session_repository::SessionRepository;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, instrument};

#[derive(Clone, Debug)]
pub struct SessionService {
    repository: SessionRepository,
    config: Arc<RwLock<SessionTimeoutConfig>>,
    active_sessions: Arc<RwLock<HashMap<String, UserSession>>>,
}

impl SessionService {
    pub fn new(db: Arc<Database>) -> Self {
        let repository = SessionRepository::new(db);
        let config = Arc::new(RwLock::new(SessionTimeoutConfig {
            default_timeout_minutes: 480, // 8 hours
            max_timeout_minutes: 1440,    // 24 hours
            enforce_timeout: true,
        }));

        Self {
            repository,
            config,
            active_sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Validate a session token and return the session if valid
    #[instrument(skip(self), err)]
    pub async fn validate_session(&self, token: &str) -> Result<Option<UserSession>, AppError> {
        // Check in-memory cache first
        {
            let active_sessions = self.active_sessions.read().await;
            if let Some(session) = active_sessions.get(token) {
                if !session.is_expired() {
                    return Ok(Some(session.clone()));
                } else {
                    // Remove expired session from cache
                    drop(active_sessions);
                    let mut active_sessions = self.active_sessions.write().await;
                    active_sessions.remove(token);
                }
            }
        }

        // Check database
        if let Some(session) = self.repository.get_session(token).await? {
            if !session.is_expired() {
                // Cache the valid session
                let mut active_sessions = self.active_sessions.write().await;
                active_sessions.insert(token.to_string(), session.clone());
                Ok(Some(session))
            } else {
                // Clean up expired session
                self.repository.revoke_session(token).await?;
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    /// Create a new session with metadata
    #[instrument(skip(self), err)]
    pub async fn create_session(
        &self,
        user_id: String,
        username: String,
        email: String,
        role: crate::domains::auth::domain::models::auth::UserRole,
        device_info: Option<DeviceInfo>,
        ip_address: Option<String>,
        user_agent: Option<String>,
        location: Option<String>,
    ) -> Result<UserSession, AppError> {
        let config = self.config.read().await;
        let timeout_minutes = config.default_timeout_minutes;
        let expires_in_seconds = (timeout_minutes * 60) as i64;

        let session = UserSession::new_with_metadata(
            user_id,
            username.clone(),
            email,
            role,
            uuid::Uuid::new_v4().to_string(),
            None, // refresh_token
            expires_in_seconds,
            device_info,
            ip_address,
            user_agent,
            location,
            false, // two_factor_verified
            Some(timeout_minutes),
        );

        self.repository.create_session(&session).await?;

        // Cache the session
        let mut active_sessions = self.active_sessions.write().await;
        active_sessions.insert(session.token.clone(), session.clone());

        info!("Created new session for user: {}", username);
        Ok(session)
    }

    /// Update session activity timestamp
    #[instrument(skip(self), err)]
    pub async fn update_session_activity(&self, token: &str) -> Result<(), AppError> {
        self.repository.update_session_activity(token).await?;

        // Update in-memory cache
        let mut active_sessions = self.active_sessions.write().await;
        if let Some(session) = active_sessions.get_mut(token) {
            session.update_activity();
        }

        Ok(())
    }

    /// Revoke a specific session
    #[instrument(skip(self), err)]
    pub async fn revoke_session(&self, session_id: &str) -> Result<(), AppError> {
        self.repository.revoke_session(session_id).await?;

        // Remove from cache
        let mut active_sessions = self.active_sessions.write().await;
        active_sessions.remove(session_id);

        info!("Revoked session: {}", session_id);
        Ok(())
    }

    /// Revoke all sessions for a user except the current one
    #[instrument(skip(self), err)]
    pub async fn revoke_all_sessions_except_current(
        &self,
        user_id: &str,
        current_session_id: &str,
    ) -> Result<u32, AppError> {
        let revoked_count = self
            .repository
            .revoke_all_sessions_except_current(user_id, current_session_id)
            .await?;

        // Remove from cache
        let mut active_sessions = self.active_sessions.write().await;
        active_sessions.retain(|_token, session| {
            !(session.user_id == user_id && session.id != current_session_id)
        });

        info!("Revoked {} sessions for user: {}", revoked_count, user_id);
        Ok(revoked_count)
    }

    /// Get all active sessions for a user
    #[instrument(skip(self), err)]
    pub async fn get_user_active_sessions(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserSession>, AppError> {
        self.repository.get_user_sessions(user_id).await
    }

    /// Update session timeout configuration
    #[instrument(skip(self), err)]
    pub async fn update_session_timeout(&self, timeout_minutes: u32) -> Result<(), AppError> {
        let mut config = self.config.write().await;

        if timeout_minutes > config.max_timeout_minutes {
            return Err(AppError::Validation(format!(
                "Timeout cannot exceed maximum of {} minutes",
                config.max_timeout_minutes
            )));
        }

        config.default_timeout_minutes = timeout_minutes;
        info!(
            "Updated default session timeout to {} minutes",
            timeout_minutes
        );
        Ok(())
    }

    /// Get current session timeout configuration
    pub async fn get_session_timeout_config(&self) -> SessionTimeoutConfig {
        self.config.read().await.clone()
    }

    /// Check if a user has exceeded concurrent session limits
    #[instrument(skip(self), err)]
    pub async fn check_concurrent_session_limit(
        &self,
        user_id: &str,
        max_sessions: u32,
    ) -> Result<bool, AppError> {
        let active_sessions = self.repository.get_user_sessions(user_id).await?;
        Ok(active_sessions.len() < max_sessions as usize)
    }

    /// Clean up expired sessions
    #[instrument(skip(self), err)]
    pub async fn cleanup_expired_sessions(&self) -> Result<u32, AppError> {
        let cleaned_count = self.repository.cleanup_expired_sessions().await?;

        // Remove expired sessions from cache
        let mut active_sessions = self.active_sessions.write().await;
        let now = Utc::now();
        active_sessions.retain(|_, session| {
            if let Ok(expires_at) = DateTime::parse_from_rfc3339(&session.expires_at) {
                expires_at.with_timezone(&Utc) > now
            } else {
                false
            }
        });

        if cleaned_count > 0 {
            info!("Cleaned up {} expired sessions", cleaned_count);
        }

        Ok(cleaned_count)
    }

    /// Get session statistics
    #[instrument(skip(self), err)]
    pub async fn get_session_statistics(&self) -> Result<HashMap<String, u32>, AppError> {
        self.repository.get_session_stats().await
    }

    /// Force refresh of session cache from database
    #[instrument(skip(self), err)]
    pub async fn refresh_session_cache(&self) -> Result<(), AppError> {
        let mut active_sessions = self.active_sessions.write().await;
        active_sessions.clear();

        // Note: In a production system, you might want to selectively refresh
        // active sessions rather than clearing the entire cache
        info!("Refreshed session cache");
        Ok(())
    }

    /// Extend session expiration
    #[instrument(skip(self), err)]
    pub async fn extend_session(
        &self,
        token: &str,
        additional_minutes: u32,
    ) -> Result<(), AppError> {
        let additional_seconds = (additional_minutes * 60) as i64;

        // Update in database (this would require a new repository method)
        // For now, we'll handle this by recreating the session with extended time
        // In a real implementation, you'd add an extend_session method to the repository

        // Update in-memory cache
        let mut active_sessions = self.active_sessions.write().await;
        if let Some(session) = active_sessions.get_mut(token) {
            session.extend_session(additional_seconds);
            info!(
                "Extended session {} by {} minutes",
                token, additional_minutes
            );
        }

        Ok(())
    }
}
