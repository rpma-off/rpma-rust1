//! Repository trait contracts for the settings domain (ADR-005).
//!
//! These traits define the persistence contracts that the application layer depends on.
//! Concrete implementations are in the repository files at the domain root.
//!
//! ADR-001: Infrastructure Layer
//! ADR-005: Repository Pattern (traits defined in infrastructure)

use std::collections::HashMap;

use crate::shared::ipc::errors::AppError;

use crate::domains::settings::models::{
    AppSettings, CreateOrganizationRequest, Organization, OrganizationSettings,
    UpdateOrganizationRequest, UserSettings,
};

/// Repository contract for organization settings and onboarding persistence.
///
/// Concrete implementation: [`OrganizationRepository`].
/// Tests may substitute a mock that implements this trait.
pub trait SettingsRepository: Send + Sync {
    /// Retrieve all organization key-value settings.
    fn get_organization_settings(&self) -> Result<OrganizationSettings, AppError>;

    /// Persist a batch of organization key-value settings.
    fn update_organization_settings(
        &self,
        settings: &HashMap<String, String>,
    ) -> Result<(), AppError>;

    /// Retrieve the organization record, or `None` before onboarding.
    fn get_organization(&self) -> Result<Option<Organization>, AppError>;

    /// Create the organization record during the onboarding flow.
    fn create_organization(
        &self,
        data: &CreateOrganizationRequest,
    ) -> Result<Organization, AppError>;

    /// Update the organization record with partial data.
    fn update_organization(
        &self,
        data: &UpdateOrganizationRequest,
    ) -> Result<Organization, AppError>;

    /// Retrieve onboarding status: `(completed, current_step)`.
    fn get_onboarding_status(&self) -> Result<(bool, i32), AppError>;

    /// Mark onboarding as complete.
    fn complete_onboarding(&self) -> Result<(), AppError>;

    /// Return `true` if at least one active Admin user exists.
    fn has_admin_users(&self) -> Result<bool, AppError>;

    /// Promote the earliest active user to Admin role.
    /// Called once during the onboarding flow.
    fn promote_first_user_to_admin(&self) -> Result<(), AppError>;
}

/// Repository contract for application-wide settings persistence.
///
/// Concrete implementation: [`SqliteSettingsRepository`].
pub trait AppSettingsRepository: Send + Sync {
    /// Retrieve the global application settings record.
    fn get_app_settings(&self) -> Result<AppSettings, AppError>;

    /// Persist the full application settings record atomically.
    fn save_app_settings(&self, settings: &AppSettings, user_id: &str) -> Result<(), AppError>;
}

/// Repository contract for user-specific settings persistence.
///
/// Concrete implementation: [`SqliteUserSettingsRepository`].
pub trait UserSettingsPort: Send + Sync {
    /// Retrieve settings for a given user, creating defaults if absent.
    fn get_user_settings(&self, user_id: &str) -> Result<UserSettings, AppError>;

    /// Persist a user's settings record atomically.
    fn save_user_settings(&self, user_id: &str, settings: &UserSettings) -> Result<(), AppError>;
}
