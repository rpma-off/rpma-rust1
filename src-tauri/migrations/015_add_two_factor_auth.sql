-- Migration 015: Add Two-Factor Authentication support
-- Adds 2FA columns to users table and creates backup codes table

-- Add 2FA columns to users table
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;

-- Create two_factor_backup_codes table
CREATE TABLE two_factor_backup_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    used_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for efficient lookup
CREATE INDEX idx_two_factor_backup_codes_user_id ON two_factor_backup_codes(user_id);

-- Create two_factor_attempts audit table
CREATE TABLE two_factor_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    attempt_type TEXT NOT NULL, -- 'setup', 'verification', 'backup_code'
    success INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for audit queries
CREATE INDEX idx_two_factor_attempts_user_id ON two_factor_attempts(user_id);
CREATE INDEX idx_two_factor_attempts_created_at ON two_factor_attempts(created_at);