-- Migration 009: Add task_number column to interventions table
-- This fixes the workflow constraints trigger that expects task_number

-- Add task_number column to interventions table
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS task_number TEXT;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_interventions_task_number ON interventions(task_number);

-- Update existing interventions to set task_number from their associated task
UPDATE interventions
SET task_number = (
    SELECT task_number FROM tasks WHERE tasks.id = interventions.task_id
)
WHERE task_number IS NULL;
