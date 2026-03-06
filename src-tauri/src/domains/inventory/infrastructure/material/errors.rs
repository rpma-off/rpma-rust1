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
        Self::Database(s)
    }
}

impl From<rusqlite::Error> for MaterialError {
    fn from(e: rusqlite::Error) -> Self {
        Self::Database(e.to_string())
    }
}

/// Result type for material operations.
pub type MaterialResult<T> = Result<T, MaterialError>;
