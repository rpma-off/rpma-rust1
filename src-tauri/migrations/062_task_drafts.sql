-- Migration 062: Task draft persistence
-- Replaces localStorage-based auto-save with server-side draft storage.
-- One row per user; form_data is a JSON blob of the in-progress TaskFormData.

CREATE TABLE IF NOT EXISTS task_drafts (
    user_id    TEXT    NOT NULL PRIMARY KEY,
    form_data  TEXT    NOT NULL,           -- JSON blob
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
