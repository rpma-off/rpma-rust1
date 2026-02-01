-- Migration 025: Add comprehensive audit logging system
-- This migration creates the audit_events table and related indexes

-- Create audit_events table for comprehensive security audit trail
CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_id TEXT,
    resource_type TEXT,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    result TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    timestamp INTEGER NOT NULL,
    metadata TEXT,
    session_id TEXT,
    request_id TEXT,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Create indexes for optimal audit log performance
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_result ON audit_events(result);

-- Composite indexes for common audit queries
CREATE INDEX IF NOT EXISTS idx_audit_events_user_timestamp ON audit_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource_timestamp ON audit_events(resource_type, resource_id, timestamp DESC);