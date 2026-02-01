-- Add indexes for common task query patterns to improve performance

-- Index for status filtering (common in task lists)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Index for technician_id filtering
CREATE INDEX IF NOT EXISTS idx_tasks_technician_id ON tasks(technician_id);

-- Index for priority sorting
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Index for scheduled_date filtering and sorting
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);

-- Composite index for status + created_at (common dashboard queries)
CREATE INDEX IF NOT EXISTS idx_tasks_status_created_at ON tasks(status, created_at DESC);

-- Composite index for technician + status (technician dashboards)
CREATE INDEX IF NOT EXISTS idx_tasks_technician_status ON tasks(technician_id, status);

-- Index for search operations on title
CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);

-- Index for search operations on vehicle_plate
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle_plate ON tasks(vehicle_plate);