//! Inventory domain — material and inventory tracking
//!
//! This module re-exports all inventory-related components across layers.

// Models
pub use crate::models::material::{Material, MaterialCategory, MaterialType};

// Services
pub use crate::services::material::MaterialService;

// Repositories
pub use crate::repositories::material_repository::MaterialRepository;
