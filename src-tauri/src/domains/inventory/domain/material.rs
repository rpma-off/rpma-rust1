use crate::domains::inventory::domain::models::material::UnitOfMeasure;

use super::errors::{InventoryDomainError, InventoryDomainResult};

pub const DEFAULT_LOW_STOCK_THRESHOLD: f64 = 0.0;
pub const DEFAULT_RESERVED_STOCK: f64 = 0.0;

pub fn effective_threshold(minimum_stock: Option<f64>) -> f64 {
    minimum_stock.unwrap_or(DEFAULT_LOW_STOCK_THRESHOLD)
}

pub fn effective_reserved_stock(reserved_stock: Option<f64>) -> f64 {
    reserved_stock.unwrap_or(DEFAULT_RESERVED_STOCK)
}

pub fn available_stock(current_stock: f64, reserved_stock: Option<f64>) -> f64 {
    current_stock - effective_reserved_stock(reserved_stock)
}

pub fn is_low_stock_with_policy(
    current_stock: f64,
    minimum_stock: Option<f64>,
    reserved_stock: Option<f64>,
) -> bool {
    available_stock(current_stock, reserved_stock) <= effective_threshold(minimum_stock)
}

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

pub fn validate_unit_of_measure(unit: &UnitOfMeasure) -> InventoryDomainResult<()> {
    match unit {
        UnitOfMeasure::Piece
        | UnitOfMeasure::Meter
        | UnitOfMeasure::Liter
        | UnitOfMeasure::Gram
        | UnitOfMeasure::Roll => Ok(()),
    }
}
