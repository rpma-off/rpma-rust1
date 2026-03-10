//! Material repository implementation
//!
//! Provides consistent database access patterns for Material entities.
//!
//! Implementation is split across focused submodules:
//! - `columns`         — Shared SQL column definitions
//! - `query`           — `MaterialQuery` filter builder
//! - `read_ops`        — Read-only query operations (find, search, count)
//! - `write_ops`       — Write operations (stock updates)
//! - `repository_impl` — `Repository<Material, String>` trait implementation

use std::sync::Arc;

use crate::db::Database;
use crate::shared::repositories::cache::{Cache, CacheKeyBuilder};

// ── Submodules ────────────────────────────────────────────────────────────────

pub(crate) mod columns;
pub mod query;
mod read_ops;
mod repository_impl;
mod write_ops;

#[cfg(test)]
mod tests;

// ── Re-exports ────────────────────────────────────────────────────────────────

// Re-exported for use by external test suites (`tests/unit/material_repository_tests.rs`).
#[allow(unused_imports)]
pub use query::MaterialQuery;

// ── MaterialRepository ────────────────────────────────────────────────────────

/// Material repository for database operations
pub struct MaterialRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl MaterialRepository {
    /// Create a new MaterialRepository
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("material"),
        }
    }

    /// Get access to the underlying database for direct queries
    /// This is a temporary method for refactoring - should be removed once all queries use repository pattern
    pub fn get_db(&self) -> &Arc<Database> {
        &self.db
    }

    /// Invalidate cache for a specific material
    fn invalidate_material_cache(&self, material_id: &str) {
        self.cache.remove(&self.cache_key_builder.id(material_id));
    }

    /// Invalidate all material caches
    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}
