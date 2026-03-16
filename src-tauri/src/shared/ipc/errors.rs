//! IPC error handling - Re-exports from shared::error
//!
//! This module re-exports AppError from the shared error module for backwards compatibility.
//! The AppError type is layer-agnostic and can be used in domain, application, infrastructure, and IPC layers.

pub use crate::shared::error::{AppError, AppResult};
