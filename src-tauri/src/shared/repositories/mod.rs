//! Shared repository infrastructure.
//!
//! Base repository traits, caching layer, and factory for creating
//! domain-specific repository instances.

pub mod base;
pub mod cache;
pub mod factory;

// Convenience re-exports for commonly used types
pub use base::Repository;
pub use cache::Cache;
pub use factory::Repositories;
