-- Add settings audit log table for tracking settings changes
CREATE TABLE IF NOT EXISTS settings_audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    setting_type TEXT NOT NULL, -- 'profile', 'preferences', 'security', 'accessibility', 'notifications', 'performance'
    details TEXT NOT NULL, -- JSON string with change details
    timestamp INTEGER NOT NULL, -- Unix timestamp in milliseconds
    ip_address TEXT, -- Optional IP address for security tracking
    user_agent TEXT, -- Optional user agent string
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_settings_audit_user_timestamp ON settings_audit_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_settings_audit_type_timestamp ON settings_audit_log(setting_type, timestamp DESC);

-- Add updated_at column to user_settings if it doesn't exist
ALTER TABLE user_settings ADD COLUMN updated_at INTEGER DEFAULT 0;