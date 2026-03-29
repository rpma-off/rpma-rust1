-- Migration 069: Composite and covering indexes for high-traffic query patterns.
--
-- Six indexes address full-table scans identified in the performance audit:
--
--   photos (2 indexes)
--     Queries on intervention_id or step_id with ORDER BY captured_at DESC
--     had no composite index; SQLite performed a full scan + filesort.
--
--   interventions (1 index)
--     Active-intervention lookups filter on task_id + status and sort by
--     created_at DESC.  The existing idx_interventions_task_id only covers
--     the task_id column; adding status and created_at turns it into a
--     covering index for this common hot path.
--
--   materials (2 indexes)
--     Dashboard stats queries aggregate over is_active / material_type with
--     deleted_at IS NULL filters, but no composite index existed.  Both
--     GROUP BY and WHERE-only aggregation paths are covered.
--
--   tasks (1 index)
--     Paginated task lists commonly filter on status + technician_id and sort
--     by created_at DESC.  The existing single-column indexes require SQLite
--     to choose one and then filter/sort the remainder in memory.

-- photos: covering index for WHERE intervention_id = ? ORDER BY captured_at DESC
CREATE INDEX IF NOT EXISTS idx_photos_intervention_captured
  ON photos(intervention_id, captured_at DESC)
  WHERE deleted_at IS NULL;

-- photos: covering index for WHERE step_id = ? ORDER BY captured_at DESC
CREATE INDEX IF NOT EXISTS idx_photos_step_captured
  ON photos(step_id, captured_at DESC)
  WHERE deleted_at IS NULL;

-- interventions: covering index for task_id + status filter + created_at sort
CREATE INDEX IF NOT EXISTS idx_interventions_task_status_created
  ON interventions(task_id, status, created_at DESC);

-- materials: covering index for stats aggregation (is_active filter, no GROUP BY)
CREATE INDEX IF NOT EXISTS idx_materials_active_deleted
  ON materials(is_active);

-- materials: covering index for GROUP BY material_type stats (type + active filter)
CREATE INDEX IF NOT EXISTS idx_materials_type_active
  ON materials(material_type, is_active);

-- tasks: covering index for status + technician_id filter + created_at sort
CREATE INDEX IF NOT EXISTS idx_tasks_status_technician_created
  ON tasks(status, technician_id, created_at DESC)
  WHERE deleted_at IS NULL;
