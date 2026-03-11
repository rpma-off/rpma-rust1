-- Migration 055: Create organizations table
-- Stores organization/business account configuration
-- Single-row table enforced by CHECK constraint

CREATE TABLE IF NOT EXISTS organizations (
  -- Primary key (always 'default' for single-org mode)
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  
  -- Identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  
  -- Business
  legal_name TEXT,
  tax_id TEXT,
  siret TEXT,
  registration_number TEXT,
  
  -- Contact
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'France',
  
  -- Branding
  logo_url TEXT,
  logo_data TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  accent_color TEXT,
  
  -- Settings JSON blobs
  business_settings TEXT DEFAULT '{}',
  invoice_settings TEXT DEFAULT '{}',
  
  -- Metadata
  industry TEXT,
  company_size TEXT,
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  -- Enforce single org per database
  CHECK (id = 'default')
);

-- Index for single-row enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_single ON organizations(id) WHERE id = 'default';

-- Index for slug lookup
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE slug IS NOT NULL;
