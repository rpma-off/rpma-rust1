-- Migration 034: Add composite index for session activity sorting
-- Optimizes: WHERE user_id = ? AND expires_at > datetime('now') ORDER BY last_activity DESC

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires_activity
  ON user_sessions(user_id, expires_at, last_activity DESC);
