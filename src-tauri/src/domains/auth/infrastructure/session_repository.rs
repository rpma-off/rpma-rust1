//! Session repository for managing user sessions in the database

use crate::commands::AppError;
use crate::db::Database;
use crate::models::auth::UserSession;
use crate::services::token;
use chrono::Utc;
use rusqlite::{params, OptionalExtension, Row};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{info, instrument};

#[derive(Clone, Debug)]
pub struct SessionRepository {
    db: Arc<Database>,
}

impl SessionRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get all active sessions for a user
    #[instrument(skip(self), err)]
    pub async fn get_user_sessions(&self, user_id: &str) -> Result<Vec<UserSession>, AppError> {
        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, user_id, username, email, role, token, refresh_token,
                    expires_at, last_activity, created_at,
                    device_info, ip_address, user_agent, location,
                    two_factor_verified, session_timeout_minutes
             FROM user_sessions
             WHERE user_id = ? AND expires_at > datetime('now')
             ORDER BY last_activity DESC",
        )?;

        let sessions = stmt
            .query_map(params![user_id], |row| self.row_to_session(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(sessions)
    }

    /// Get a specific session by ID
    #[instrument(skip(self), err)]
    pub async fn get_session(&self, session_id: &str) -> Result<Option<UserSession>, AppError> {
        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, user_id, username, email, role, token, refresh_token,
                    expires_at, last_activity, created_at,
                    device_info, ip_address, user_agent, location,
                    two_factor_verified, session_timeout_minutes
             FROM user_sessions
             WHERE id = ?",
        )?;

        let session = stmt
            .query_row(params![session_id], |row| self.row_to_session(row))
            .optional()?;

        Ok(session)
    }

    /// Create a new session
    #[instrument(skip(self), err)]
    pub async fn create_session(&self, session: &UserSession) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;
        let token_hash = token::hash_token_with_env(&session.token)
            .map_err(|e| AppError::Configuration(format!("Token hash failed: {}", e)))?;
        let refresh_token_hash = session
            .refresh_token
            .as_deref()
            .map(token::hash_token_with_env)
            .transpose()
            .map_err(|e| AppError::Configuration(format!("Refresh token hash failed: {}", e)))?;
        conn.execute(
            "INSERT INTO user_sessions (
                id, user_id, username, email, role, token, refresh_token,
                expires_at, last_activity, created_at,
                device_info, ip_address, user_agent, location,
                two_factor_verified, session_timeout_minutes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                session.id,
                session.user_id,
                session.username,
                session.email,
                session.role.to_string(),
                token_hash,
                refresh_token_hash,
                session.expires_at,
                session.last_activity,
                session.created_at,
                serde_json::to_string(&session.device_info).unwrap_or_default(),
                session.ip_address,
                session.user_agent,
                session.location,
                session.two_factor_verified,
                session.session_timeout_minutes,
            ],
        )?;

        info!("Created session for user: {}", session.username);
        Ok(())
    }

    /// Update session activity
    #[instrument(skip(self), err)]
    pub async fn update_session_activity(&self, session_id: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE user_sessions SET last_activity = ? WHERE id = ?",
            params![now, session_id],
        )?;

        Ok(())
    }

    /// Revoke a specific session
    #[instrument(skip(self), err)]
    pub async fn revoke_session(&self, session_id: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;
        let rows_affected = conn.execute(
            "DELETE FROM user_sessions WHERE id = ?",
            params![session_id],
        )?;

        if rows_affected > 0 {
            info!("Revoked session: {}", session_id);
        }

        Ok(())
    }

    /// Revoke all sessions for a user except the current one
    #[instrument(skip(self), err)]
    pub async fn revoke_all_sessions_except_current(
        &self,
        user_id: &str,
        current_session_id: &str,
    ) -> Result<u32, AppError> {
        let conn = self.db.get_connection()?;
        let rows_affected = conn.execute(
            "DELETE FROM user_sessions WHERE user_id = ? AND id != ?",
            params![user_id, current_session_id],
        )?;

        info!("Revoked {} sessions for user: {}", rows_affected, user_id);
        Ok(rows_affected as u32)
    }

    /// Revoke all sessions for a user
    #[instrument(skip(self), err)]
    pub async fn revoke_all_user_sessions(&self, user_id: &str) -> Result<u32, AppError> {
        let conn = self.db.get_connection()?;
        let rows_affected = conn.execute(
            "DELETE FROM user_sessions WHERE user_id = ?",
            params![user_id],
        )?;

        info!(
            "Revoked all {} sessions for user: {}",
            rows_affected, user_id
        );
        Ok(rows_affected as u32)
    }

    /// Clean up expired sessions
    #[instrument(skip(self), err)]
    pub async fn cleanup_expired_sessions(&self) -> Result<u32, AppError> {
        let conn = self.db.get_connection()?;
        let rows_affected = conn.execute(
            "DELETE FROM user_sessions WHERE expires_at <= datetime('now')",
            [],
        )?;

        if rows_affected > 0 {
            info!("Cleaned up {} expired sessions", rows_affected);
        }

        Ok(rows_affected as u32)
    }

    /// Get session statistics
    #[instrument(skip(self), err)]
    pub async fn get_session_stats(&self) -> Result<HashMap<String, u32>, AppError> {
        let conn = self.db.get_connection()?;

        // Count active sessions
        let active_sessions: u32 = conn.query_row(
            "SELECT COUNT(*) FROM user_sessions WHERE expires_at > datetime('now')",
            [],
            |row| row.get(0),
        )?;

        // Count total sessions
        let total_sessions: u32 =
            conn.query_row("SELECT COUNT(*) FROM user_sessions", [], |row| row.get(0))?;

        // Count unique users with active sessions
        let active_users: u32 = conn.query_row(
            "SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE expires_at > datetime('now')",
            [],
            |row| row.get(0),
        )?;

        let mut stats = HashMap::new();
        stats.insert("active_sessions".to_string(), active_sessions);
        stats.insert("total_sessions".to_string(), total_sessions);
        stats.insert("active_users".to_string(), active_users);

        Ok(stats)
    }

    /// Helper method to convert database row to UserSession
    fn row_to_session(&self, row: &Row) -> Result<UserSession, rusqlite::Error> {
        let device_info_json: Option<String> = row.get(10)?;
        let device_info = device_info_json
            .and_then(|json| serde_json::from_str(&json).ok())
            .unwrap_or(None);

        Ok(UserSession {
            id: row.get(0)?,
            user_id: row.get(1)?,
            username: row.get(2)?,
            email: row.get(3)?,
            role: {
                let role_str: String = row.get(4)?;
                match role_str.as_str() {
                    "admin" => crate::models::auth::UserRole::Admin,
                    "technician" => crate::models::auth::UserRole::Technician,
                    "supervisor" => crate::models::auth::UserRole::Supervisor,
                    "viewer" => crate::models::auth::UserRole::Viewer,
                    _ => crate::models::auth::UserRole::Viewer,
                }
            },
            token: row.get(5)?,
            refresh_token: row.get(6)?,
            expires_at: row.get(7)?,
            last_activity: row.get(8)?,
            created_at: row.get(9)?,
            device_info,
            ip_address: row.get(11)?,
            user_agent: row.get(12)?,
            location: row.get(13)?,
            two_factor_verified: row.get(14)?,
            session_timeout_minutes: row.get(15)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::auth::UserRole;

    #[tokio::test]
    async fn test_create_session_hashes_tokens() {
        std::env::set_var("JWT_SECRET", "test_jwt_secret_32_bytes_long__ok");
        let db = Arc::new(Database::new_in_memory().await.expect("create db"));
        let repo = SessionRepository::new(db.clone());
        let now = chrono::Utc::now().timestamp_millis();

        let conn = db.get_connection().expect("connection");
        let expected_columns = [
            ("device_info", "TEXT"),
            ("ip_address", "TEXT"),
            ("user_agent", "TEXT"),
            ("location", "TEXT"),
            ("two_factor_verified", "INTEGER NOT NULL DEFAULT 0"),
            ("session_timeout_minutes", "INTEGER"),
        ];

        for (column, definition) in expected_columns {
            let exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('user_sessions') WHERE name = ?1",
                    [column],
                    |row| row.get(0),
                )
                .expect("check user_sessions column");
            if exists == 0 {
                conn.execute(
                    &format!(
                        "ALTER TABLE user_sessions ADD COLUMN {} {}",
                        column, definition
                    ),
                    [],
                )
                .expect("add missing user_sessions column");
            }
        }

        conn.execute(
            "INSERT INTO users
             (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            rusqlite::params![
                "user-123",
                "tester@example.com",
                "tester",
                "test-password-hash",
                "Test User",
                "admin",
                1,
                now
            ],
        )
        .expect("insert user fixture");
        drop(conn);

        let session = UserSession::new(
            "user-123".to_string(),
            "tester".to_string(),
            "tester@example.com".to_string(),
            UserRole::Admin,
            "token-value".to_string(),
            Some("refresh-token".to_string()),
            3600,
        );

        repo.create_session(&session).await.expect("create session");

        let conn = db.get_connection().expect("connection");
        let (stored_token, stored_refresh): (String, Option<String>) = conn
            .query_row(
                "SELECT token, refresh_token FROM user_sessions WHERE user_id = ?",
                [session.user_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("query token");

        let expected_token = token::hash_token_with_env(&session.token).expect("hash token");
        assert_eq!(stored_token, expected_token);
        assert_ne!(stored_token, session.token);

        let expected_refresh =
            token::hash_token_with_env("refresh-token").expect("hash refresh token");
        assert_eq!(stored_refresh.as_deref(), Some(expected_refresh.as_str()));
    }
}
