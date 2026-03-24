//! Login, session validation, and logout.

use crate::domains::auth::domain::models::auth::{UserAccount, UserRole, UserSession};
use chrono::Utc;
use rusqlite::params;
use sha2::{Digest, Sha256};
use tracing::{debug, error, info, instrument, warn};

impl super::AuthService {
    /// Authenticate user
    #[instrument(skip(self, password))]
    pub fn authenticate(
        &self,
        email: &str,
        password: &str,
        ip_address: Option<&str>,
    ) -> Result<UserSession, String> {
        debug!("Authentication attempt");

        // Validate input
        let (validated_email, validated_password) = self
            .validator
            .validate_login_data(email, password)
            .map_err(|e| {
                warn!("Login validation failed: {}", e);
                format!("Validation error: {}", e)
            })?;

        // Check rate limiting for both email and IP
        if self.rate_limiter.is_locked_out(&validated_email)? {
            return Err(format!(
                "Account temporarily locked due to too many failed attempts. Try again in {}.",
                self.rate_limiter
                    .get_lockout_remaining_time(&validated_email)?
                    .map(|d| format!("{} minutes", d.num_minutes()))
                    .unwrap_or_else(|| "a few minutes".to_string())
            ));
        }

        // Also check IP-based rate limiting if IP is provided
        if let Some(ip) = ip_address {
            if self.rate_limiter.is_locked_out(ip)? {
                return Err(format!(
                    "IP address temporarily locked due to too many failed attempts. Try again in {}.",
                    self.rate_limiter
                        .get_lockout_remaining_time(ip)?
                        .map(|d| format!("{} minutes", d.num_minutes()))
                        .unwrap_or_else(|| "a few minutes".to_string())
                ));
            }
        }

        let conn = self.db.get_connection()?;

        let account = conn.query_row(
            "SELECT id, email, username, password_hash, salt, first_name, last_name, role, phone, is_active, last_login_at, login_count, preferences, synced, last_synced_at, created_at, updated_at
              FROM users WHERE email = ? AND is_active = 1 AND deleted_at IS NULL",
            [&validated_email],
            |row| {
                let role_str: String = row.get(7)?;
                let role = role_str.parse::<UserRole>().unwrap_or(UserRole::Viewer);

                Ok(UserAccount {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    username: row.get(2)?,
                    password_hash: row.get(3)?,
                    salt: row.get(4)?,
                    first_name: row.get(5)?,
                    last_name: row.get(6)?,
                    role,
                    phone: row.get(8)?,
                    is_active: row.get::<_, i32>(9)? != 0,
                    last_login: row.get(10)?,
                    login_count: row.get(11)?,
                    preferences: row.get(12)?,
                    synced: row.get::<_, i32>(13)? != 0,
                    last_synced_at: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                })
            },
        ).map_err(|e| {
            match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    warn!("User not found or inactive");
                    "Invalid email or password".to_string()
                },
                _ => {
                    error!("Database error during authentication: {}", e);
                    format!("Database error: {}", e)
                },
            }
        })?;

        // Verify password
        let password_valid = self.verify_password(&validated_password, &account.password_hash)?;
        if !password_valid {
            // Record failed attempt for both email and IP
            self.rate_limiter.record_failed_attempt(&validated_email)?;
            if let Some(ip) = ip_address {
                self.rate_limiter.record_failed_attempt(ip)?;
            }

            warn!("Invalid password");
            return Err("Invalid email or password".to_string());
        }

        // Clear failed attempts on successful authentication
        self.rate_limiter.clear_failed_attempts(&validated_email)?;
        if let Some(ip) = ip_address {
            self.rate_limiter.clear_failed_attempts(ip)?;
        }

        // Update last login
        conn.execute(
            "UPDATE users SET last_login_at = ?, login_count = login_count + 1, updated_at = ? WHERE id = ?",
            params![Utc::now().timestamp_millis(), Utc::now().timestamp_millis(), account.id],
        ).map_err(|e| {
            error!("Failed to update last login: {}", e);
            format!("Failed to update last login: {}", e)
        })?;

        // Create session with a UUID token
        let token = crate::shared::utils::uuid::generate_uuid_string();
        let session = UserSession::new(
            account.id,
            account.username,
            account.email,
            account.role,
            token,
            28800, // 8 hours
        );

        // Persist session
        self.session_repository
            .insert_session(&session)
            .map_err(|e| {
                error!("Failed to store session: {}", e);
                format!("Failed to create session: {}", e)
            })?;

        info!("User authenticated successfully");
        Ok(session)
    }

    /// Validate session token — direct DB lookup, no JWT.
    #[instrument(skip(self, token), fields(token_hash = %format!("{:x}", Sha256::digest(token.as_bytes()))))]
    pub fn validate_session(&self, token: &str) -> Result<UserSession, String> {
        debug!("Session validation request");
        let now_ms = Utc::now().timestamp_millis();
        let mut session = self
            .session_repository
            .find_valid_session(token, now_ms)
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or_else(|| "Invalid or expired session".to_string())?;

        // Update last activity
        self.session_repository
            .update_last_activity(token, now_ms)
            .map_err(|e| format!("Failed to update session activity: {}", e))?;

        session.update_activity();
        Ok(session)
    }

    /// Logout — delete session by UUID token.
    pub fn logout(&self, token: &str) -> Result<(), String> {
        self.session_repository
            .delete_session(token)
            .map_err(|e| format!("Failed to logout: {}", e))?;
        Ok(())
    }
}
