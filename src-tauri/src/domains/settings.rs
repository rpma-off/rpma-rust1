//! Settings domain — user preferences and system configuration
//!
//! This module re-exports all settings-related components across layers.

// Public facade
pub use crate::services::settings::SettingsService;

// Models
pub(crate) use crate::models::settings::{
    AppSettings, GeneralSettings, NotificationSettings, SecuritySettings, SystemConfiguration,
};

// Services
pub(crate) use crate::services::system::SystemService;
