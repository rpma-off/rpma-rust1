//! Application service for global system configuration (AppSettings).
//!
//! Orchestrates RBAC enforcement, validation, and delegation to the
//! infrastructure layer.  No SQL lives here.

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::AppSettings;
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::shared::contracts::auth::{UserRole, UserSession};
use std::sync::Arc;
use tracing::info;

/// TODO: document
pub struct SystemConfigService {
    settings_service: Arc<SettingsService>,
}

impl SystemConfigService {
    /// TODO: document
    pub fn new(settings_service: Arc<SettingsService>) -> Self {
        Self { settings_service }
    }

    // ── RBAC helper ──────────────────────────────────────────────────────────

    fn require_admin(user: &UserSession) -> Result<(), AppError> {
        if !matches!(user.role, UserRole::Admin) {
            return Err(AppError::Authorization(
                "Only administrators can modify system configuration".to_string(),
            ));
        }
        Ok(())
    }

    // ── read ─────────────────────────────────────────────────────────────────

    /// Return the global `AppSettings`.  Admins only.
    pub fn get_app_settings(&self, user: &UserSession) -> Result<AppSettings, AppError> {
        Self::require_admin(user)?;
        self.settings_service.get_app_settings_db()
    }

    // ── write ─────────────────────────────────────────────────────────────────

    /// Update the five `general_settings` fields.  Admins only.
    pub fn update_general_settings(
        &self,
        user: &UserSession,
        auto_save: Option<bool>,
        language: Option<String>,
        timezone: Option<String>,
        date_format: Option<String>,
        currency: Option<String>,
    ) -> Result<(), AppError> {
        Self::require_admin(user)?;

        let mut current = self.settings_service.get_app_settings_db()?;

        if let Some(v) = auto_save   { current.general.auto_save   = v; }
        if let Some(v) = language    { current.general.language     = v; }
        if let Some(v) = timezone    { current.general.timezone     = v; }
        if let Some(v) = date_format { current.general.date_format  = v; }
        if let Some(v) = currency    { current.general.currency     = v; }

        self.settings_service
            .update_general_settings_db(&current.general, &user.user_id)?;

        info!("general_settings updated by user_id={}", user.user_id);
        Ok(())
    }

    /// Replace the `business_rules` array.  Admins only.
    pub fn update_business_rules(
        &self,
        user: &UserSession,
        rules: Vec<serde_json::Value>,
    ) -> Result<(), AppError> {
        Self::require_admin(user)?;
        self.settings_service
            .update_business_rules_db(&rules, &user.user_id)?;
        info!("business_rules updated by user_id={}", user.user_id);
        Ok(())
    }

    /// Replace the `security_policies` array.  Admins only.
    pub fn update_security_policies(
        &self,
        user: &UserSession,
        policies: Vec<serde_json::Value>,
    ) -> Result<(), AppError> {
        Self::require_admin(user)?;
        self.settings_service
            .update_security_policies_db(&policies, &user.user_id)?;
        info!("security_policies updated by user_id={}", user.user_id);
        Ok(())
    }

    /// Replace the `integrations` array.  Admins only.
    pub fn update_integrations(
        &self,
        user: &UserSession,
        integrations: Vec<serde_json::Value>,
    ) -> Result<(), AppError> {
        Self::require_admin(user)?;
        self.settings_service
            .update_integrations_db(&integrations, &user.user_id)?;
        info!("integrations updated by user_id={}", user.user_id);
        Ok(())
    }

    /// Replace the `performance_configs` array.  Admins only.
    pub fn update_performance_configs(
        &self,
        user: &UserSession,
        configs: Vec<serde_json::Value>,
    ) -> Result<(), AppError> {
        Self::require_admin(user)?;
        self.settings_service
            .update_performance_configs_db(&configs, &user.user_id)?;
        info!("performance_configs updated by user_id={}", user.user_id);
        Ok(())
    }

    /// Replace the `business_hours` object.  Admins only.
    pub fn update_business_hours(
        &self,
        user: &UserSession,
        hours: serde_json::Value,
    ) -> Result<(), AppError> {
        Self::require_admin(user)?;
        self.settings_service
            .update_business_hours_db(&hours, &user.user_id)?;
        info!("business_hours updated by user_id={}", user.user_id);
        Ok(())
    }
}
