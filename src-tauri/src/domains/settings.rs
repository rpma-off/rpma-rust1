//! Settings domain — user preferences and system configuration
//!
//! This module re-exports all settings-related components across layers.

// Models
pub use crate::models::settings::{
    AppSettings, GeneralSettings, NotificationSettings, SecuritySettings, SystemConfiguration,
};

// Services
pub use crate::services::settings::SettingsService;
pub use crate::services::system::SystemService;
