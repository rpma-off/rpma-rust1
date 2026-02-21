//! Shared database helpers for bounded contexts.
//!
//! Re-exports `Database` so domains import from `shared::db` instead of the
//! top-level `crate::db` module.  Also hosts cross-cutting repositories that
//! isolate SQL from shared services.

pub(crate) use crate::db::Database;
pub mod performance_repository;
pub mod system_repository;
