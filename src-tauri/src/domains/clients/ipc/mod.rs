//! IPC layer for the clients domain (ADR-018).
//!
//! Thin Tauri command handlers — resolve context, delegate to application layer, return.

pub mod error_mapping;
pub mod handlers;
pub mod types;

pub use error_mapping::{check_client_access, map_service_error};
pub use handlers::*;
pub use types::*;
