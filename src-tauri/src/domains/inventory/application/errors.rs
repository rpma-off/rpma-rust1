use thiserror::Error;

use crate::domains::inventory::infrastructure::MaterialError;

use crate::domains::inventory::domain::InventoryDomainError;

#[derive(Debug, Error)]
pub enum InventoryError {
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Authorization error: {0}")]
    Authorization(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Database error: {0}")]
    Database(String),
    #[error("Domain error: {0}")]
    Domain(#[from] InventoryDomainError),
}

pub type InventoryResult<T> = Result<T, InventoryError>;

impl From<MaterialError> for InventoryError {
    fn from(error: MaterialError) -> Self {
        match error {
            MaterialError::Validation(msg)
            | MaterialError::InsufficientStock(msg)
            | MaterialError::ExpiredMaterial(msg) => InventoryError::Validation(msg),
            MaterialError::Authorization(msg) => InventoryError::Authorization(msg),
            MaterialError::NotFound(msg) => InventoryError::NotFound(msg),
            MaterialError::Database(msg) => InventoryError::Database(msg),
        }
    }
}
