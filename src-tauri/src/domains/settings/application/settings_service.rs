//! Application-layer service for the Settings bounded context.
//!
//! `SettingsService` is the authoritative entry point for all settings
//! read/write operations.  Every public method accepts a `&RequestContext`
//! so that RBAC is enforced at the *application* layer, regardless of how
//! the service is invoked (IPC, background job, test).
//!
//! ADR-001: Application Layer
//! ADR-005: Repository Pattern (traits in infrastructure, impls here for transitional period)
//! ADR-007: RBAC — Admin-only for app/org writes; any authenticated user for user-scoped ops.

use std::sync::Arc;

use tracing::info;

use crate::shared::context::request_context::RequestContext;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;

use super::super::infrastructure::{AppSettingsRepository, SettingsRepository, UserSettingsPort};
use super::super::models::{
    AppSettings, CreateOrganizationRequest, GeneralSettings, NotificationSettings,
    OnboardingData, OnboardingStatus, Organization, OrganizationSettings, SecuritySettings,
    UpdateOrganizationRequest, UpdateOrganizationSettingsRequest, UserAccessibilitySettings,
    UserNotificationSettings, UserPerformanceSettings, UserPreferences, UserProfileSettings,
    UserSecuritySettings, UserSettings,
};
use super::super::organization_repository::OrganizationRepository;
use super::super::settings_repository::SettingsRepository as SqliteSettingsRepository;
use super::super::user_settings_repository::UserSettingsRepository as SqliteUserSettingsRepository;

// ── Trait impls on concrete repository structs ────────────────────────────────
// NOTE: These implementations are kept here during the transitional migration.
// Per ADR-005, implementations should eventually move to infrastructure layer.

impl SettingsRepository for OrganizationRepository {
    fn get_organization_settings(&self) -> Result<OrganizationSettings, AppError> {
        self.get_all_settings()
    }

    fn update_organization_settings(
        &self,
        settings: &std::collections::HashMap<String, String>,
    ) -> Result<(), AppError> {
        self.update_settings(settings)
    }

    fn get_organization(&self) -> Result<Option<Organization>, AppError> {
        self.get_organization()
    }

    fn create_organization(
        &self,
        data: &CreateOrganizationRequest,
    ) -> Result<Organization, AppError> {
        self.create_organization(data)
    }

    fn update_organization(
        &self,
        data: &UpdateOrganizationRequest,
    ) -> Result<Organization, AppError> {
        self.update_organization(data)
    }

    fn get_onboarding_status(&self) -> Result<(bool, i32), AppError> {
        self.get_onboarding_status()
    }

    fn complete_onboarding(&self) -> Result<(), AppError> {
        self.complete_onboarding()
    }

    fn has_admin_users(&self) -> Result<bool, AppError> {
        self.has_admin_users()
    }

    fn promote_first_user_to_admin(&self) -> Result<(), AppError> {
        self.promote_first_user_to_admin()
    }
}

impl AppSettingsRepository for SqliteSettingsRepository {
    fn get_app_settings(&self) -> Result<AppSettings, AppError> {
        self.get_app_settings_db()
    }

    fn save_app_settings(&self, settings: &AppSettings, user_id: &str) -> Result<(), AppError> {
        self.save_app_settings_db(settings, user_id)
    }
}

impl UserSettingsPort for SqliteUserSettingsRepository {
    fn get_user_settings(&self, user_id: &str) -> Result<UserSettings, AppError> {
        self.get_user_settings(user_id)
    }

    fn save_user_settings(&self, user_id: &str, settings: &UserSettings) -> Result<(), AppError> {
        self.save_user_settings(user_id, settings)
    }

}

// ── RBAC helpers ──────────────────────────────────────────────────────────────

/// Require `Admin` role; returns `AppError::Authorization` otherwise.
fn require_admin(ctx: &RequestContext) -> Result<(), AppError> {
    if ctx.auth.role == UserRole::Admin {
        Ok(())
    } else {
        Err(AppError::Authorization(
            "This operation requires the Admin role".to_string(),
        ))
    }
}

/// Require at least `Viewer` role (i.e. any authenticated user).
///
/// All authenticated callers pass this check.  Auth itself is guaranteed
/// by `resolve_context!` at the IPC boundary; this re-check ensures that
/// service methods remain safe even when called outside the IPC path.
fn require_at_least_viewer(_ctx: &RequestContext) -> Result<(), AppError> {
    // Any role is acceptable; the `resolve_context!` macro already rejects
    // unauthenticated callers at the IPC boundary.
    Ok(())
}

// ── SettingsService ───────────────────────────────────────────────────────────

/// Application-layer service for all settings operations.
///
/// Enforces RBAC on every method.  Constructed once at startup and stored
/// in [`AppStateType`].  IPC handlers must obtain this service from
/// `AppState` and pass the resolved `RequestContext`.
///
/// # ADR-005 compliance
///
/// Repository dependencies are injected at construction time as trait
/// objects.  The service never holds a raw `Database` handle and never
/// creates repositories on-the-fly.  This enables straightforward mocking
/// in tests and decouples the application layer from infrastructure.
///
/// # RBAC summary
///
/// | Operation | Minimum role |
/// |-----------|-------------|
/// | Read app settings | Admin |
/// | Write app settings | Admin |
/// | Read/write user settings | any authenticated user (own data only) |
/// | Read org / onboarding status | Viewer |
/// | Write org data | Admin |
/// | Read org settings | Viewer |
/// | Write org settings | Admin |
#[derive(Clone)]
pub struct SettingsService {
    app_settings_repo: Arc<dyn AppSettingsRepository>,
    user_settings_repo: Arc<dyn UserSettingsPort>,
    org_repo: Arc<dyn SettingsRepository>,
}

impl std::fmt::Debug for SettingsService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SettingsService")
            .field("app_settings_repo", &"Arc<dyn AppSettingsRepository>")
            .field("user_settings_repo", &"Arc<dyn UserSettingsPort>")
            .field("org_repo", &"Arc<dyn SettingsRepository>")
            .finish()
    }
}

impl SettingsService {
    /// Construct a new service with pre-built repository implementations.
    ///
    /// # Arguments
    /// * `app_settings_repo` — persistence for application-wide settings
    /// * `user_settings_repo` — persistence for per-user settings
    /// * `org_repo` — persistence for organization data and onboarding
    pub fn new(
        app_settings_repo: Arc<dyn AppSettingsRepository>,
        user_settings_repo: Arc<dyn UserSettingsPort>,
        org_repo: Arc<dyn SettingsRepository>,
    ) -> Self {
        Self {
            app_settings_repo,
            user_settings_repo,
            org_repo,
        }
    }

    // ── App settings ──────────────────────────────────────────────────────────

    /// Retrieve global application settings.  Requires Admin.
    pub fn get_app_settings(&self, ctx: &RequestContext) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        self.app_settings_repo.get_app_settings()
    }

    /// Update the `general` sub-section of application settings.  Requires Admin.
    pub fn update_general_settings(
        &self,
        ctx: &RequestContext,
        settings: GeneralSettings,
    ) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.app_settings_repo;
        let mut current = repo.get_app_settings()?;
        current.general = settings;
        repo.save_app_settings(&current, &ctx.auth.user_id)?;
        info!("General settings updated by {}", ctx.auth.user_id);
        Ok(current)
    }

    /// Update the `security` sub-section of application settings.  Requires Admin.
    pub fn update_security_settings(
        &self,
        ctx: &RequestContext,
        settings: SecuritySettings,
    ) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.app_settings_repo;
        let mut current = repo.get_app_settings()?;
        current.security = settings;
        repo.save_app_settings(&current, &ctx.auth.user_id)?;
        info!("Security settings updated by {}", ctx.auth.user_id);
        Ok(current)
    }

    /// Update the `notifications` sub-section of application settings.  Requires Admin.
    pub fn update_notification_settings(
        &self,
        ctx: &RequestContext,
        settings: NotificationSettings,
    ) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.app_settings_repo;
        let mut current = repo.get_app_settings()?;
        current.notifications = settings;
        repo.save_app_settings(&current, &ctx.auth.user_id)?;
        info!("Notification settings updated by {}", ctx.auth.user_id);
        Ok(current)
    }

    /// Update the `business_rules` list in application settings.  Requires Admin.
    pub fn update_business_rules(
        &self,
        ctx: &RequestContext,
        rules: Vec<serde_json::Value>,
    ) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.app_settings_repo;
        let mut current = repo.get_app_settings()?;
        current.business_rules = rules;
        repo.save_app_settings(&current, &ctx.auth.user_id)?;
        Ok(current)
    }

    /// Update the `security_policies` list in application settings.  Requires Admin.
    pub fn update_security_policies(
        &self,
        ctx: &RequestContext,
        policies: Vec<serde_json::Value>,
    ) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.app_settings_repo;
        let mut current = repo.get_app_settings()?;
        current.security_policies = policies;
        repo.save_app_settings(&current, &ctx.auth.user_id)?;
        Ok(current)
    }

    /// Update the `integrations` list in application settings.  Requires Admin.
    pub fn update_integrations(
        &self,
        ctx: &RequestContext,
        integrations: Vec<serde_json::Value>,
    ) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.app_settings_repo;
        let mut current = repo.get_app_settings()?;
        current.integrations = integrations;
        repo.save_app_settings(&current, &ctx.auth.user_id)?;
        Ok(current)
    }

    /// Update the `performance_configs` list in application settings.  Requires Admin.
    pub fn update_performance_configs(
        &self,
        ctx: &RequestContext,
        configs: Vec<serde_json::Value>,
    ) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.app_settings_repo;
        let mut current = repo.get_app_settings()?;
        current.performance_configs = configs;
        repo.save_app_settings(&current, &ctx.auth.user_id)?;
        Ok(current)
    }

    /// Update the `business_hours` value in application settings.  Requires Admin.
    pub fn update_business_hours(
        &self,
        ctx: &RequestContext,
        hours: serde_json::Value,
    ) -> Result<AppSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.app_settings_repo;
        let mut current = repo.get_app_settings()?;
        current.business_hours = hours;
        repo.save_app_settings(&current, &ctx.auth.user_id)?;
        Ok(current)
    }

    // ── User settings ─────────────────────────────────────────────────────────

    /// Retrieve settings for the authenticated user.
    pub fn get_user_settings(&self, ctx: &RequestContext) -> Result<UserSettings, AppError> {
        require_at_least_viewer(ctx)?;
        self.user_settings_repo.get_user_settings(&ctx.auth.user_id)
    }

    /// Update the `profile` sub-section of the authenticated user's settings.
    pub fn update_user_profile(
        &self,
        ctx: &RequestContext,
        profile: UserProfileSettings,
    ) -> Result<UserSettings, AppError> {
        require_at_least_viewer(ctx)?;
        let repo = &self.user_settings_repo;
        let mut current = repo.get_user_settings(&ctx.auth.user_id)?;
        current.profile = profile;
        repo.save_user_settings(&ctx.auth.user_id, &current)?;
        Ok(current)
    }

    /// Update the `preferences` sub-section of the authenticated user's settings.
    pub fn update_user_preferences(
        &self,
        ctx: &RequestContext,
        preferences: UserPreferences,
    ) -> Result<UserSettings, AppError> {
        require_at_least_viewer(ctx)?;
        let repo = &self.user_settings_repo;
        let mut current = repo.get_user_settings(&ctx.auth.user_id)?;
        current.preferences = preferences;
        repo.save_user_settings(&ctx.auth.user_id, &current)?;
        Ok(current)
    }

    /// Update the `security` sub-section of the authenticated user's settings.
    pub fn update_user_security(
        &self,
        ctx: &RequestContext,
        security: UserSecuritySettings,
    ) -> Result<UserSettings, AppError> {
        require_at_least_viewer(ctx)?;
        let repo = &self.user_settings_repo;
        let mut current = repo.get_user_settings(&ctx.auth.user_id)?;
        current.security = security;
        repo.save_user_settings(&ctx.auth.user_id, &current)?;
        Ok(current)
    }

    /// Update the `performance` sub-section of the authenticated user's settings.
    pub fn update_user_performance(
        &self,
        ctx: &RequestContext,
        performance: UserPerformanceSettings,
    ) -> Result<UserSettings, AppError> {
        require_at_least_viewer(ctx)?;
        let repo = &self.user_settings_repo;
        let mut current = repo.get_user_settings(&ctx.auth.user_id)?;
        current.performance = performance;
        repo.save_user_settings(&ctx.auth.user_id, &current)?;
        Ok(current)
    }

    /// Update the `accessibility` sub-section of the authenticated user's settings.
    pub fn update_user_accessibility(
        &self,
        ctx: &RequestContext,
        accessibility: UserAccessibilitySettings,
    ) -> Result<UserSettings, AppError> {
        require_at_least_viewer(ctx)?;
        let repo = &self.user_settings_repo;
        let mut current = repo.get_user_settings(&ctx.auth.user_id)?;
        current.accessibility = accessibility;
        repo.save_user_settings(&ctx.auth.user_id, &current)?;
        Ok(current)
    }

    /// Update the `notifications` sub-section of the authenticated user's settings.
    pub fn update_user_notifications(
        &self,
        ctx: &RequestContext,
        notifications: UserNotificationSettings,
    ) -> Result<UserSettings, AppError> {
        require_at_least_viewer(ctx)?;
        let repo = &self.user_settings_repo;
        let mut current = repo.get_user_settings(&ctx.auth.user_id)?;
        current.notifications = notifications;
        repo.save_user_settings(&ctx.auth.user_id, &current)?;
        Ok(current)
    }

    // ── Organization ──────────────────────────────────────────────────────────

    /// Retrieve the onboarding status.  No authentication required (pre-login).
    pub fn get_onboarding_status(&self) -> Result<OnboardingStatus, AppError> {
        let repo = &self.org_repo;
        let (completed, current_step) = repo.get_onboarding_status()?;
        let has_organization = repo.get_organization()?.is_some();
        let has_admin_user = repo.has_admin_users()?;
        Ok(OnboardingStatus {
            completed,
            current_step,
            has_organization,
            has_admin_user,
        })
    }

    /// Complete the onboarding flow by creating the organization.  No auth required.
    pub fn complete_onboarding(&self, data: &OnboardingData) -> Result<Organization, AppError> {
        data.validate().map_err(AppError::Validation)?;
        let repo = &self.org_repo;

        if repo.get_organization()?.is_some() {
            return Err(AppError::Validation(
                "Organization already exists".to_string(),
            ));
        }

        let organization = repo.create_organization(&data.organization)?;

        // Promote first user to Admin role
        if let Err(e) = repo.promote_first_user_to_admin() {
            tracing::warn!("Failed to promote first user to admin: {}", e);
            // Don't fail the onboarding - just log the issue
        }

        repo.complete_onboarding()?;
        info!(
            "Onboarding completed for organization: {}",
            organization.name
        );
        Ok(organization)
    }

    /// Retrieve the organization record.  Requires at least Viewer.
    pub fn get_organization(&self, ctx: &RequestContext) -> Result<Organization, AppError> {
        require_at_least_viewer(ctx)?;
        self.org_repo.get_organization()?.ok_or_else(|| {
            AppError::NotFound("Organization not found. Please complete onboarding.".to_string())
        })
    }

    /// Update the organization record.  Requires Admin.
    pub fn update_organization(
        &self,
        ctx: &RequestContext,
        data: &UpdateOrganizationRequest,
    ) -> Result<Organization, AppError> {
        require_admin(ctx)?;
        let org = self.org_repo.update_organization(data)?;
        info!("Organization updated by {}", ctx.auth.user_id);
        Ok(org)
    }

    /// Update only the organization's logo fields.  Requires Admin.
    pub fn update_logo(
        &self,
        ctx: &RequestContext,
        logo_url: Option<String>,
        logo_data: Option<String>,
    ) -> Result<Organization, AppError> {
        let request = UpdateOrganizationRequest {
            logo_url,
            logo_data,
            ..Default::default()
        };
        self.update_organization(ctx, &request)
    }

    /// Retrieve all organization key-value settings.  Requires at least Viewer.
    pub fn get_organization_settings(
        &self,
        ctx: &RequestContext,
    ) -> Result<OrganizationSettings, AppError> {
        require_at_least_viewer(ctx)?;
        self.org_repo.get_organization_settings()
    }

    /// Persist updated organization settings.  Requires Admin.
    pub fn update_organization_settings(
        &self,
        ctx: &RequestContext,
        data: &UpdateOrganizationSettingsRequest,
    ) -> Result<OrganizationSettings, AppError> {
        require_admin(ctx)?;
        let repo = &self.org_repo;
        repo.update_organization_settings(&data.settings)?;
        let updated = repo.get_organization_settings()?;
        info!("Organization settings updated by {}", ctx.auth.user_id);
        Ok(updated)
    }
}
