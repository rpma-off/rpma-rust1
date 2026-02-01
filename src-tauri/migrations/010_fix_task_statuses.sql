-- Migration 010: Fix task statuses for intervention workflow
-- This migration ensures tasks are in correct states for intervention workflow

-- Update tasks that are in 'draft' status but have all required fields to 'pending'
UPDATE tasks SET
    status = 'pending',
    updated_at = unixepoch() * 1000
WHERE status = 'draft'
  AND vehicle_plate IS NOT NULL
  AND vehicle_model IS NOT NULL
  AND scheduled_date IS NOT NULL
  AND technician_id IS NOT NULL;

-- Log the changes
SELECT 'Updated ' || changes() || ' tasks from draft to pending status' as migration_result;