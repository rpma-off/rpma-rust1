//! Simplified rate limiting and account lockout service

use chrono::{DateTime, Duration, Utc};
use rusqlite::params;

/// TODO: document
#[derive(Debug)]
pub struct RateLimiterService {
    db: crate::db::Database,
    max_attempts: u32,
    lockout_duration: Duration,
}

impl RateLimiterService {
    /// TODO: document
    pub fn new(db: crate::db::Database) -> Self {
        Self {
            db,
            max_attempts: 5,                         // Max 5 failed attempts
            lockout_duration: Duration::minutes(crate::shared::constants::RATE_LIMIT_LOCKOUT_MINUTES),
        }
    }

    /// Check if identifier is currently locked out
    pub fn is_locked_out(&self, identifier: &str) -> Result<bool, String> {
        let conn = self.db.get_connection()?;

        let result = conn.query_row(
            "SELECT lock_until FROM login_attempts 
             WHERE identifier = ? AND is_locked = 1 ORDER BY last_attempt DESC LIMIT 1",
            [identifier],
            |row| {
                let lock_until: Option<String> = row.get(0)?;
                if let Some(lock_until_str) = lock_until {
                    let lock_until_dt = DateTime::parse_from_rfc3339(&lock_until_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc);
                    Ok(Some(lock_until_dt))
                } else {
                    Ok(None)
                }
            },
        );

        match result {
            Ok(Some(lock_until)) => Ok(Utc::now() < lock_until),
            Ok(None) => Ok(false),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
            Err(e) => Err(format!("Database error: {}", e)),
        }
    }

    /// Record a failed login attempt
    pub fn record_failed_attempt(&self, identifier: &str) -> Result<(), String> {
        let now = Utc::now();
        let conn = self.db.get_connection()?;

        // Count attempts in the last 15 minutes
        let window_start = now - Duration::minutes(15);
        let count: i32 = conn.query_row(
            "SELECT COALESCE(SUM(attempt_count), 0) FROM login_attempts WHERE identifier = ? AND last_attempt > ?",
            params![identifier, window_start.to_rfc3339()],
            |row| row.get(0)
        ).unwrap_or(0);

        let new_count = count + 1;
        let is_locked = new_count >= self.max_attempts as i32;
        let lock_until = if is_locked { Some(now + self.lockout_duration) } else { None };

        conn.execute(
            "INSERT INTO login_attempts 
             (id, identifier, attempt_count, first_attempt, last_attempt, is_locked, lock_until, created_at, updated_at)
             VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)",
            params![
                crate::shared::utils::uuid::generate_uuid_string(),
                identifier,
                now.to_rfc3339(),
                now.to_rfc3339(),
                if is_locked { 1 } else { 0 },
                lock_until.map(|dt| dt.to_rfc3339()),
                now.to_rfc3339(),
                now.to_rfc3339(),
            ],
        ).map_err(|e| format!("Failed to record login attempt: {}", e))?;

        Ok(())
    }

    /// Clear failed attempts after successful login
    pub fn clear_failed_attempts(&self, identifier: &str) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        conn.execute("DELETE FROM login_attempts WHERE identifier = ?", [identifier])
            .map_err(|e| format!("Failed to clear login attempts: {}", e))?;
        Ok(())
    }

    /// Get remaining attempts before lockout
    pub fn get_remaining_attempts(&self, identifier: &str) -> Result<u32, String> {
        let conn = self.db.get_connection()?;
        let window_start = Utc::now() - Duration::minutes(15);
        
        let count: i32 = conn.query_row(
            "SELECT COALESCE(SUM(attempt_count), 0) FROM login_attempts WHERE identifier = ? AND last_attempt > ?",
            params![identifier, window_start.to_rfc3339()],
            |row| row.get(0)
        ).unwrap_or(0);

        Ok(self.max_attempts.saturating_sub(count as u32))
    }

    /// Get time until lockout expires
    pub fn get_lockout_remaining_time(&self, identifier: &str) -> Result<Option<Duration>, String> {
        let conn = self.db.get_connection()?;

        let result = conn.query_row(
            "SELECT lock_until FROM login_attempts 
             WHERE identifier = ? AND is_locked = 1 
             ORDER BY last_attempt DESC LIMIT 1",
            [identifier],
            |row| {
                let lock_until_str: String = row.get(0)?;
                let lock_until = DateTime::parse_from_rfc3339(&lock_until_str)
                    .map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?
                    .with_timezone(&Utc);
                Ok(lock_until)
            },
        );

        match result {
            Ok(lock_until) => {
                let now = Utc::now();
                if now < lock_until {
                    Ok(Some(lock_until - now))
                } else {
                    Ok(None)
                }
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Database error: {}", e)),
        }
    }

    /// Initialize rate limiter tables (no-op in simplified version)
    pub fn init(&self) -> Result<(), String> {
        Ok(())
    }

    /// Check and record rate limit for an endpoint
    pub fn check_and_record(
        &self,
        _identifier: &str,
        _max_requests: u32,
        _window_seconds: i64,
    ) -> Result<bool, String> {
        // Simplified version always allows general requests
        // (Lockout still works for login attempts)
        Ok(true)
    }

    /// Clean up old login attempt records
    pub fn cleanup_old_attempts(&self) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        let cutoff_time = Utc::now() - Duration::days(1);
        conn.execute("DELETE FROM login_attempts WHERE last_attempt < ?", [cutoff_time.to_rfc3339()])
            .map_err(|e| format!("Failed to cleanup old login attempts: {}", e))?;
        Ok(())
    }
}
