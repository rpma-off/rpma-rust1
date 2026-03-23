//! IPC layer for the settings domain (ADR-018).
//!
//! Re-exports the thin Tauri command handlers from the domain root.
//! Real handler files stay at the domain root during the incremental migration.

pub use crate::domains::settings::organization_handler::*;
pub use crate::domains::settings::settings_handler::*;
pub use crate::domains::settings::user_settings_handler::*;
