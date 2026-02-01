-- Migration 024: Enhanced inventory management system
-- Adds inventory_transactions and material_categories tables for complete inventory tracking

-- Table: material_categories
-- Hierarchical categorization system for materials
CREATE TABLE IF NOT EXISTS material_categories (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE,

  -- Hierarchy
  parent_id TEXT,
  level INTEGER NOT NULL DEFAULT 1,

  -- Description and metadata
  description TEXT,
  color TEXT, -- Hex color for UI display

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for material_categories
CREATE INDEX IF NOT EXISTS idx_material_categories_parent ON material_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_material_categories_level ON material_categories(level);
CREATE INDEX IF NOT EXISTS idx_material_categories_active ON material_categories(is_active);

-- Table: inventory_transactions
-- Tracks all inventory movements (in/out/adjustments)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  material_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL
    CHECK(transaction_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'waste', 'return')),

  -- Quantities
  quantity REAL NOT NULL,
  previous_stock REAL NOT NULL,
  new_stock REAL NOT NULL,

  -- Transaction details
  reference_number TEXT, -- PO number, intervention ID, etc.
  reference_type TEXT, -- 'purchase_order', 'intervention', 'manual_adjustment', etc.
  notes TEXT,

  -- Cost tracking
  unit_cost REAL,
  total_cost REAL,

  -- Location tracking
  warehouse_id TEXT,
  location_from TEXT,
  location_to TEXT,

  -- Quality and batch tracking
  batch_number TEXT,
  expiry_date INTEGER,
  quality_status TEXT,

  -- Workflow integration
  intervention_id TEXT,
  step_id TEXT,

  -- User and audit
  performed_by TEXT NOT NULL,
  performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for inventory_transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material ON inventory_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(performed_at);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_intervention ON inventory_transactions(intervention_id);

-- Update materials table to include category reference
ALTER TABLE materials ADD COLUMN category_id TEXT REFERENCES material_categories(id) ON DELETE SET NULL;

-- Update existing suppliers table to include material categories if not already present
-- (This would be handled in a separate migration if needed)

-- Insert some default material categories
INSERT OR IGNORE INTO material_categories (id, name, code, level, description, color, created_at, updated_at)
VALUES
  ('cat_ppf_films', 'PPF Films', 'PPF', 1, 'Paint Protection Films', '#3B82F6', unixepoch() * 1000, unixepoch() * 1000),
  ('cat_adhesives', 'Adhesives', 'ADH', 1, 'Adhesive products', '#10B981', unixepoch() * 1000, unixepoch() * 1000),
  ('cat_cleaning', 'Cleaning Solutions', 'CLN', 1, 'Cleaning and preparation products', '#F59E0B', unixepoch() * 1000, unixepoch() * 1000),
  ('cat_tools', 'Tools & Equipment', 'TLS', 1, 'Tools and installation equipment', '#EF4444', unixepoch() * 1000, unixepoch() * 1000),
  ('cat_consumables', 'Consumables', 'CON', 1, 'Consumable supplies', '#8B5CF6', unixepoch() * 1000, unixepoch() * 1000);</content>
<parameter name="filePath">D:\rpma-rust\src-tauri\migrations\024_add_inventory_management.sql