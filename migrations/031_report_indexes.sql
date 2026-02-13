-- Migration 031: Add report-optimized indexes
-- These composite indexes support common report query patterns:
-- date range filtering, technician/status/client grouping, and pagination.

-- Composite indexes for report date range + status queries
CREATE INDEX IF NOT EXISTS idx_interventions_created_status ON interventions(created_at, status);
CREATE INDEX IF NOT EXISTS idx_interventions_created_technician ON interventions(created_at, technician_id);
CREATE INDEX IF NOT EXISTS idx_interventions_created_client ON interventions(created_at, client_id);

-- Covering index for task completion report aggregations
CREATE INDEX IF NOT EXISTS idx_interventions_report_task ON interventions(created_at, status, technician_id, client_id);

-- Index for technician performance report grouping
CREATE INDEX IF NOT EXISTS idx_interventions_technician_created ON interventions(technician_id, created_at, status);

-- Index for client analytics report grouping
CREATE INDEX IF NOT EXISTS idx_interventions_client_created ON interventions(client_id, created_at, status);
