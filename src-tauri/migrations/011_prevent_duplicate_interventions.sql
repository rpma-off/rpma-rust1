-- Migration 011: Add unique constraint for active interventions per task
-- Date: 2025-11-29
-- Description: Prevents duplicate active interventions for the same task
--
-- Problem: The interventions table had no unique constraint on task_id,
-- allowing multiple active interventions to be created for the same task.
-- This caused confusion when users clicked "Start Intervention" multiple times.
--
-- Solution: Add a partial unique index that allows only ONE active intervention
-- per task (pending, in_progress, or paused), while still permitting multiple
-- completed/cancelled interventions for historical records.

-- Step 1: Cleanup existing duplicates (keep most recent per task)
-- Identify and cancel old duplicate interventions
WITH duplicates AS (
  SELECT 
    task_id, 
    id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY task_id 
      ORDER BY created_at DESC
    ) as rn
  FROM interventions
  WHERE status IN ('pending', 'in_progress', 'paused')
)
-- Mark old duplicates as 'cancelled' instead of deleting (preserve data integrity)
UPDATE interventions
SET 
  status = 'cancelled',
  notes = COALESCE(notes || '

', '') || '[AUTO-CANCELLED on ' || datetime('now') || '] Duplicate intervention detected and cancelled during migration 011. This intervention was superseded by a newer intervention for the same task.',
  updated_at = unixepoch() * 1000
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Add unique index to prevent future duplicates
-- This index only applies to active statuses, allowing multiple completed interventions
CREATE UNIQUE INDEX IF NOT EXISTS idx_interventions_active_per_task 
ON interventions(task_id) 
WHERE status IN ('pending', 'in_progress', 'paused');

-- Step 3: Verify the migration
-- This query should return 0 rows after migration
SELECT 
  task_id,
  COUNT(*) as active_intervention_count,
  GROUP_CONCAT(id) as intervention_ids,
  GROUP_CONCAT(status) as statuses,
  GROUP_CONCAT(created_at) as created_timestamps
FROM interventions
WHERE status IN ('pending', 'in_progress', 'paused')
GROUP BY task_id
HAVING COUNT(*) > 1;

-- Expected result: 0 rows (no duplicates remaining)
