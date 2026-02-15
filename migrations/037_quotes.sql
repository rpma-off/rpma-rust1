-- Migration 037: Create quotes and quote_items tables
-- Implements the Devis (Quotes) feature for PPF interventions

CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY NOT NULL,
    quote_number TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL REFERENCES clients(id),
    task_id TEXT REFERENCES tasks(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    valid_until INTEGER,
    notes TEXT,
    terms TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    vehicle_plate TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    vehicle_vin TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS quote_items (
    id TEXT PRIMARY KEY NOT NULL,
    quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'service' CHECK(kind IN ('labor', 'material', 'service', 'discount')),
    label TEXT NOT NULL,
    description TEXT,
    qty REAL NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    tax_rate REAL,
    material_id TEXT REFERENCES materials(id),
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_task_id ON quotes(task_id);

-- Indexes for quote_items
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_position ON quote_items(quote_id, position);
