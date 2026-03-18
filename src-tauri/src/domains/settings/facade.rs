//! Application-layer facade for the Settings bounded context.
//!
//! Provides a single entry point for all settings operations. IPC handlers
//! should instantiate `SettingsFacade` and call its methods instead of
//! instantiating individual repositories directly.

use std::sync::Arc;

use crate::db::Database;
use crate::shared::ipc::errors::AppError;

use super::models::{
    AppSettings, DataConsent, GeneralSettings, NotificationSettings, OnboardingData,
    OnboardingStatus, Organization, OrganizationSettings, SecuritySettings,
    UpdateOrganizationRequest, UpdateOrganizationSettingsRequest, UserAccessibilitySettings,
    UserNotificationSettings, UserPerformanceSettings, UserPreferences, UserProfileSettings,
    UserSecuritySettings, UserSettings,
};
use super::organization_repository::OrganizationRepository;
use super::settings_repository::SettingsRepository;
use super::user_settings_repository::UserSettingsRepository;

/// Facade for the Settings bounded context.
///
/// Wraps `SettingsRepository`, `UserSettingsRepository`, and
/// `OrganizationRepository`. IPC handlers must use this facade and must not
/// instantiate the individual repositories directly.
#[derive(Debug, Clone)]
pub struct SettingsFacade {
    db: Arc<Database>,
}

impl SettingsFacade {
    /// Create a new facade for the given database handle.
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    // ── App settings ─────────────────────────────────────────────────────────

    /// Retrieve global application settings.
    pub fn get_app_settings(&self) -> Result<AppSettings, AppError> {
        self.settings_repo().get_app_settings_db()
    }

    /// Persist the full application settings record.
    pub fn save_app_settings(&self, settings: &AppSettings, user_id: &str) -> Result<(), AppError> {
        self.settings_repo().save_app_settings_db(settings, user_id)
    }

    /// Update the `general` sub-section of application settings.
    pub fn update_general_settings(
        &self,
        settings: GeneralSettings,
        user_id: &str,
    ) -> Result<AppSettings, AppError> {
        let repo = self.settings_repo();
        let mut current = repo.get_app_settings_db()?;
        current.general = settings;
        repo.save_app_settings_db(&current, user_id)?;
        Ok(current)
    }

    /// Update the `security` sub-section of application settings.
    pub fn update_security_settings(
        &self,
        settings: SecuritySettings,
        user_id: &str,
    ) -> Result<AppSettings, AppError> {
        let repo = self.settings_repo();
        let mut current = repo.get_app_settings_db()?;
        current.security = settings;
        repo.save_app_settings_db(&current, user_id)?;
        Ok(current)
    }

    /// Update the `notifications` sub-section of application settings.
    pub fn update_notification_settings(
        &self,
        settings: NotificationSettings,
        user_id: &str,
    ) -> Result<AppSettings, AppError> {
        let repo = self.settings_repo();
        let mut current = repo.get_app_settings_db()?;
        current.notifications = settings;
        repo.save_app_settings_db(&current, user_id)?;
        Ok(current)
    }

    /// Update the `business_rules` list in application settings.
    pub fn update_business_rules(
        &self,
        rules: Vec<serde_json::Value>,
        user_id: &str,
    ) -> Result<AppSettings, AppError> {
        let repo = self.settings_repo();
        let mut current = repo.get_app_settings_db()?;
        current.business_rules = rules;
        repo.save_app_settings_db(&current, user_id)?;
        Ok(current)
    }

    /// Update the `security_policies` list in application settings.
    pub fn update_security_policies(
        &self,
        policies: Vec<serde_json::Value>,
        user_id: &str,
    ) -> Result<AppSettings, AppError> {
        let repo = self.settings_repo();
        let mut current = repo.get_app_settings_db()?;
        current.security_policies = policies;
        repo.save_app_settings_db(&current, user_id)?;
        Ok(current)
    }

    /// Update the `integrations` list in application settings.
    pub fn update_integrations(
        &self,
        integrations: Vec<serde_json::Value>,
        user_id: &str,
    ) -> Result<AppSettings, AppError> {
        let repo = self.settings_repo();
        let mut current = repo.get_app_settings_db()?;
        current.integrations = integrations;
        repo.save_app_settings_db(&current, user_id)?;
        Ok(current)
    }

    /// Update the `performance_configs` list in application settings.
    pub fn update_performance_configs(
        &self,
        configs: Vec<serde_json::Value>,
        user_id: &str,
    ) -> Result<AppSettings, AppError> {
        let repo = self.settings_repo();
        let mut current = repo.get_app_settings_db()?;
        current.performance_configs = configs;
        repo.save_app_settings_db(&current, user_id)?;
        Ok(current)
    }

    /// Update the `business_hours` value in application settings.
    pub fn update_business_hours(
        &self,
        hours: serde_json::Value,
        user_id: &str,
    ) -> Result<AppSettings, AppError> {
        let repo = self.settings_repo();
        let mut current = repo.get_app_settings_db()?;
        current.business_hours = hours;
        repo.save_app_settings_db(&current, user_id)?;
        Ok(current)
    }

    // ── User settings ─────────────────────────────────────────────────────────

    /// Retrieve settings for the given user.
    pub fn get_user_settings(&self, user_id: &str) -> Result<UserSettings, AppError> {
        self.user_settings_repo().get_user_settings(user_id)
    }

    /// Persist updated settings for the given user.
    pub fn save_user_settings(
        &self,
        user_id: &str,
        settings: &UserSettings,
    ) -> Result<(), AppError> {
        self.user_settings_repo()
            .save_user_settings(user_id, settings)
    }

    /// Update only the `profile` sub-section of a user's settings.
    pub fn update_user_profile(
        &self,
        user_id: &str,
        profile: UserProfileSettings,
    ) -> Result<UserSettings, AppError> {
        let repo = self.user_settings_repo();
        let mut current = repo.get_user_settings(user_id)?;
        current.profile = profile;
        repo.save_user_settings(user_id, &current)?;
        Ok(current)
    }

    /// Update only the `preferences` sub-section of a user's settings.
    pub fn update_user_preferences(
        &self,
        user_id: &str,
        preferences: UserPreferences,
    ) -> Result<UserSettings, AppError> {
        let repo = self.user_settings_repo();
        let mut current = repo.get_user_settings(user_id)?;
        current.preferences = preferences;
        repo.save_user_settings(user_id, &current)?;
        Ok(current)
    }

    /// Update only the `security` sub-section of a user's settings.
    pub fn update_user_security(
        &self,
        user_id: &str,
        security: UserSecuritySettings,
    ) -> Result<UserSettings, AppError> {
        let repo = self.user_settings_repo();
        let mut current = repo.get_user_settings(user_id)?;
        current.security = security;
        repo.save_user_settings(user_id, &current)?;
        Ok(current)
    }

    /// Update only the `performance` sub-section of a user's settings.
    pub fn update_user_performance(
        &self,
        user_id: &str,
        performance: UserPerformanceSettings,
    ) -> Result<UserSettings, AppError> {
        let repo = self.user_settings_repo();
        let mut current = repo.get_user_settings(user_id)?;
        current.performance = performance;
        repo.save_user_settings(user_id, &current)?;
        Ok(current)
    }

    /// Update only the `accessibility` sub-section of a user's settings.
    pub fn update_user_accessibility(
        &self,
        user_id: &str,
        accessibility: UserAccessibilitySettings,
    ) -> Result<UserSettings, AppError> {
        let repo = self.user_settings_repo();
        let mut current = repo.get_user_settings(user_id)?;
        current.accessibility = accessibility;
        repo.save_user_settings(user_id, &current)?;
        Ok(current)
    }

    /// Update only the `notifications` sub-section of a user's settings.
    pub fn update_user_notifications(
        &self,
        user_id: &str,
        notifications: UserNotificationSettings,
    ) -> Result<UserSettings, AppError> {
        let repo = self.user_settings_repo();
        let mut current = repo.get_user_settings(user_id)?;
        current.notifications = notifications;
        repo.save_user_settings(user_id, &current)?;
        Ok(current)
    }

    /// Retrieve the data-consent record for the given user.
    pub fn get_data_consent(&self, user_id: &str) -> Result<Option<DataConsent>, AppError> {
        self.user_settings_repo().get_data_consent(user_id)
    }

    // ── Organization settings ─────────────────────────────────────────────────

    /// Retrieve the organisation record, or `None` if onboarding is incomplete.
    pub fn get_organization(&self) -> Result<Option<Organization>, AppError> {
        self.org_repo().get_organization()
    }

    /// Create a new organisation during the onboarding flow.
    pub fn create_organization(
        &self,
        data: &super::models::CreateOrganizationRequest,
    ) -> Result<Organization, AppError> {
        self.org_repo().create_organization(data)
    }

    /// Update the organisation record.
    pub fn update_organization(
        &self,
        data: &UpdateOrganizationRequest,
    ) -> Result<Organization, AppError> {
        self.org_repo().update_organization(data)
    }

    /// Retrieve all organisation settings key-value pairs.
    pub fn get_organization_settings(&self) -> Result<OrganizationSettings, AppError> {
        self.org_repo().get_all_settings()
    }

    /// Persist updated organisation settings.
    pub fn update_organization_settings(
        &self,
        data: &UpdateOrganizationSettingsRequest,
    ) -> Result<OrganizationSettings, AppError> {
        let repo = self.org_repo();
        repo.update_settings(&data.settings)?;
        repo.get_all_settings()
    }

    /// Retrieve the current onboarding status.
    pub fn get_onboarding_status(&self) -> Result<OnboardingStatus, AppError> {
        let repo = self.org_repo();
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

    /// Complete the onboarding flow by creating the organisation.
    pub fn complete_onboarding(&self, data: &OnboardingData) -> Result<Organization, AppError> {
        data.validate().map_err(AppError::Validation)?;
        let repo = self.org_repo();
        if repo.get_organization()?.is_some() {
            return Err(AppError::Validation(
                "Organization already exists".to_string(),
            ));
        }
        let organization = repo.create_organization(&data.organization)?;
        repo.complete_onboarding()?;
        Ok(organization)
    }

    /// Check whether admin users exist (used during onboarding status checks).
    pub fn has_admin_users(&self) -> Result<bool, AppError> {
        self.org_repo().has_admin_users()
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn settings_repo(&self) -> SettingsRepository {
        SettingsRepository::new(self.db.clone())
    }

    fn user_settings_repo(&self) -> UserSettingsRepository {
        UserSettingsRepository::new(self.db.clone())
    }

    fn org_repo(&self) -> OrganizationRepository {
        OrganizationRepository::new(self.db.clone())
    }
}
