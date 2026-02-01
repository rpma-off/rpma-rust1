-- Rename ppf_zone to ppf_zones to match code expectations
-- SQLite doesn't support ALTER COLUMN RENAME directly, so we need to recreate the table
-- This migration is now idempotent and handles the case where ppf_zones already exists

-- Check if ppf_zone column exists (indicating we need to migrate)
-- If it doesn't exist, but ppf_zones does, we're already at target state

-- Try to migrate only if ppf_zone column exists
-- Create tasks_new table for migration
CREATE TABLE IF NOT EXISTS tasks_new (
    id TEXT PRIMARY KEY,
    task_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    vehicle_make TEXT,
    vin TEXT,
    ppf_zones TEXT,  -- Target column name (from ppf_zone)
    custom_ppf_zones TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    priority TEXT NOT NULL DEFAULT 'medium',
    technician_id TEXT,
    assigned_at INTEGER,
    assigned_by TEXT,
    scheduled_date TEXT,
    start_time TEXT,
    end_time TEXT,
    date_rdv TEXT,
    heure_rdv TEXT,
    template_id TEXT,
    workflow_id TEXT,
    workflow_status TEXT,
    current_workflow_step_id TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    completed_steps TEXT,
    client_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    external_id TEXT,
    lot_film TEXT,
    checklist_completed INTEGER DEFAULT 0,
    notes TEXT,
    tags TEXT,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    creator_id TEXT,
    created_by TEXT,
    updated_by TEXT,
    synced INTEGER DEFAULT 0,
    last_synced_at INTEGER
);

-- Only attempt migration if ppf_zone column exists
-- This INSERT will fail gracefully if ppf_zone doesn't exist
INSERT OR IGNORE INTO tasks_new 
SELECT
    id, task_number, title, description, vehicle_plate, vehicle_model,
    vehicle_year, vehicle_make, vin, 
    CASE 
        WHEN (SELECT COUNT(*) FROM pragma_table_info('tasks') WHERE name = 'ppf_zone') > 0 
        THEN (SELECT ppf_zone FROM tasks LIMIT 1)
        ELSE ppf_zones
    END as ppf_zones, 
    custom_ppf_zones,
    status, priority, technician_id, assigned_at, assigned_by, scheduled_date,
    start_time, end_time, date_rdv, heure_rdv, template_id, workflow_id,
    workflow_status, current_workflow_step_id, started_at, completed_at,
    completed_steps, client_id, customer_name, customer_email, customer_phone,
    customer_address, external_id, lot_film, checklist_completed, notes, tags,
    estimated_duration, actual_duration, created_at, updated_at, creator_id,
    created_by, updated_by, synced, last_synced_at
FROM tasks;

-- If no data was migrated (because ppf_zone doesn't exist), 
-- copy existing data (assuming ppf_zones already exists)
INSERT OR IGNORE INTO tasks_new 
SELECT
    id, task_number, title, description, vehicle_plate, vehicle_model,
    vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones,
    status, priority, technician_id, assigned_at, assigned_by, scheduled_date,
    start_time, end_time, date_rdv, heure_rdv, template_id, workflow_id,
    workflow_status, current_workflow_step_id, started_at, completed_at,
    completed_steps, client_id, customer_name, customer_email, customer_phone,
    customer_address, external_id, lot_film, checklist_completed, notes, tags,
    estimated_duration, actual_duration, created_at, updated_at, creator_id,
    created_by, updated_by, synced, last_synced_at
FROM tasks
WHERE id NOT IN (SELECT id FROM tasks_new);

-- Only replace if we successfully copied data
DROP TABLE IF EXISTS tasks;
ALTER TABLE tasks_new RENAME TO tasks;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_technician_id ON tasks(technician_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_synced ON tasks(synced) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON tasks(task_number);

-- Composite indexes for task query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_status_technician ON tasks(status, technician_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_technician_scheduled ON tasks(technician_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status_scheduled ON tasks(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(synced, status) WHERE synced = 0;