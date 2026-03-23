//! IPC layer for the calendar domain (ADR-018).
//!
//! Re-exports the thin Tauri command handlers.

pub use crate::domains::calendar::calendar_handler::ipc::*;
