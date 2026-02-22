-- Compensating migration: ensure inventory_transactions table exists before creating the index.
-- This table is normally created by migration 024, but may be absent on databases that
-- skipped or partially applied that migration.
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  material_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL
    CHECK(transaction_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'waste', 'return')),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  previous_stock REAL NOT NULL CHECK(previous_stock >= 0),
  new_stock REAL NOT NULL CHECK(new_stock >= 0),
  reference_number TEXT,
  reference_type TEXT,
  notes TEXT,
  unit_cost REAL,
  total_cost REAL,
  warehouse_id TEXT,
  location_from TEXT,
  location_to TEXT,
  batch_number TEXT,
  expiry_date INTEGER,
  quality_status TEXT,
  intervention_id TEXT,
  step_id TEXT,
  performed_by TEXT NOT NULL,
  performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Ensure base indexes exist (idempotent; already present on DBs that ran migration 024)
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material ON inventory_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(performed_at);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_intervention ON inventory_transactions(intervention_id);

-- Improve inventory transaction lookups by material with chronological ordering
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material_performed_at
ON inventory_transactions(material_id, performed_at DESC);
