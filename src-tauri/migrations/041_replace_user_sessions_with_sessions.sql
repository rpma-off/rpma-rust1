-- Migration: Replace user_sessions with simplified sessions table
-- This migration drops the old JWT-based user_sessions table and creates
-- a new sessions table using plain UUID tokens stored directly.

CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT    PRIMARY KEY,  -- UUID session token
    user_id       TEXT    NOT NULL,
    username      TEXT    NOT NULL,
    email         TEXT    NOT NULL,
    role          TEXT    NOT NULL,
    created_at    INTEGER NOT NULL,     -- epoch milliseconds
    expires_at    INTEGER NOT NULL,     -- epoch milliseconds
    last_activity INTEGER NOT NULL,     -- epoch milliseconds
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Optional trigger: enforce valid roles
CREATE TRIGGER IF NOT EXISTS validate_sessions_role
BEFORE INSERT ON sessions
FOR EACH ROW
WHEN NEW.role NOT IN ('admin', 'supervisor', 'technician', 'viewer')
BEGIN
    SELECT RAISE(ABORT, 'Invalid role value for sessions table');
END;

-- Drop old JWT-based table (all existing sessions become invalid — expected)
DROP TABLE IF EXISTS user_sessions;
