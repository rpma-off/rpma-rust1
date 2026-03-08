//! Error types for material operations.

/// Service errors for material operations.
#[derive(Debug, thiserror::Error)]
pub enum MaterialError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Authorization error: {0}")]
    Authorization(String),
    #[error("Insufficient stock: {0}")]
    InsufficientStock(String),
    #[error("Expired material: {0}")]
    ExpiredMaterial(String),
}

impl From<String> for MaterialError {
    fn from(s: String) -> Self {
        if s.contains("UNIQUE constraint failed") {
            if s.contains("materials.sku") {
                return Self::Validation("A material with this SKU already exists".to_string());
            }
            if s.contains("materials.id") {
                return Self::Validation("A material with this ID already exists".to_string());
            }
            if s.contains("material_categories.code") {
                return Self::Validation("A category with this code already exists".to_string());
            }
            if s.contains("material_categories.id") {
                return Self::Validation("A category with this ID already exists".to_string());
            }
            if s.contains("suppliers.code") {
                return Self::Validation("A supplier with this code already exists".to_string());
            }
            if s.contains("suppliers.id") {
                return Self::Validation("A supplier with this ID already exists".to_string());
            }
            return Self::Validation(format!("Database constraint violation: {}", s));
        }
        Self::Database(s)
    }
}

impl From<rusqlite::Error> for MaterialError {
    fn from(e: rusqlite::Error) -> Self {
        Self::from(e.to_string())
    }
}

/// Result type for material operations.
pub type MaterialResult<T> = Result<T, MaterialError>;
