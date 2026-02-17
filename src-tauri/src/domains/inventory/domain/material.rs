use crate::models::material::UnitOfMeasure;

use super::errors::{InventoryDomainError, InventoryDomainResult};

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
