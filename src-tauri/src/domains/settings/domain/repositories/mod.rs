//! Repository contracts for the settings domain (ADR-005).
//!
//! Trait definitions live in `infrastructure/repository_traits.rs` per ADR-005.
//! This module re-exports them as the canonical domain contract location.

pub use crate::domains::settings::infrastructure::repository_traits::{
    AppSettingsRepository, SettingsRepository, UserSettingsPort,
};
