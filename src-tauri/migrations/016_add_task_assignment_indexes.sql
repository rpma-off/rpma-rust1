-- Add compound index for task assignment validation and conflict detection
-- This index supports efficient queries for checking technician workload and scheduling conflicts

-- Compound index for technician + scheduled_date (for conflict detection and workload checks)
CREATE INDEX IF NOT EXISTS idx_tasks_technician_scheduled_date ON tasks(technician_id, scheduled_date);

-- Additional index for technician + status + scheduled_date (for assignment validation)
CREATE INDEX IF NOT EXISTS idx_tasks_technician_status_scheduled ON tasks(technician_id, status, scheduled_date);