//! Shared repository infrastructure.
//!
//! Base repository traits, caching layer, and factory for creating
//! domain-specific repository instances.

pub mod base;
pub mod cache;
pub mod cached_repo;
pub mod factory;

// Convenience re-exports for commonly used types
pub use base::Repository;
pub use cache::Cache;
pub use cached_repo::CachedRepository;
pub use factory::Repositories;
