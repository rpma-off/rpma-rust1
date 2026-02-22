-- Migration 039: Add missing indexes for foreign key columns
-- Ensures FK lookups remain efficient without table scans.

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_current_workflow_step_id ON tasks(current_workflow_step_id);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON suppliers(created_by);
CREATE INDEX IF NOT EXISTS idx_suppliers_updated_by ON suppliers(updated_by);

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
