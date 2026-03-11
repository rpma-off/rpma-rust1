//! Application service for global system configuration (AppSettings).
//!
//! Orchestrates RBAC enforcement, validation, and delegation to the
//! infrastructure layer.  No SQL lives here.

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::AppSettings;
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;
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

    fn require_admin(ctx: &RequestContext) -> Result<(), AppError> {
        if !matches!(ctx.auth.role, UserRole::Admin) {
            return Err(AppError::Authorization(
                "Only administrators can modify system configuration".to_string(),
            ));
        }
        Ok(())
    }

    // ── validation helpers ───────────────────────────────────────────────────

    /// Validate that a JSON array is non-empty and that every element is an
    /// object.  This enforces a minimal structure contract in the application
    /// layer rather than relying on the caller to supply well-formed data.
    fn validate_json_object_array(items: &[serde_json::Value], field: &str) -> Result<(), AppError> {
        if items.is_empty() {
            return Err(AppError::Validation(format!(
                "{field} must contain at least one entry"
            )));
        }
        for (i, item) in items.iter().enumerate() {
            if !item.is_object() {
                return Err(AppError::Validation(format!(
                    "{field}[{i}] must be a JSON object"
                )));
            }
        }
        Ok(())
    }

    /// Validate that `business_hours` is a non-null JSON object.
    fn validate_business_hours(hours: &serde_json::Value) -> Result<(), AppError> {
        if !hours.is_object() {
            return Err(AppError::Validation(
                "business_hours must be a JSON object".to_string(),
            ));
        }
        Ok(())
    }

    // ── read ─────────────────────────────────────────────────────────────────

    /// Return the global `AppSettings`.  Admins only.
    pub fn get_app_settings(&self, ctx: &RequestContext) -> Result<AppSettings, AppError> {
        Self::require_admin(ctx)?;
        self.settings_service.get_app_settings_db()
    }

    // ── write ─────────────────────────────────────────────────────────────────

    /// Update the five `general_settings` fields.  Admins only.
    pub fn update_general_settings(
        &self,
        ctx: &RequestContext,
        auto_save: Option<bool>,
        language: Option<String>,
        timezone: Option<String>,
        date_format: Option<String>,
        currency: Option<String>,
    ) -> Result<(), AppError> {
        Self::require_admin(ctx)?;

        let mut current = self.settings_service.get_app_settings_db()?;

        if let Some(v) = auto_save   { current.general.auto_save   = v; }
        if let Some(v) = language    { current.general.language     = v; }
        if let Some(v) = timezone    { current.general.timezone     = v; }
        if let Some(v) = date_format { current.general.date_format  = v; }
        if let Some(v) = currency    { current.general.currency     = v; }

        self.settings_service
            .update_general_settings_db(&current.general, &ctx.auth.user_id)?;

        info!("general_settings updated by user_id={}", ctx.auth.user_id);
        Ok(())
    }

    /// Replace the `business_rules` array.  Admins only.
    pub fn update_business_rules(
        &self,
        ctx: &RequestContext,
        rules: Vec<serde_json::Value>,
    ) -> Result<(), AppError> {
        Self::require_admin(ctx)?;
        Self::validate_json_object_array(&rules, "business_rules")?;
        self.settings_service
            .update_business_rules_db(&rules, &ctx.auth.user_id)?;
        info!("business_rules updated by user_id={}", ctx.auth.user_id);
        Ok(())
    }

    /// Replace the `security_policies` array.  Admins only.
    pub fn update_security_policies(
        &self,
        ctx: &RequestContext,
        policies: Vec<serde_json::Value>,
    ) -> Result<(), AppError> {
        Self::require_admin(ctx)?;
        Self::validate_json_object_array(&policies, "security_policies")?;
        self.settings_service
            .update_security_policies_db(&policies, &ctx.auth.user_id)?;
        info!("security_policies updated by user_id={}", ctx.auth.user_id);
        Ok(())
    }

    /// Replace the `integrations` array.  Admins only.
    pub fn update_integrations(
        &self,
        ctx: &RequestContext,
        integrations: Vec<serde_json::Value>,
    ) -> Result<(), AppError> {
        Self::require_admin(ctx)?;
        Self::validate_json_object_array(&integrations, "integrations")?;
        self.settings_service
            .update_integrations_db(&integrations, &ctx.auth.user_id)?;
        info!("integrations updated by user_id={}", ctx.auth.user_id);
        Ok(())
    }

    /// Replace the `performance_configs` array.  Admins only.
    pub fn update_performance_configs(
        &self,
        ctx: &RequestContext,
        configs: Vec<serde_json::Value>,
    ) -> Result<(), AppError> {
        Self::require_admin(ctx)?;
        Self::validate_json_object_array(&configs, "performance_configs")?;
        self.settings_service
            .update_performance_configs_db(&configs, &ctx.auth.user_id)?;
        info!("performance_configs updated by user_id={}", ctx.auth.user_id);
        Ok(())
    }

    /// Replace the `business_hours` object.  Admins only.
    pub fn update_business_hours(
        &self,
        ctx: &RequestContext,
        hours: serde_json::Value,
    ) -> Result<(), AppError> {
        Self::require_admin(ctx)?;
        Self::validate_business_hours(&hours)?;
        self.settings_service
            .update_business_hours_db(&hours, &ctx.auth.user_id)?;
        info!("business_hours updated by user_id={}", ctx.auth.user_id);
        Ok(())
    }
}
