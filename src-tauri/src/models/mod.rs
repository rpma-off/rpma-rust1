//! Models module - Rust structs for all entities
//!
//! This module contains type-safe representations of all database entities
//! with serde serialization and validation logic.

pub mod auth;
pub mod calendar;
pub mod calendar_event;
pub mod client;
pub mod common;
pub mod intervention;
pub mod material;
pub mod message;
pub mod notification;
pub mod photo;
pub mod reports;
pub mod settings;
pub mod status;
#[cfg(test)]
pub mod status_tests;
pub mod step;
pub mod sync;
pub mod task;
pub mod user;

// Re-export main types
pub use client::{Client, CustomerType};
pub use sync::SyncOperation;
