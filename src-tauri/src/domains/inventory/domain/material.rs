use crate::domains::inventory::domain::models::material::UnitOfMeasure;

use super::errors::{InventoryDomainError, InventoryDomainResult};

/// Fallback low-stock threshold used when a material has no `minimum_stock` configured.
///
/// A value of `0.0` means a material is only flagged as low-stock when its
/// available stock has reached zero.  Change this constant to apply a different
/// global default; all SQL queries and domain helpers read from here so the
/// policy stays centralized in one place.
pub const DEFAULT_LOW_STOCK_THRESHOLD: f64 = 0.0;

/// Assumed reserved-stock value used in domain calculations.
/// The `materials` table has no `reserved_stock` column; this constant captures
/// that assumption explicitly so that `effective_reserved_stock` and
/// `is_low_stock_with_policy` remain correct if a column is added later.
pub const DEFAULT_RESERVED_STOCK: f64 = 0.0;

/// TODO: document
pub fn effective_threshold(minimum_stock: Option<f64>) -> f64 {
    minimum_stock.unwrap_or(DEFAULT_LOW_STOCK_THRESHOLD)
}

/// TODO: document
pub fn effective_reserved_stock(reserved_stock: Option<f64>) -> f64 {
    reserved_stock.unwrap_or(DEFAULT_RESERVED_STOCK)
}

/// TODO: document
pub fn available_stock(current_stock: f64, reserved_stock: Option<f64>) -> f64 {
    current_stock - effective_reserved_stock(reserved_stock)
}

/// TODO: document
pub fn is_low_stock_with_policy(
    current_stock: f64,
    minimum_stock: Option<f64>,
    reserved_stock: Option<f64>,
) -> bool {
    available_stock(current_stock, reserved_stock) <= effective_threshold(minimum_stock)
}

/// TODO: document
pub fn validate_stock_change(current_stock: f64, delta: f64) -> InventoryDomainResult<f64> {
    if !current_stock.is_finite() || !delta.is_finite() {
        return Err(InventoryDomainError::InvalidStock(
            "Stock values must be finite".to_string(),
        ));
    }

    let new_stock = current_stock + delta;
    if new_stock < 0.0 {
        return Err(InventoryDomainError::InvalidStock(format!(
            "Stock cannot go negative (current: {}, delta: {})",
            current_stock, delta
        )));
    }

    Ok(new_stock)
}

/// TODO: document
pub fn validate_unit_of_measure(unit: &UnitOfMeasure) -> InventoryDomainResult<()> {
    match unit {
        UnitOfMeasure::Piece
        | UnitOfMeasure::Meter
        | UnitOfMeasure::Liter
        | UnitOfMeasure::Gram
        | UnitOfMeasure::Roll => Ok(()),
    }
}
