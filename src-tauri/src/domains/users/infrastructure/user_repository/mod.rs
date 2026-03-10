//! User repository implementation
//!
//! Provides consistent database access patterns for User entities.
//!
//! Implementation is split across focused submodules:
//! - `columns`         — Shared SQL column definitions
//! - `query`           — `UserQuery` filter builder
//! - `read_ops`        — Read-only query operations (find, search, count)
//! - `write_ops`       — Write operations (login updates, admin bootstrap)
//! - `repository_impl` — `Repository<User, String>` trait implementation

use std::sync::Arc;

use crate::db::Database;
use crate::shared::repositories::cache::{Cache, CacheKeyBuilder};

// ── Submodules ────────────────────────────────────────────────────────────────

pub(crate) mod columns;
mod mapping;
pub mod query;
mod read_ops;
mod repository_impl;
mod write_ops;

#[cfg(test)]
mod tests;

// ── Re-exports ────────────────────────────────────────────────────────────────

#[allow(unused_imports)]
pub use query::UserQuery;

// ── UserRepository ────────────────────────────────────────────────────────────

/// User repository for database operations
#[derive(Debug)]
pub struct UserRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl UserRepository {
    /// Create a new UserRepository
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("user"),
        }
    }

    /// Invalidate cache for a specific user
    fn invalidate_user_cache(&self, user_id: &str) {
        self.cache.remove(&self.cache_key_builder.id(user_id));
    }

    /// Invalidate all user caches
    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}
