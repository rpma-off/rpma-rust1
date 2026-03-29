use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::ipc::errors::AppError;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Logical categories for settings operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
pub enum SettingsCategory {
    /// User profile (name, email, phone, avatar ...).
    Profile,
    /// Display / UI preferences (theme, language, date format ...).
    Preferences,
    /// Per-user security (2FA, session timeout).
    Security,
    /// Performance tuning (cache, sync, compression ...).
    Performance,
    /// Accessibility options.
    Accessibility,
    /// Notification preferences.
    Notifications,
    /// Application-wide settings (admin-only).
    AppSettings,
    /// System configuration (admin-only).
    SystemConfig,
    /// Data consent / GDPR.
    Consent,
}

/// Central RBAC rules for settings operations.
#[derive(Debug, Clone, Copy, Default)]
pub struct SettingsAccessPolicy;

impl SettingsAccessPolicy {
    /// Returns `true` when the given category requires an **Admin** role
    /// to read *or* write.
    pub fn is_admin_only(category: SettingsCategory) -> bool {
        matches!(
            category,
            SettingsCategory::AppSettings | SettingsCategory::SystemConfig
        )
    }

    /// Ensure the caller is allowed to operate on `category`.
    pub fn ensure_access(user: &UserSession, category: SettingsCategory) -> Result<(), AppError> {
        if Self::is_admin_only(category) && !matches!(user.role, UserRole::Admin) {
            return Err(AppError::Authorization(
                "Only administrators can manage application-wide settings".to_string(),
            ));
        }
        Ok(())
    }
}
