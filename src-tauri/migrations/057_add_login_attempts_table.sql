-- Migration: Add login_attempts table for rate limiting

CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    first_attempt TEXT NOT NULL,
    last_attempt TEXT NOT NULL,
    is_locked INTEGER NOT NULL DEFAULT 0,
    lock_until TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_login_attempts_last_attempt ON login_attempts(last_attempt);
