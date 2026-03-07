-- Migration 051: Soft delete support for quotes table
-- Adds `deleted_at` column so that deleted quotes are preserved in the
-- database for audit purposes but excluded from all normal queries.

-- Idempotent: ALTER TABLE … ADD COLUMN IF NOT EXISTS
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deleted_at INTEGER DEFAULT NULL;

-- Index to speed up the `WHERE deleted_at IS NULL` filter used on every query
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at);
