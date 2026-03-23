//! Infrastructure layer for the settings domain (ADR-001, ADR-005).
//!
//! Re-exports the SQLite repository implementations from the domain root.
//! Real repository files stay at the domain root during the incremental migration.

pub use crate::domains::settings::organization_repository::OrganizationRepository;
pub use crate::domains::settings::settings_repository::SettingsRepository as SqliteSettingsRepository;
pub use crate::domains::settings::user_settings_repository::UserSettingsRepository as SqliteUserSettingsRepository;
