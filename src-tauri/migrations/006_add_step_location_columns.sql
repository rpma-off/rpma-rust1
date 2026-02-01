-- Migration 006: Add location columns to intervention_steps table
-- This migration adds GPS location tracking columns to the intervention_steps table

-- Add location columns to intervention_steps table
ALTER TABLE intervention_steps ADD COLUMN location_lat REAL
    CHECK(location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90));
ALTER TABLE intervention_steps ADD COLUMN location_lon REAL
    CHECK(location_lon IS NULL OR (location_lon >= -180 AND location_lon <= 180));
ALTER TABLE intervention_steps ADD COLUMN location_accuracy REAL;