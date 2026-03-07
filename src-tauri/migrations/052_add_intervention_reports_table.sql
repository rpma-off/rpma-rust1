-- Migration 052: Add intervention_reports table for report persistence
-- Stores metadata about generated intervention reports (INT-YYYY-NNNN format)

CREATE TABLE IF NOT EXISTS intervention_reports (
    id TEXT PRIMARY KEY NOT NULL,
    intervention_id TEXT NOT NULL,
    report_number TEXT NOT NULL UNIQUE,
    generated_at TEXT NOT NULL,
    technician_id TEXT,
    technician_name TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    format TEXT NOT NULL DEFAULT 'pdf',
    status TEXT NOT NULL DEFAULT 'generated',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (intervention_id) REFERENCES interventions(id)
);

-- Index for fast lookups by intervention
CREATE INDEX IF NOT EXISTS idx_intervention_reports_intervention_id ON intervention_reports(intervention_id);

-- Index for report number lookups
CREATE INDEX IF NOT EXISTS idx_intervention_reports_report_number ON intervention_reports(report_number);

-- Index for year-based queries (used by report number generator)
CREATE INDEX IF NOT EXISTS idx_intervention_reports_created_at ON intervention_reports(created_at);
