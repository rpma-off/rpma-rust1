-- Migration 047: Add missing columns to quotes table and create quote_attachments
-- Fixes DATABASE_ERROR on quote_list and quote_create caused by missing columns

-- Add missing columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_value INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_amount INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS public_token TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shared_at INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS last_viewed_at INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_message TEXT;

-- Index for public token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token) WHERE public_token IS NOT NULL;

-- Create quote_attachments table if it doesn't exist
CREATE TABLE IF NOT EXISTS quote_attachments (
    id TEXT PRIMARY KEY NOT NULL,
    quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    attachment_type TEXT NOT NULL DEFAULT 'other' CHECK(attachment_type IN ('image', 'document', 'other')),
    description TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_quote_attachments_quote_id ON quote_attachments(quote_id);
