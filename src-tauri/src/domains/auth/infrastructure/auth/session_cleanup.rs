//! Expired-session housekeeping.

use chrono::Utc;

impl super::AuthService {
    /// Clean up expired sessions from database
    pub fn cleanup_expired_sessions(&self) -> Result<usize, String> {
        let now_ms = Utc::now().timestamp_millis();
        let deleted_count = self
            .session_repository
            .cleanup_expired(now_ms)
            .map_err(|e| format!("Failed to cleanup expired sessions: {}", e))?;

        if deleted_count > 0 {
            let mut details = std::collections::HashMap::new();
            details.insert(
                "sessions_cleaned".to_string(),
                serde_json::json!(deleted_count),
            );
            let _ = self
                .security_monitor
                .log_suspicious_activity(None, "session_cleanup", details);
        }

        Ok(deleted_count)
    }
}
