pub mod application;
pub use application::SettingsService;

// ── 4-Layer structure (ADR-001) ───────────────────────────────────────────────
pub mod domain;
pub mod infrastructure;
pub mod ipc;

// ── Flat files kept at root (incrementally migrated via the layers above) ─────
pub mod models;
pub mod organization_handler;
pub mod organization_repository;
pub mod settings_handler;
pub mod settings_repository;
pub mod user_settings_handler;
pub mod user_settings_repository;

pub use models::*;
pub use organization_handler::*;
pub use organization_repository::*;
pub use settings_handler::*;
pub use settings_repository::*;
pub use user_settings_handler::*;
pub use user_settings_repository::*;

#[cfg(test)]
pub(crate) mod tests;
