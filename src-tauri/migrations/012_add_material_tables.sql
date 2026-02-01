-- Migration 012: Add material tracking tables
-- Adds materials and material_consumption tables for material usage reporting

-- Table: materials (PRD-08: Material Tracking)
-- Master table for all materials used in interventions
CREATE TABLE IF NOT EXISTS materials (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Material type and category
  material_type TEXT NOT NULL
    CHECK(material_type IN ('ppf_film', 'adhesive', 'cleaning_solution', 'tool', 'consumable')),
  category TEXT,
  subcategory TEXT,

  -- Specifications
  brand TEXT,
  model TEXT,
  specifications TEXT, -- JSON field for detailed specs

  -- Inventory
  unit_of_measure TEXT NOT NULL DEFAULT 'piece'
    CHECK(unit_of_measure IN ('piece', 'meter', 'liter', 'gram', 'roll')),
  current_stock REAL NOT NULL DEFAULT 0,
  minimum_stock REAL DEFAULT 0,
  maximum_stock REAL,
  reorder_point REAL,

  -- Pricing
  unit_cost REAL,
  currency TEXT DEFAULT 'EUR',

  -- Supplier information
  supplier_id TEXT,
  supplier_name TEXT,
  supplier_sku TEXT,

  -- Quality and compliance
  quality_grade TEXT,
  certification TEXT,
  expiry_date INTEGER,
  batch_number TEXT,
  serial_numbers TEXT, -- JSON array for tracked items

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  is_discontinued INTEGER NOT NULL DEFAULT 0,

  -- Location
  storage_location TEXT,
  warehouse_id TEXT,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for materials
CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type);
CREATE INDEX IF NOT EXISTS idx_materials_supplier ON materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);

-- Table: material_consumption (PRD-08: Material Tracking)
-- Tracks material usage per intervention for cost calculation and inventory management
CREATE TABLE IF NOT EXISTS material_consumption (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  intervention_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  step_id TEXT,

  -- Consumption details
  quantity_used REAL NOT NULL,
  unit_cost REAL,
  total_cost REAL,
  waste_quantity REAL DEFAULT 0,
  waste_reason TEXT,

  -- Quality tracking
  batch_used TEXT,
  expiry_used INTEGER,
  quality_notes TEXT,

  -- Workflow integration
  step_number INTEGER,
  recorded_by TEXT,
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for material_consumption
CREATE INDEX IF NOT EXISTS idx_material_consumption_intervention ON material_consumption(intervention_id);
CREATE INDEX IF NOT EXISTS idx_material_consumption_material ON material_consumption(material_id);
CREATE INDEX IF NOT EXISTS idx_material_consumption_step ON material_consumption(step_id);