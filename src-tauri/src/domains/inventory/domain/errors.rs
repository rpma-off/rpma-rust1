use thiserror::Error;

#[derive(Debug, Error)]
pub enum InventoryDomainError {
    #[error("Invalid stock change: {0}")]
    InvalidStock(String),
    #[error("Invalid unit of measure: {0}")]
    InvalidUnit(String),
}

pub type InventoryDomainResult<T> = Result<T, InventoryDomainError>;
