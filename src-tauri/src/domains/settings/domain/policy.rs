//! Settings domain policy — centralised schema keys, defaults references,
//! and RBAC rules for the Settings bounded context.
//!
//! All default values live in the `Default` impls of the domain models
//! (`UserPreferences`, `UserSecuritySettings`, etc.).  This module
//! exposes **policy helpers** that other layers can call instead of
//! hard-coding role checks or duplicating default values.

use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::ipc::errors::AppError;

// ── Setting categories ──────────────────────────────────────────────

/// Logical categories for settings operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettingsCategory {
    /// User profile (name, email, phone, avatar …).
    Profile,
    /// Display / UI preferences (theme, language, date format …).
    Preferences,
    /// Per-user security (2FA, session timeout).
    Security,
    /// Performance tuning (cache, sync, compression …).
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

// ── RBAC policy ─────────────────────────────────────────────────────

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
    ///
    /// * Admin-only categories → caller must be `Admin`.
    /// * User-level categories → any authenticated user may modify
    ///   **their own** settings (the caller identity is validated by the
    ///   IPC layer before reaching here).
    pub fn ensure_access(user: &UserSession, category: SettingsCategory) -> Result<(), AppError> {
        if Self::is_admin_only(category) && !matches!(user.role, UserRole::Admin) {
            return Err(AppError::Authorization(
                "Only administrators can manage application-wide settings".to_string(),
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::contracts::auth::{UserRole, UserSession};

    fn session(role: UserRole) -> UserSession {
        UserSession {
            id: "s-1".to_string(),
            user_id: "u-1".to_string(),
            username: "tester".to_string(),
            email: "t@t.com".to_string(),
            role,
            token: "tok".to_string(),
            expires_at: "2099-01-01T00:00:00Z".to_string(),
            last_activity: "2099-01-01T00:00:00Z".to_string(),
            created_at: "2099-01-01T00:00:00Z".to_string(),
        }
    }

    // ── is_admin_only ────────────────────────────────────────────

    #[test]
    fn app_settings_is_admin_only() {
        assert!(SettingsAccessPolicy::is_admin_only(
            SettingsCategory::AppSettings
        ));
    }

    #[test]
    fn system_config_is_admin_only() {
        assert!(SettingsAccessPolicy::is_admin_only(
            SettingsCategory::SystemConfig
        ));
    }

    #[test]
    fn user_categories_are_not_admin_only() {
        for cat in [
            SettingsCategory::Profile,
            SettingsCategory::Preferences,
            SettingsCategory::Security,
            SettingsCategory::Performance,
            SettingsCategory::Accessibility,
            SettingsCategory::Notifications,
            SettingsCategory::Consent,
        ] {
            assert!(
                !SettingsAccessPolicy::is_admin_only(cat),
                "{cat:?} should NOT be admin-only"
            );
        }
    }

    // ── ensure_access ────────────────────────────────────────────

    #[test]
    fn admin_can_access_admin_only_categories() {
        let admin = session(UserRole::Admin);
        assert!(SettingsAccessPolicy::ensure_access(&admin, SettingsCategory::AppSettings).is_ok());
        assert!(
            SettingsAccessPolicy::ensure_access(&admin, SettingsCategory::SystemConfig).is_ok()
        );
    }

    #[test]
    fn technician_cannot_access_admin_only_categories() {
        let tech = session(UserRole::Technician);
        assert!(SettingsAccessPolicy::ensure_access(&tech, SettingsCategory::AppSettings).is_err());
        assert!(
            SettingsAccessPolicy::ensure_access(&tech, SettingsCategory::SystemConfig).is_err()
        );
    }

    #[test]
    fn any_role_can_access_user_categories() {
        for role in [UserRole::Admin, UserRole::Supervisor, UserRole::Technician] {
            let user = session(role);
            for cat in [
                SettingsCategory::Profile,
                SettingsCategory::Preferences,
                SettingsCategory::Security,
                SettingsCategory::Performance,
                SettingsCategory::Accessibility,
                SettingsCategory::Notifications,
                SettingsCategory::Consent,
            ] {
                assert!(
                    SettingsAccessPolicy::ensure_access(&user, cat).is_ok(),
                    "{role:?} should access {cat:?}"
                );
            }
        }
    }
}
