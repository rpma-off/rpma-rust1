//! Shared SQL column definitions for the `materials` table.
//!
//! Centralises the SELECT column list so that every query stays in sync when
//! the schema evolves.

/// Standard SELECT column list for the `materials` table.
pub(super) const MATERIAL_COLUMNS: &str = r#"
    id, sku, name, description, material_type, category, subcategory, category_id,
    brand, model, specifications,
    unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point,
    unit_cost, currency,
    supplier_id, supplier_name, supplier_sku,
    quality_grade, certification, expiry_date, batch_number, serial_numbers,
    is_active, is_discontinued,
    storage_location, warehouse_id,
    created_at, updated_at, created_by, updated_by,
    deleted_at, deleted_by,
    synced, last_synced_at
"#;
