-- Migration 013: Add suppliers table
-- Fixes missing suppliers table referenced in material migration

-- Table: suppliers
-- Master table for all suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE,

  -- Contact information
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT,

  -- Business information
  tax_id TEXT,
  business_license TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 0,

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  is_preferred INTEGER NOT NULL DEFAULT 0,

  -- Quality metrics
  quality_rating REAL DEFAULT 0.0
    CHECK(quality_rating IS NULL OR (quality_rating >= 0.0 AND quality_rating <= 5.0)),
  delivery_rating REAL DEFAULT 0.0
    CHECK(delivery_rating IS NULL OR (delivery_rating >= 0.0 AND delivery_rating <= 5.0)),
  on_time_delivery_rate REAL DEFAULT 0.0
    CHECK(on_time_delivery_rate IS NULL OR (on_time_delivery_rate >= 0.0 AND on_time_delivery_rate <= 100.0)),

  -- Notes
  notes TEXT,
  special_instructions TEXT,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_preferred ON suppliers(is_preferred);