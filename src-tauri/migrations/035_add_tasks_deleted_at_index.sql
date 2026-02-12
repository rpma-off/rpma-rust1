-- Migration 035: Add partial index for active tasks (deleted_at IS NULL)
-- Optimizes common WHERE deleted_at IS NULL filters in task queries

CREATE INDEX IF NOT EXISTS idx_tasks_active
  ON tasks(status, created_at)
  WHERE deleted_at IS NULL;
