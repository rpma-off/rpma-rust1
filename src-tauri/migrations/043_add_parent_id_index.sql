-- Migration 043: Add missing index on material_categories.parent_id
-- Hierarchical queries on parent_id previously required a full table scan.

CREATE INDEX IF NOT EXISTS idx_material_categories_parent_id ON material_categories(parent_id);
