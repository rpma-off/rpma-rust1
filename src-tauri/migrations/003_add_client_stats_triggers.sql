-- Add triggers to maintain client statistics when tasks are created, updated, or deleted

-- Trigger for task insertion
CREATE TRIGGER IF NOT EXISTS task_insert_update_client_stats AFTER INSERT ON tasks
BEGIN
  -- Only update if task has a client_id
  UPDATE clients
  SET
    total_tasks = total_tasks + 1,
    active_tasks = active_tasks + CASE
      WHEN NEW.status IN ('completed', 'cancelled', 'archived', 'failed', 'invalid') THEN 0
      ELSE 1
    END,
    completed_tasks = completed_tasks + CASE
      WHEN NEW.status = 'completed' THEN 1
      ELSE 0
    END,
    last_task_date = CASE
      WHEN IFNULL(last_task_date, 0) > NEW.created_at THEN last_task_date
      ELSE NEW.created_at
    END
  WHERE id = NEW.client_id AND NEW.client_id IS NOT NULL;
END;

-- Trigger for task update
CREATE TRIGGER IF NOT EXISTS task_update_update_client_stats AFTER UPDATE ON tasks
BEGIN
  -- Handle client_id change or status change
  -- First, decrement from old client if it existed
  UPDATE clients
  SET
    total_tasks = total_tasks - 1,
    active_tasks = active_tasks - CASE
      WHEN OLD.status IN ('completed', 'cancelled', 'archived', 'failed', 'invalid') THEN 0
      ELSE 1
    END,
    completed_tasks = completed_tasks - CASE
      WHEN OLD.status = 'completed' THEN 1
      ELSE 0
    END
  WHERE id = OLD.client_id AND OLD.client_id IS NOT NULL;

  -- Then, increment for new/updated client if it exists
  UPDATE clients
  SET
    total_tasks = total_tasks + 1,
    active_tasks = active_tasks + CASE
      WHEN NEW.status IN ('completed', 'cancelled', 'archived', 'failed', 'invalid') THEN 0
      ELSE 1
    END,
    completed_tasks = completed_tasks + CASE
      WHEN NEW.status = 'completed' THEN 1
      ELSE 0
    END,
    last_task_date = CASE
      WHEN IFNULL(last_task_date, 0) > NEW.updated_at THEN last_task_date
      ELSE NEW.updated_at
    END
  WHERE id = NEW.client_id AND NEW.client_id IS NOT NULL;
END;

-- Trigger for task deletion
CREATE TRIGGER IF NOT EXISTS task_delete_update_client_stats AFTER DELETE ON tasks
BEGIN
  -- Decrement from client if it existed
  UPDATE clients
  SET
    total_tasks = total_tasks - 1,
    active_tasks = active_tasks - CASE
      WHEN OLD.status IN ('completed', 'cancelled', 'archived', 'failed', 'invalid') THEN 0
      ELSE 1
    END,
    completed_tasks = completed_tasks - CASE
      WHEN OLD.status = 'completed' THEN 1
      ELSE 0
    END
  WHERE id = OLD.client_id AND OLD.client_id IS NOT NULL;
END;