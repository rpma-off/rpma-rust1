-- Migration 053: Add partial indexes for soft-delete filtering (I-1 perf patch)
--
-- Most query hot-paths filter `WHERE deleted_at IS NULL`.  Adding a partial
-- index lets SQLite use an index scan instead of a full table scan for the
-- large portion of rows that are not soft-deleted.
--
-- tasks: already has idx_tasks_active (partial on status, created_at WHERE
-- deleted_at IS NULL) from migration 035.  Adding a covering partial index
-- specifically for id-lookup and ordering patterns.
--
-- materials: deleted_at column added in migration 050; no index existed yet.

-- Materials: most list/stats queries filter active, non-deleted materials.
CREATE INDEX IF NOT EXISTS idx_materials_not_deleted
  ON materials(is_active, name)
  WHERE deleted_at IS NULL;

-- Interventions: filtered by task_id frequently; no deleted_at column on this
-- table itself, but task_id lookups benefit from a targeted index.
CREATE INDEX IF NOT EXISTS idx_interventions_task_id
  ON interventions(task_id);
