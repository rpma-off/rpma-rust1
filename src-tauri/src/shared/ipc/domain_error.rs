//! Unified domain error → AppError conversion trait.
//!
//! Implement this trait on each domain's error type so IPC handlers can use
//! the uniform `.map_err(IntoDomainError::into_app_error)?` pattern instead
//! of bespoke `map_*_err` helper functions.

use super::errors::AppError;

/// Convert a domain-specific error into the IPC [`AppError`] boundary type.
pub trait IntoDomainError {
    fn into_app_error(self) -> AppError;
}

// ---------------------------------------------------------------------------
// Material domain
// ---------------------------------------------------------------------------

impl IntoDomainError for crate::domains::inventory::infrastructure::material::MaterialError {
    fn into_app_error(self) -> AppError {
        use crate::domains::inventory::infrastructure::material::MaterialError;
        match self {
            MaterialError::Validation(msg)
            | MaterialError::InsufficientStock(msg)
            | MaterialError::ExpiredMaterial(msg) => AppError::Validation(msg),
            MaterialError::Authorization(msg) => AppError::Authorization(msg),
            MaterialError::NotFound(msg) => AppError::NotFound(msg),
            MaterialError::Database(_) => {
                AppError::Database("A database error occurred. Please try again.".to_string())
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Inventory application domain
// ---------------------------------------------------------------------------

impl IntoDomainError for crate::domains::inventory::application::errors::InventoryError {
    fn into_app_error(self) -> AppError {
        use crate::domains::inventory::application::errors::InventoryError;
        match self {
            InventoryError::Validation(msg) => AppError::Validation(msg),
            InventoryError::Authorization(msg) => AppError::Authorization(msg),
            InventoryError::NotFound(msg) => AppError::NotFound(msg),
            InventoryError::Database(_) => {
                AppError::Database("A database error occurred. Please try again.".to_string())
            }
            InventoryError::Domain(e) => {
                use crate::domains::inventory::domain::InventoryDomainError;
                match e {
                    InventoryDomainError::InvalidStock(msg)
                    | InventoryDomainError::InvalidUnit(msg) => AppError::Validation(msg),
                }
            }
        }
    }
}
