-- Migration 040: Add indexes for recent activity and reference lookups
-- Improves dashboard activity queries and inventory transaction reference checks.

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity_user
  ON user_sessions(last_activity DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference_type_number
  ON inventory_transactions(reference_type, reference_number);
