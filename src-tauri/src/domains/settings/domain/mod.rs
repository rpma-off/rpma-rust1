//! Domain layer for the settings domain (ADR-001).
//!
//! Re-exports domain models and the repository trait contracts.

pub use crate::domains::settings::models::*;
pub mod repositories;
pub use repositories::*;
