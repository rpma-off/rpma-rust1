-- Add composite index for tasks client_id and created_at DESC
-- This optimizes the getClientsWithTasks operation which filters tasks by client_id and sorts by created_at DESC

CREATE INDEX IF NOT EXISTS idx_tasks_client_id_created_at ON tasks(client_id, created_at DESC);