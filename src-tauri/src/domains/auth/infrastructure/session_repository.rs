//! Session repository — CRUD operations against the `sessions` table.
//! All timestamps are stored as epoch milliseconds (INTEGER) in SQLite.

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::auth::domain::models::auth::{UserRole, UserSession};
use chrono::{DateTime, TimeZone, Utc};
use rusqlite::{params, OptionalExtension};
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

    /// Insert a new session row.
    #[instrument(skip(self), err)]
    pub fn insert_session(&self, session: &UserSession) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;
        let created_ms = rfc3339_to_ms(&session.created_at)?;
        let expires_ms = rfc3339_to_ms(&session.expires_at)?;
        let activity_ms = rfc3339_to_ms(&session.last_activity)?;
        conn.execute(
            "INSERT INTO sessions (id, user_id, username, email, role, created_at, expires_at, last_activity)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                session.id,
                session.user_id,
                session.username,
                session.email,
                session.role.to_string(),
                created_ms,
                expires_ms,
                activity_ms,
            ],
        )?;
        info!("Inserted session for user: {}", session.username);
        Ok(())
    }

    /// Find a session by token that has not yet expired.
    #[instrument(skip(self), err)]
    pub fn find_valid_session(
        &self,
        token: &str,
        now_ms: i64,
    ) -> Result<Option<UserSession>, AppError> {
        let conn = self.db.get_connection()?;
        let row = conn
            .query_row(
                "SELECT id, user_id, username, email, role, created_at, expires_at, last_activity
                 FROM sessions WHERE id = ?1 AND expires_at > ?2",
                params![token, now_ms],
                |row| {
                    let role_str: String = row.get(4)?;
                    let role = parse_role(&role_str);
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        role,
                        row.get::<_, i64>(5)?,
                        row.get::<_, i64>(6)?,
                        row.get::<_, i64>(7)?,
                    ))
                },
            )
            .optional()?;

        Ok(row.map(
            |(id, user_id, username, email, role, created_ms, expires_ms, activity_ms)| {
                UserSession {
                    token: id.clone(),
                    id,
                    user_id,
                    username,
                    email,
                    role,
                    created_at: ms_to_rfc3339(created_ms),
                    expires_at: ms_to_rfc3339(expires_ms),
                    last_activity: ms_to_rfc3339(activity_ms),
                }
            },
        ))
    }

    /// Update last_activity for a session.
    #[instrument(skip(self), err)]
    pub fn update_last_activity(&self, token: &str, now_ms: i64) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;
        conn.execute(
            "UPDATE sessions SET last_activity = ?1 WHERE id = ?2",
            params![now_ms, token],
        )?;
        Ok(())
    }

    /// Delete a session by token.
    #[instrument(skip(self), err)]
    pub fn delete_session(&self, token: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;
        let n = conn.execute("DELETE FROM sessions WHERE id = ?1", params![token])?;
        if n > 0 {
            info!("Deleted session: {}", token);
        }
        Ok(())
    }

    /// Delete all sessions for a user.
    #[instrument(skip(self), err)]
    pub fn delete_user_sessions(&self, user_id: &str) -> Result<usize, AppError> {
        let conn = self.db.get_connection()?;
        let n = conn.execute("DELETE FROM sessions WHERE user_id = ?1", params![user_id])?;
        Ok(n)
    }

    /// Delete all sessions for a user except one specific session (keep current).
    #[instrument(skip(self), err)]
    pub fn delete_user_sessions_except(
        &self,
        user_id: &str,
        keep_token: &str,
    ) -> Result<usize, AppError> {
        let conn = self.db.get_connection()?;
        let n = conn.execute(
            "DELETE FROM sessions WHERE user_id = ?1 AND id != ?2",
            params![user_id, keep_token],
        )?;
        Ok(n)
    }

    /// Delete expired sessions and return count removed.
    #[instrument(skip(self), err)]
    pub fn cleanup_expired(&self, now_ms: i64) -> Result<usize, AppError> {
        let conn = self.db.get_connection()?;
        let n = conn.execute(
            "DELETE FROM sessions WHERE expires_at <= ?1",
            params![now_ms],
        )?;
        if n > 0 {
            info!("Cleaned up {} expired sessions", n);
        }
        Ok(n)
    }

    /// List active sessions for a user.
    #[instrument(skip(self), err)]
    pub fn list_user_sessions(
        &self,
        user_id: &str,
        now_ms: i64,
    ) -> Result<Vec<UserSession>, AppError> {
        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, user_id, username, email, role, created_at, expires_at, last_activity
             FROM sessions WHERE user_id = ?1 AND expires_at > ?2
             ORDER BY last_activity DESC",
        )?;
        let rows = stmt.query_map(params![user_id, now_ms], |row| {
            let role_str: String = row.get(4)?;
            let role = parse_role(&role_str);
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                role,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, i64>(7)?,
            ))
        })?;

        let mut sessions = Vec::new();
        for r in rows {
            let (id, user_id, username, email, role, created_ms, expires_ms, activity_ms) = r?;
            sessions.push(UserSession {
                token: id.clone(),
                id,
                user_id,
                username,
                email,
                role,
                created_at: ms_to_rfc3339(created_ms),
                expires_at: ms_to_rfc3339(expires_ms),
                last_activity: ms_to_rfc3339(activity_ms),
            });
        }
        Ok(sessions)
    }
}

// ── helpers ─────────────────────────────────────────────────────────────────

fn parse_role(s: &str) -> UserRole {
    match s {
        "admin" => UserRole::Admin,
        "supervisor" => UserRole::Supervisor,
        "technician" => UserRole::Technician,
        _ => UserRole::Viewer,
    }
}

fn rfc3339_to_ms(s: &str) -> Result<i64, AppError> {
    DateTime::parse_from_rfc3339(s)
        .map(|dt| dt.timestamp_millis())
        .map_err(|e| AppError::Validation(format!("Invalid timestamp '{}': {}", s, e)))
}

fn ms_to_rfc3339(ms: i64) -> String {
    Utc.timestamp_millis_opt(ms)
        .single()
        .unwrap_or_else(Utc::now)
        .to_rfc3339()
}
