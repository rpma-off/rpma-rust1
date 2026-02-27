-- Migration 042: Fix client_statistics view to include 'pending' in active_tasks
-- Also ensures COALESCE for NULL-safe statistics

DROP VIEW IF EXISTS client_statistics;

CREATE VIEW client_statistics AS
SELECT
  c.id,
  c.name,
  c.customer_type,
  c.created_at,
  COALESCE(COUNT(DISTINCT t.id), 0) as total_tasks,
  COALESCE(COUNT(DISTINCT CASE WHEN t.status IN ('pending', 'in_progress') THEN t.id END), 0) as active_tasks,
  COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END), 0) as completed_tasks,
  MAX(t.updated_at) as last_task_date
FROM clients c
LEFT JOIN tasks t ON t.client_id = c.id AND t.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.customer_type, c.created_at;
