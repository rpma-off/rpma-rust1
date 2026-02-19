//! Rate limiting and account lockout service

use chrono::{DateTime, Duration, Utc};
use rusqlite::params;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone, Debug)]
pub struct LoginAttempt {
    pub count: u32,
    pub first_attempt: DateTime<Utc>,
    pub last_attempt: DateTime<Utc>,
    pub is_locked: bool,
    pub lock_until: Option<DateTime<Utc>>,
}

#[derive(Debug)]
pub struct RateLimiterService {
    db: crate::db::Database,
    // In-memory cache for frequently accessed attempts
    memory_cache: Arc<Mutex<HashMap<String, LoginAttempt>>>,
    max_attempts: u32,
    lockout_duration: Duration,
    window_duration: Duration,
}

impl RateLimiterService {
    pub fn new(db: crate::db::Database) -> Self {
        Self {
            db,
            memory_cache: Arc::new(Mutex::new(HashMap::new())),
            max_attempts: 5,                         // Max 5 failed attempts
            lockout_duration: Duration::minutes(15), // Lock for 15 minutes
            window_duration: Duration::minutes(15),  // Count attempts within 15 minutes
        }
    }

    /// Initialize rate limiter tables
    pub fn init(&self) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS login_attempts (
                 id TEXT PRIMARY KEY,
                 identifier TEXT NOT NULL,  -- IP address or email
                 attempt_count INTEGER NOT NULL DEFAULT 1,
                 first_attempt TEXT NOT NULL,
                 last_attempt TEXT NOT NULL,
                 is_locked INTEGER NOT NULL DEFAULT 0,
                 lock_until TEXT,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             )",
            [],
        )
        .map_err(|e| format!("Failed to create login_attempts table: {}", e))?;

        Ok(())
    }

    /// Check if identifier is currently locked out
    pub fn is_locked_out(&self, identifier: &str) -> Result<bool, String> {
        // Check memory cache first
        if let Ok(cache) = self.memory_cache.lock() {
            if let Some(attempt) = cache.get(identifier) {
                if attempt.is_locked {
                    if let Some(lock_until) = attempt.lock_until {
                        if Utc::now() < lock_until {
                            return Ok(true);
                        }
                    }
                }
            }
        }

        // Check database
        let conn = self.db.get_connection()?;

        let result = conn.query_row(
            "SELECT is_locked, lock_until FROM login_attempts 
             WHERE identifier = ? ORDER BY last_attempt DESC LIMIT 1",
            [identifier],
            |row| {
                let is_locked: i32 = row.get(0)?;
                let lock_until: Option<String> = row.get(1)?;

                if is_locked != 0 {
                    if let Some(lock_until_str) = lock_until {
                        let lock_until_dt = DateTime::parse_from_rfc3339(&lock_until_str)
                            .map_err(|e| {
                                rusqlite::Error::FromSqlConversionFailure(
                                    1,
                                    rusqlite::types::Type::Text,
                                    Box::new(e),
                                )
                            })?
                            .with_timezone(&Utc);
                        Ok(Some(lock_until_dt))
                    } else {
                        Ok(None)
                    }
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

        // Update memory cache
        if let Ok(mut cache) = self.memory_cache.lock() {
            let attempt = cache.entry(identifier.to_string()).or_insert(LoginAttempt {
                count: 0,
                first_attempt: now,
                last_attempt: now,
                is_locked: false,
                lock_until: None,
            });

            attempt.count += 1;
            attempt.last_attempt = now;

            // Check if should lock
            if attempt.count >= self.max_attempts {
                attempt.is_locked = true;
                attempt.lock_until = Some(now + self.lockout_duration);
            }
        }

        // Update database
        let conn = self.db.get_connection()?;

        // First, try to update existing record
        let updated = conn
            .execute(
                "UPDATE login_attempts 
             SET attempt_count = attempt_count + 1,
                 last_attempt = ?,
                 is_locked = CASE 
                     WHEN attempt_count + 1 >= ? THEN 1 
                     ELSE is_locked 
                 END,
                 lock_until = CASE 
                     WHEN attempt_count + 1 >= ? THEN ? 
                     ELSE lock_until 
                 END,
                 updated_at = ?
             WHERE identifier = ? AND last_attempt > ?",
                params![
                    now.to_rfc3339(),
                    self.max_attempts,
                    self.max_attempts,
                    (now + self.lockout_duration).to_rfc3339(),
                    now.to_rfc3339(),
                    identifier,
                    (now - self.window_duration).to_rfc3339(),
                ],
            )
            .map_err(|e| format!("Failed to update login attempt: {}", e))?;

        // If no rows were updated, create a new record
        if updated == 0 {
            conn.execute(
                "INSERT INTO login_attempts 
                 (id, identifier, attempt_count, first_attempt, last_attempt, is_locked, lock_until, created_at, updated_at)
                 VALUES (?, ?, 1, ?, ?, 0, NULL, ?, ?)",
                params![
                    uuid::Uuid::new_v4().to_string(),
                    identifier,
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                ],
            ).map_err(|e| format!("Failed to create login attempt record: {}", e))?;
        }

        Ok(())
    }

    /// Clear failed attempts after successful login
    pub fn clear_failed_attempts(&self, identifier: &str) -> Result<(), String> {
        // Clear from memory cache
        if let Ok(mut cache) = self.memory_cache.lock() {
            cache.remove(identifier);
        }

        // Clear from database
        let conn = self.db.get_connection()?;

        conn.execute(
            "DELETE FROM login_attempts WHERE identifier = ?",
            [identifier],
        )
        .map_err(|e| format!("Failed to clear login attempts: {}", e))?;

        Ok(())
    }

    /// Get remaining attempts before lockout
    pub fn get_remaining_attempts(&self, identifier: &str) -> Result<u32, String> {
        // Check memory cache first
        if let Ok(cache) = self.memory_cache.lock() {
            if let Some(attempt) = cache.get(identifier) {
                if attempt.is_locked {
                    return Ok(0);
                }
                return Ok(self.max_attempts.saturating_sub(attempt.count));
            }
        }

        // Check database
        let conn = self.db.get_connection()?;

        let result = conn.query_row(
            "SELECT attempt_count, is_locked FROM login_attempts 
             WHERE identifier = ? AND last_attempt > ? 
             ORDER BY last_attempt DESC LIMIT 1",
            params![identifier, (Utc::now() - self.window_duration).to_rfc3339(),],
            |row| {
                let count: i32 = row.get(0)?;
                let is_locked: i32 = row.get(1)?;

                if is_locked != 0 {
                    Ok(0u32)
                } else {
                    Ok(self.max_attempts.saturating_sub(count as u32))
                }
            },
        );

        match result {
            Ok(remaining) => Ok(remaining),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(self.max_attempts),
            Err(e) => Err(format!("Database error: {}", e)),
        }
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

    /// General rate limiting for any endpoint
    /// Returns true if the request should be allowed, false if rate limited
    pub fn check_rate_limit(
        &self,
        identifier: &str,
        max_requests: u32,
        window_seconds: i64,
    ) -> Result<bool, String> {
        let conn = self.db.get_connection()?;
        let now = Utc::now();
        let window_start = now - Duration::seconds(window_seconds);

        // Count requests in the current window
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM login_attempts
             WHERE identifier = ? AND last_attempt > ?",
                params![identifier, window_start.to_rfc3339()],
                |row| row.get(0),
            )
            .unwrap_or(0);

        Ok(count < max_requests as i64)
    }

    /// Record a general request for rate limiting
    pub fn record_request(&self, identifier: &str) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        let now = Utc::now();

        // Insert or update the request record
        let updated = conn
            .execute(
                "UPDATE login_attempts SET
                attempt_count = attempt_count + 1,
                last_attempt = ?,
                updated_at = ?
             WHERE identifier = ? AND last_attempt > ?",
                params![
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                    identifier,
                    (now - Duration::hours(1)).to_rfc3339(), // Only count recent requests
                ],
            )
            .map_err(|e| format!("Failed to update request record: {}", e))?;

        // If no rows were updated, create a new record
        if updated == 0 {
            conn.execute(
                "INSERT INTO login_attempts
                 (id, identifier, attempt_count, first_attempt, last_attempt, is_locked, lock_until, created_at, updated_at)
                 VALUES (?, ?, 1, ?, ?, 0, NULL, ?, ?)",
                params![
                    uuid::Uuid::new_v4().to_string(),
                    identifier,
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                ],
            ).map_err(|e| format!("Failed to create request record: {}", e))?;
        }

        Ok(())
    }

    /// Check and record rate limit for an endpoint
    /// Returns true if allowed, false if rate limited
    pub fn check_and_record(
        &self,
        identifier: &str,
        max_requests: u32,
        window_seconds: i64,
    ) -> Result<bool, String> {
        let allowed = self.check_rate_limit(identifier, max_requests, window_seconds)?;
        if allowed {
            self.record_request(identifier)?;
        }
        Ok(allowed)
    }

    /// Clean up old login attempt records
    pub fn cleanup_old_attempts(&self) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        let cutoff_time = Utc::now() - Duration::days(7); // Keep records for 7 days

        conn.execute(
            "DELETE FROM login_attempts WHERE last_attempt < ? OR (is_locked = 0 AND lock_until IS NULL AND last_attempt < ?)",
            params![
                cutoff_time.to_rfc3339(),
                (Utc::now() - self.window_duration).to_rfc3339(),
            ],
        ).map_err(|e| format!("Failed to cleanup old login attempts: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_db() -> crate::db::Database {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let db_path = temp_dir.path().join("test.db");
        crate::db::Database::new(db_path.to_str().expect("Path should be valid UTF-8"), "")
            .expect("Failed to create database")
    }

    #[test]
    fn test_rate_limiting() {
        let db = create_test_db();
        let limiter = RateLimiterService::new(db);
        limiter.init().expect("Failed to init limiter");

        let identifier = "test@example.com";

        // Should not be locked initially
        assert!(!limiter
            .is_locked_out(identifier)
            .expect("Failed to check lockout"));

        // Record failed attempts
        for i in 0..5 {
            limiter
                .record_failed_attempt(identifier)
                .expect("Failed to record attempt");
            let remaining = limiter
                .get_remaining_attempts(identifier)
                .expect("Failed to get remaining");
            assert_eq!(remaining, 5 - (i + 1));
        }

        // Should be locked now
        assert!(limiter
            .is_locked_out(identifier)
            .expect("Failed to check lockout"));

        limiter
            .clear_failed_attempts(identifier)
            .expect("Failed to clear attempts");
        assert!(!limiter
            .is_locked_out(identifier)
            .expect("Failed to check lockout"));
        assert_eq!(
            limiter
                .get_remaining_attempts(identifier)
                .expect("Failed to get remaining"),
            5
        );
    }
}
