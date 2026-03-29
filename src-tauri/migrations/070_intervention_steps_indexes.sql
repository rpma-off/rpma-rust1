-- Migration 070: Missing indexes on intervention_steps and tasks(client_id, created_at)
--
-- intervention_steps: two queries are hot paths during PPF workflow execution:
--   1. WHERE intervention_id = ? ORDER BY step_number  (load all steps for an intervention)
--   2. WHERE intervention_id = ? AND step_number = ?   (step lookup by number)
-- Neither had an index; both performed full table scans.
--
-- tasks(client_id, created_at): the active-clients stats query joins clients → tasks
-- filtering on client_id AND created_at range. The existing single-column idx_tasks_client_id
-- (migration 039) only covers client_id; the date range filter then scans all matching rows.

CREATE INDEX IF NOT EXISTS idx_intervention_steps_intervention_id
  ON intervention_steps(intervention_id);

CREATE INDEX IF NOT EXISTS idx_intervention_steps_intervention_step
  ON intervention_steps(intervention_id, step_number);

CREATE INDEX IF NOT EXISTS idx_tasks_client_created
  ON tasks(client_id, created_at DESC)
  WHERE deleted_at IS NULL;
