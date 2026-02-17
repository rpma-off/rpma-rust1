use super::errors::InventoryDomainError;

pub(crate) fn ensure_non_negative_stock(current_stock: f64, delta: f64) -> Result<f64, InventoryDomainError> {
    let next = current_stock + delta;
    if next < 0.0 {
        return Err(InventoryDomainError::NegativeStock);
    }
    Ok(next)
}
