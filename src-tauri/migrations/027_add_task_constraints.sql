-- Migration: 026_add_task_constraints.sql
-- Description: Add CHECK constraints and missing foreign keys to tasks table
-- Created: 2026-02-01
-- Reason: Enforce data integrity at database level for task status and priority

-- Step 1: Create new tasks table with CHECK constraints and foreign keys
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
    ppf_zones TEXT,
    custom_ppf_zones TEXT, -- JSON array
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
    completed_steps TEXT, -- JSON array
    client_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    external_id TEXT,
    lot_film TEXT,
    checklist_completed INTEGER DEFAULT 0, -- BOOLEAN stored as INTEGER
    notes TEXT,
    tags TEXT, -- JSON array
    estimated_duration INTEGER,
    actual_duration INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    creator_id TEXT,
    created_by TEXT,
    updated_by TEXT,

    -- Soft delete
    deleted_at INTEGER,
    deleted_by TEXT,

    synced INTEGER DEFAULT 0,
    last_synced_at INTEGER,

    -- Foreign keys
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,

    -- CHECK constraints for data integrity
    CHECK(status IN (
        'draft', 'scheduled', 'in_progress', 'completed', 'cancelled',
        'on_hold', 'pending', 'invalid', 'archived', 'failed',
        'overdue', 'assigned', 'paused'
    )),
    CHECK(priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Step 2: Copy existing data from old table to new table
-- This preserves all existing data
INSERT INTO tasks_new
SELECT * FROM tasks;

-- Step 3: Drop the old tasks table
DROP TABLE tasks;

-- Step 4: Rename the new table to tasks
ALTER TABLE tasks_new RENAME TO tasks;

-- Step 5: Recreate all indexes for the tasks table
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
