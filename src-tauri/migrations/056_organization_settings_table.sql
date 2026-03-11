-- Migration 056: Create organization_settings table
-- Key-value store for flexible organization settings

CREATE TABLE IF NOT EXISTS organization_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Index for category-based queries
CREATE INDEX IF NOT EXISTS idx_org_settings_category ON organization_settings(category);

-- Seed default settings
INSERT OR IGNORE INTO organization_settings (key, value, category) VALUES
  ('onboarding_completed', 'false', 'system'),
  ('onboarding_step', '0', 'system'),
  ('default_task_priority', 'medium', 'tasks'),
  ('default_session_timeout', '480', 'security'),
  ('require_2fa', 'false', 'security'),
  ('date_format', 'DD/MM/YYYY', 'regional'),
  ('time_format', '24h', 'regional'),
  ('currency', 'EUR', 'regional'),
  ('language', 'fr', 'regional'),
  ('timezone', 'Europe/Paris', 'regional'),
  ('invoice_prefix', 'INV-', 'invoicing'),
  ('invoice_next_number', '1', 'invoicing'),
  ('quote_prefix', 'QT-', 'invoicing'),
  ('quote_next_number', '1', 'invoicing'),
  ('quote_validity_days', '30', 'invoicing'),
  ('payment_terms', '30', 'invoicing'),
  ('business_hours_start', '08:00', 'business'),
  ('business_hours_end', '18:00', 'business'),
  ('business_days', '["1","2","3","4","5"]', 'business');
