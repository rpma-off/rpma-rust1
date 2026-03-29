//! IPC layer for the notifications domain (ADR-018).
//!
//! # Current state (historical layout)
//!
//! Tauri command handlers for this domain live in `notification_handler/mod.rs`,
//! not here. The domain root re-exports them via `pub use notification_handler::*`,
//! making all IPC commands accessible as `crate::domains::notifications::<command>`
//! for registration in `main.rs`.
//!
//! # Migration intent
//!
//! To fully migrate to the ADR-001 four-layer layout:
//! 1. Move the `tauri::command` handler functions from `notification_handler/mod.rs` into this file.
//! 2. Drop the `pub use notification_handler::*` glob from `notifications/mod.rs`.
//! 3. Re-export only the command functions from this module.
//!
//! Do NOT move handlers here incrementally without also updating the re-export chain
//! and `main.rs` command registration — partial moves will cause duplicate symbol errors.
