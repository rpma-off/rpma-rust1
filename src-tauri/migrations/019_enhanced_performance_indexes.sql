-- Enhanced database indexing for Phase 1 performance improvements
-- Adds composite indexes for complex query patterns identified in analysis

-- Composite index for task queries with multiple filters (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority_scheduled_date
ON tasks (status, priority DESC, scheduled_date ASC);

-- Composite index for technician workload queries
CREATE INDEX IF NOT EXISTS idx_tasks_technician_status_priority
ON tasks (technician_id, status, priority DESC);

-- Composite index for date range queries (common in reporting)
CREATE INDEX IF NOT EXISTS idx_tasks_created_status_scheduled
ON tasks (created_at DESC, status, scheduled_date);

-- Composite index for client-based task queries
CREATE INDEX IF NOT EXISTS idx_tasks_client_status_priority
ON tasks (client_id, status, priority DESC);

-- Composite index for intervention queries (task + intervention patterns)
CREATE INDEX IF NOT EXISTS idx_interventions_task_created
ON interventions (task_id, created_at DESC);

-- Composite index for intervention status queries
CREATE INDEX IF NOT EXISTS idx_interventions_status_created
ON interventions (status, created_at DESC);

-- Composite index for workflow step queries
CREATE INDEX IF NOT EXISTS idx_interventions_current_step_status
ON interventions (current_step, status);

-- Composite index for client search and filtering
CREATE INDEX IF NOT EXISTS idx_clients_name_type_active
ON clients (name, customer_type, deleted_at);

-- Composite index for user role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role_active
ON users (role, is_active);

-- Partial index for active tasks only (reduces index size)
CREATE INDEX IF NOT EXISTS idx_tasks_active_only
ON tasks (id, technician_id, priority, scheduled_date)
WHERE status IN ('pending', 'in_progress', 'assigned');

-- Partial index for incomplete interventions
CREATE INDEX IF NOT EXISTS idx_interventions_incomplete
ON interventions (id, task_id, current_step, status)
WHERE status NOT IN ('completed', 'cancelled');

-- Index for task search patterns (title + description)
CREATE INDEX IF NOT EXISTS idx_tasks_title_description
ON tasks (title, description)
WHERE title IS NOT NULL;

-- Index for vehicle plate lookups (case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle_plate_lower
ON tasks (LOWER(vehicle_plate))
WHERE vehicle_plate IS NOT NULL;

-- Composite index for audit log queries (time-based filtering)
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp_setting_type
ON settings_audit_log (timestamp DESC, setting_type);

-- Index for cache metadata queries  
CREATE INDEX IF NOT EXISTS idx_cache_metadata_updated
ON cache_metadata (updated_at DESC);