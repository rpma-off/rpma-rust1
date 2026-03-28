-- Migration 068: Composite and partial indexes for calendar_events and inventory_transactions.
--
-- calendar_events had no indexes covering the three most common query patterns:
--   1. find_by_technician  — WHERE deleted_at IS NULL AND technician_id = ? ORDER BY start_datetime
--   2. find_by_task        — WHERE deleted_at IS NULL AND task_id = ?       ORDER BY start_datetime
--   3. find_by_date_range  — WHERE deleted_at IS NULL AND start_datetime >= ? AND end_datetime <= ?
-- Every calendar view load triggered a full table scan.  The partial indexes below
-- (WHERE deleted_at IS NULL) match the application's soft-delete filter exactly,
-- so SQLite can satisfy each query with an index range scan instead.
--
-- inventory_transactions lacked a composite index for the most common list-by-material
-- query pattern: WHERE material_id = ? AND transaction_type = ? ORDER BY performed_at DESC.
-- The composite index covers both the filter columns and the sort column, eliminating
-- the filesort step.

-- calendar_events: technician filter + start_datetime sort
CREATE INDEX IF NOT EXISTS idx_calendar_events_technician_date
  ON calendar_events(technician_id, start_datetime)
  WHERE deleted_at IS NULL;

-- calendar_events: task filter + start_datetime sort
CREATE INDEX IF NOT EXISTS idx_calendar_events_task_date
  ON calendar_events(task_id, start_datetime)
  WHERE deleted_at IS NULL;

-- calendar_events: date-range filter
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_end
  ON calendar_events(start_datetime, end_datetime)
  WHERE deleted_at IS NULL;

-- inventory_transactions: material + type filter + time sort
CREATE INDEX IF NOT EXISTS idx_inventory_txns_material_type_date
  ON inventory_transactions(material_id, transaction_type, performed_at DESC);
