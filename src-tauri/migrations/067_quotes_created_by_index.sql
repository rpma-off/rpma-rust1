-- Migration 067: Index quotes by creator for user-scoped dashboard queries.
--
-- The quote listing filter "my quotes" (WHERE created_by = ? AND deleted_at IS NULL)
-- previously required a full table scan because no index covered this column.
-- This partial index excludes soft-deleted rows, matching the application's filter pattern.

CREATE INDEX IF NOT EXISTS idx_quotes_created_by
  ON quotes(created_by)
  WHERE deleted_at IS NULL;
