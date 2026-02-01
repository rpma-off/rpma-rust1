-- Add user consent table for GDPR compliance
CREATE TABLE IF NOT EXISTS user_consent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    consent_data TEXT NOT NULL, -- JSON blob with consent settings
    updated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_consent_user_id ON user_consent(user_id);