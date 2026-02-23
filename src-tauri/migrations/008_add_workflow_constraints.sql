-- Add foreign key constraints and synchronization triggers for Task/Intervention workflow
-- This migration addresses the critical database schema issues identified in the intervention audit
-- NOTE: ALTER TABLE ADD CONSTRAINT is not supported in SQLite.
-- Foreign key constraints for tasks.workflow_id and tasks.current_workflow_step_id
-- are enforced in schema.sql for new databases.
-- For existing databases, migration 033 performs the necessary table rebuild.

-- Ensure only one active intervention per task
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_intervention_per_task
ON interventions(task_id)
WHERE status IN ('pending', 'in_progress', 'paused');

-- Create trigger to synchronize Task state when Intervention is created
-- Note: workflow_id, status and started_at are set by application code in link_task_to_intervention
-- This trigger serves as a defensive measure in case of race conditions
DROP TRIGGER IF EXISTS sync_task_on_intervention_start;
CREATE TRIGGER sync_task_on_intervention_start
    AFTER INSERT ON interventions
BEGIN
    -- Only update if task not yet linked (defensive check)
    -- Status and started_at are handled by application code
    UPDATE tasks SET workflow_id = NEW.id
    WHERE task_number = NEW.task_number AND workflow_id IS NULL;
END;

-- Create trigger to synchronize Task state when Intervention is updated
DROP TRIGGER IF EXISTS sync_task_on_intervention_update;
CREATE TRIGGER sync_task_on_intervention_update
    AFTER UPDATE ON interventions
BEGIN
    -- Update task status based on intervention status
    UPDATE tasks SET
        status = CASE
            WHEN NEW.status = 'completed' THEN 'completed'
            WHEN NEW.status = 'cancelled' THEN 'cancelled'
            WHEN NEW.status = 'paused' THEN 'paused'
            ELSE 'in_progress'
        END,
        completed_at = CASE
            WHEN NEW.status = 'completed' THEN NEW.completed_at
            ELSE NULL
        END
    WHERE workflow_id = NEW.id;
END;

-- Create trigger to clean up Task references when Intervention is deleted
DROP TRIGGER IF EXISTS cleanup_task_on_intervention_delete;
CREATE TRIGGER cleanup_task_on_intervention_delete
    AFTER DELETE ON interventions
BEGIN
    UPDATE tasks SET
        workflow_id = NULL,
        current_workflow_step_id = NULL,
        status = 'draft'
    WHERE workflow_id = OLD.id;
END;

-- Create trigger to synchronize Task current step when Intervention step is updated
DROP TRIGGER IF EXISTS sync_task_current_step;
CREATE TRIGGER sync_task_current_step
    AFTER UPDATE ON intervention_steps
BEGIN
    -- Update task's current_workflow_step_id when step status changes to 'in_progress'
    UPDATE tasks SET
        current_workflow_step_id = CASE
            WHEN NEW.step_status = 'in_progress' THEN NEW.id
            ELSE current_workflow_step_id
        END
    WHERE workflow_id = (
        SELECT intervention_id FROM intervention_steps WHERE id = NEW.id
    );
END;