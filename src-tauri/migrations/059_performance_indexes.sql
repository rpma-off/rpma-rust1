-- Migration 059: Performance indexes for common CRUD query patterns
-- Partial indexes on active (non-deleted) rows only

CREATE INDEX IF NOT EXISTS idx_tasks_status_active
  ON tasks(status, updated_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_active
  ON tasks(assigned_to) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_client_active
  ON interventions(client_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_task_active
  ON interventions(task_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_materials_category_active
  ON materials(category, name) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_client_status
  ON quotes(client_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id
  ON quote_items(quote_id);

CREATE INDEX IF NOT EXISTS idx_clients_name_active
  ON clients(name) WHERE deleted_at IS NULL;
