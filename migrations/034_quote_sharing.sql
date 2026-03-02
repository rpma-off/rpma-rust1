-- Migration: Add public sharing and customer response support to quotes
-- Version: 034_quote_sharing.sql
-- Description: Add fields for sharing quotes publicly and handling customer responses

-- Add description field (separate from notes - public vs internal)
ALTER TABLE quotes ADD COLUMN description TEXT;

-- Add public sharing fields
ALTER TABLE quotes ADD COLUMN public_token TEXT UNIQUE;
ALTER TABLE quotes ADD COLUMN shared_at INTEGER;
ALTER TABLE quotes ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE quotes ADD COLUMN last_viewed_at INTEGER;

-- Add customer response fields
ALTER TABLE quotes ADD COLUMN customer_message TEXT;

-- Index for public token lookup (with partial index for non-null tokens)
CREATE INDEX IF NOT EXISTS idx_quotes_public_token 
ON quotes(public_token) 
WHERE public_token IS NOT NULL;

-- Index for status filtering (performance improvement)
CREATE INDEX IF NOT EXISTS idx_quotes_status 
ON quotes(status);

-- Ensure view_count has a default for existing records
UPDATE quotes SET view_count = 0 WHERE view_count IS NULL;
