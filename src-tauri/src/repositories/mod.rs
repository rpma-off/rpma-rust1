//! Database repositories for consistent data access patterns
//!
//! This module provides shared repository infrastructure (base trait,
//! cache, factory). Domain-specific repository implementations now live
//! under their respective bounded contexts in
//! `crate::domains::<domain>::infrastructure`.

// Base infrastructure
pub mod base;
pub mod cache;
pub mod factory;

// Re-exports — only items with remaining external consumers
pub use base::Repository;
pub use cache::Cache;
pub use factory::Repositories;
