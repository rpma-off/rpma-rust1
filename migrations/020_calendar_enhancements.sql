-- Add calendar-specific indexes
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_datetime 
ON tasks(scheduled_date, start_time, end_time) 
WHERE scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_technician_date_status 
ON tasks(technician_id, scheduled_date, status) 
WHERE technician_id IS NOT NULL;

-- Add calendar view for performance
CREATE VIEW IF NOT EXISTS calendar_tasks AS
SELECT 
  t.id,
  t.task_number,
  t.title,
  t.status,
  t.priority,
  t.scheduled_date,
  t.start_time,
  t.end_time,
  t.vehicle_plate,
  t.vehicle_model,
  t.technician_id,
  u.username as technician_name,
  t.client_id,
  c.name as client_name,
  t.estimated_duration,
  t.actual_duration
FROM tasks t
LEFT JOIN users u ON t.technician_id = u.id
LEFT JOIN clients c ON t.client_id = c.id
WHERE t.scheduled_date IS NOT NULL
  AND t.deleted_at IS NULL;

-- Add conflict detection table
CREATE TABLE IF NOT EXISTS task_conflicts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  conflicting_task_id TEXT NOT NULL,
  conflict_type TEXT NOT NULL, -- 'time_overlap', 'technician_overload'
  detected_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (conflicting_task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_conflicts_unresolved 
ON task_conflicts(resolved_at) 
WHERE resolved_at IS NULL;