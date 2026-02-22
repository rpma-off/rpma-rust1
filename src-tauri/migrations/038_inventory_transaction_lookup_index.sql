-- Improve inventory transaction lookups by material with chronological ordering
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material_performed_at
ON inventory_transactions(material_id, performed_at DESC);
