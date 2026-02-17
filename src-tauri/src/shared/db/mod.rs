//! Shared database helpers for bounded contexts.
//!
//! Re-exports `Database` so domains import from `shared::db` instead of the
//! top-level `crate::db` module.

pub(crate) use crate::db::Database;
