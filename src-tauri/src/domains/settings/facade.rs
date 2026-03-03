use std::sync::Arc;

use crate::domains::settings::domain::policy::{SettingsAccessPolicy, SettingsCategory};
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::shared::contracts::auth::UserSession;
use crate::shared::ipc::errors::AppError;

/// Facade for the Settings bounded context.
///
/// Provides user preference management, consent handling, and password
/// operations with input validation and error mapping.
#[derive(Debug)]
pub struct SettingsFacade {
    settings_service: Arc<SettingsService>,
}

impl SettingsFacade {
    pub fn new(settings_service: Arc<SettingsService>) -> Self {
        Self { settings_service }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying settings service.
    pub fn settings_service(&self) -> &Arc<SettingsService> {
        &self.settings_service
    }

    /// Validate that a user ID is present for settings operations.
    pub fn validate_user_id(&self, user_id: &str) -> Result<(), AppError> {
        if user_id.trim().is_empty() {
            return Err(AppError::Validation(
                "user_id is required for settings operations".to_string(),
            ));
        }
        Ok(())
    }

    /// Check RBAC for a given settings category using the domain policy.
    pub fn ensure_access(
        &self,
        user: &UserSession,
        category: SettingsCategory,
    ) -> Result<(), AppError> {
        SettingsAccessPolicy::ensure_access(user, category)
    }
}
