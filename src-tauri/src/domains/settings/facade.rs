use std::sync::Arc;

use crate::domains::settings::infrastructure::settings::SettingsService;
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
}
