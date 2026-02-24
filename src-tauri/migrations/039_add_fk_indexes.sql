-- Migration 039: Add missing indexes for foreign key columns
-- Ensures FK lookups remain efficient without table scans.

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_current_workflow_step_id ON tasks(current_workflow_step_id);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON suppliers(created_by);
CREATE INDEX IF NOT EXISTS idx_suppliers_updated_by ON suppliers(updated_by);

-- Compensating: ensure material_categories exists before creating its indexes.
-- This table is normally created by migration 024, but may be absent on databases
-- that skipped or only partially applied that migration.
CREATE TABLE IF NOT EXISTS material_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  parent_id TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  color TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,
  FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Material categories
CREATE INDEX IF NOT EXISTS idx_material_categories_created_by ON material_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_material_categories_updated_by ON material_categories(updated_by);

-- Materials
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_updated_by ON materials(updated_by);

-- Material consumption
CREATE INDEX IF NOT EXISTS idx_material_consumption_recorded_by ON material_consumption(recorded_by);

-- Inventory transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_step_id ON inventory_transactions(step_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON inventory_transactions(performed_by);

-- Quotes
CREATE INDEX IF NOT EXISTS idx_quote_items_material_id ON quote_items(material_id);

-- Calendar events
CREATE INDEX IF NOT EXISTS idx_events_parent_event ON calendar_events(parent_event_id);
