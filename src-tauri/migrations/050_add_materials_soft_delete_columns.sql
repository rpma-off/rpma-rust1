-- Migration 050: Add soft-delete audit columns to materials
-- Adds deleted_at and deleted_by columns used by the soft-delete path in MaterialService.
-- Both columns are nullable so existing rows remain valid.
ALTER TABLE materials ADD COLUMN IF NOT EXISTS deleted_at INTEGER;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS deleted_by TEXT REFERENCES users(id) ON DELETE SET NULL;
