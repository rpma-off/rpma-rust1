//! Infrastructure layer for the settings domain (ADR-001, ADR-005).
//!
//! Re-exports the SQLite repository implementations from the domain root.
//! Real repository files stay at the domain root during the incremental migration.
//!
//! Repository trait contracts are defined here per ADR-005.

pub mod repository_traits;
pub use repository_traits::{AppSettingsRepository, SettingsRepository, UserSettingsPort};

pub use crate::domains::settings::organization_repository::OrganizationRepository;
pub use crate::domains::settings::settings_repository::SettingsRepository as SqliteSettingsRepository;
pub use crate::domains::settings::user_settings_repository::UserSettingsRepository as SqliteUserSettingsRepository;
