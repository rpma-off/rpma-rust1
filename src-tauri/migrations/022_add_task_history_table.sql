-- Migration: 022_add_task_history_table.sql
-- Description: Add task history table for tracking status transitions
-- Created: 2026-01-20

-- Create task_history table for auditing status changes
CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    task_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    changed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    changed_by TEXT, -- User ID who made the change (if available)
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_changed_at ON task_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_task_history_new_status ON task_history(new_status);

-- Create index for performance when filtering by user
CREATE INDEX IF NOT EXISTS idx_task_history_changed_by ON task_history(changed_by) WHERE changed_by IS NOT NULL;