//! Shared connection and transaction helpers.
//!
//! These wrappers provide a stable service-layer API for DB access while
//! allowing gradual migration away from direct `Database` usage.

use crate::shared::error::{AppError, AppResult};

pub type DbConn = crate::db::PooledConn;
pub type DbTx<'a> = rusqlite::Transaction<'a>;

/// Acquires a pooled connection and executes `f` within it.
pub fn with_db_connection<T, F>(db: &crate::db::Database, f: F) -> AppResult<T>
where
    F: FnOnce(&DbConn) -> AppResult<T>,
{
    let conn = db
        .get_connection()
        .map_err(|error| AppError::db_sanitized("db.get_connection", error))?;
    f(&conn)
}

/// Opens a transaction, executes `f`, and commits on success or rolls back on error.
pub fn with_db_transaction<T, F>(db: &crate::db::Database, f: F) -> AppResult<T>
where
    F: FnOnce(&DbTx<'_>) -> AppResult<T>,
{
    db.with_transaction(|tx| f(tx).map_err(|error| error.to_string()))
        .map_err(|error| AppError::db_sanitized("db.with_transaction", error))
}
