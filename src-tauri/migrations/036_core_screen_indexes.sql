-- Migration 036: Add indexes for core screen queries
-- Covers: tasks list, interventions list, materials search

-- Tasks list: soft-delete filter with status and ordering
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_status_created
ON tasks(deleted_at, status, created_at DESC);

-- Tasks list: text search (task_number, title, customer_name) with soft-delete
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_task_number
ON tasks(deleted_at, task_number);

-- Interventions list: task_id lookup for active interventions
CREATE INDEX IF NOT EXISTS idx_interventions_task_created
ON interventions(task_id, created_at DESC);

-- Materials search: active + non-discontinued filter with name sort
CREATE INDEX IF NOT EXISTS idx_materials_active_discontinued
ON materials(is_active, is_discontinued)
WHERE is_active = 1 AND is_discontinued = 0;

-- Materials search: low-stock query optimization
CREATE INDEX IF NOT EXISTS idx_materials_low_stock
ON materials(is_active, is_discontinued, current_stock)
WHERE is_active = 1 AND is_discontinued = 0;

-- Materials search: type filter with active status
CREATE INDEX IF NOT EXISTS idx_materials_type_active
ON materials(material_type, is_active)
WHERE is_active = 1;

-- Materials search: name search covering index
CREATE INDEX IF NOT EXISTS idx_materials_name
ON materials(name);

-- Materials search: SKU exact lookup
CREATE INDEX IF NOT EXISTS idx_materials_sku_active
ON materials(sku, is_active)
WHERE is_active = 1;
