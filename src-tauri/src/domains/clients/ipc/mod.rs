//! IPC layer for the clients domain (ADR-018).
//!
//! Thin Tauri command handlers — resolve context, delegate to application layer, return.

pub mod handlers;
pub mod types;

pub use handlers::*;
pub use types::*;
