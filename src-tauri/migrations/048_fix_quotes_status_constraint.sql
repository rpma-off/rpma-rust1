-- Migration 048: Fix quotes status CHECK constraint
-- Adds 'converted' and 'changes_requested' to the allowed status values.
-- SQLite does not support ALTER TABLE to modify CHECK constraints, so the
-- table is reconstructed in-place.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS quotes_new (
    id TEXT PRIMARY KEY NOT NULL,
    quote_number TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL REFERENCES clients(id),
    task_id TEXT REFERENCES tasks(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'changes_requested')),
    valid_until INTEGER,
    description TEXT,
    notes TEXT,
    terms TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    discount_type TEXT,
    discount_value INTEGER,
    discount_amount INTEGER,
    vehicle_plate TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    vehicle_vin TEXT,
    public_token TEXT,
    shared_at INTEGER,
    view_count INTEGER NOT NULL DEFAULT 0,
    last_viewed_at INTEGER,
    customer_message TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    created_by TEXT
);

INSERT INTO quotes_new
SELECT
    id, quote_number, client_id, task_id, status,
    valid_until, description, notes, terms,
    subtotal, tax_total, total,
    discount_type, discount_value, discount_amount,
    vehicle_plate, vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
    public_token, shared_at,
    COALESCE(view_count, 0),
    last_viewed_at, customer_message,
    created_at, updated_at, created_by
FROM quotes;

DROP TABLE quotes;
ALTER TABLE quotes_new RENAME TO quotes;

-- Recreate all indexes
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_task_id ON quotes(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token) WHERE public_token IS NOT NULL;

PRAGMA foreign_keys = ON;
