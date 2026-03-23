//! IPC layer for the notifications domain (ADR-018).
//!
//! Tauri command handlers live in notification_handler/mod.rs during
//! the incremental migration.

pub use crate::domains::notifications::notification_handler::helper::*;
// IPC commands are re-exported at the notification_handler level via pub use notification_handler::*
// in notifications/mod.rs — accessible as notifications::* from main.rs.
