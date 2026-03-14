//! Database setup helpers for integration tests.
//!
//! Every call to [`setup_db`] returns a fresh, isolated in-memory SQLite
//! database. Isolation is guaranteed by embedding a unique UUID in the
//! database URI, so tests running in parallel never share state.
//!
//! The database is fully initialized (schema + all migrations) via the same
//! code path used at production startup.

use rpma_ppf_intervention::db::Database;
use std::sync::Arc;

/// Create a fully-initialized, isolated in-memory SQLite database.
///
/// The returned [`Database`] has:
/// - All schema tables created.
/// - All migrations applied up to the latest version.
/// - No data — each test starts from a clean slate.
///
/// # Panics
///
/// Panics if the in-memory database cannot be created or migrated.
pub async fn setup_db() -> Arc<Database> {
    Arc::new(
        Database::new_in_memory()
            .await
            .expect("harness: failed to create in-memory test database"),
    )
}
