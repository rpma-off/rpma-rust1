//! Application layer for the Settings bounded context (ADR-001).
//!
//! `SettingsService` is the single entry point for all settings operations.
//! Every method accepts a `&RequestContext` so that RBAC is enforced at the
//! application layer — not only at the IPC boundary.

pub mod settings_service;
pub use settings_service::SettingsService;
