//! Backward-compatibility shim for the clients domain.
//!
//! All real implementations have been moved to the 4-layer structure:
//! - Domain models  → `crate::domains::clients::domain::models`
//! - IPC handlers   → `crate::domains::clients::ipc`
//! - Application    → `crate::domains::clients::application`
//! - Infrastructure → `crate::domains::clients::infrastructure`
//!
//! This module re-exports everything so that existing call-sites continue
//! to compile without changes during the incremental migration.

pub mod ipc;
pub mod repository;
pub mod service;
pub mod statistics;
pub mod validation;

// ── Domain models ─────────────────────────────────────────────────────────────
pub use crate::domains::clients::domain::models::*;
// pub(crate) helpers needed by application layer
pub(crate) use crate::domains::clients::domain::models::{is_valid_email, is_valid_phone};

// ── IPC + repository + application re-exports ─────────────────────────────────
pub use ipc::*;
pub use repository::*;
pub use service::*;
pub use statistics::*;
pub use validation::*;
