-- Migration 060: Add deleted_at column to tables missing it for trash feature
-- Interventions, photos, and intervention_reports had deleted_by (migration 058)
-- but not deleted_at, making the TrashService empty_trash fail at runtime.

ALTER TABLE interventions ADD COLUMN IF NOT EXISTS deleted_at INTEGER DEFAULT NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS deleted_at INTEGER DEFAULT NULL;
ALTER TABLE intervention_reports ADD COLUMN IF NOT EXISTS deleted_at INTEGER DEFAULT NULL;

-- Partial indexes for the common WHERE deleted_at IS NULL filter pattern
CREATE INDEX IF NOT EXISTS idx_interventions_not_deleted
  ON interventions(task_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_photos_not_deleted
  ON photos(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intervention_reports_not_deleted
  ON intervention_reports(id) WHERE deleted_at IS NULL;
