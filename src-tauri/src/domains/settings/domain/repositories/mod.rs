//! Repository contracts for the settings domain (ADR-005).
//!
//! Trait definitions live in `application/settings_service.rs` for now
//! and are re-exported here as the canonical domain contract location.

pub use crate::domains::settings::application::settings_service::{
    AppSettingsRepository, SettingsRepository, UserSettingsPort,
};
