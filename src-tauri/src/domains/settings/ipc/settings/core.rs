//! Core settings operations and shared utilities
//!
//! This module provides the foundation for settings operations,
//! including shared utilities, authentication helpers, and common patterns.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::settings::domain::models::settings::{AppSettings, SystemConfiguration};
use crate::resolve_context;
use crate::shared::context::AuthContext;
use crate::shared::contracts::auth::UserRole;

use std::sync::Mutex;

// SystemConfiguration is not yet persisted to the database.
// It will be migrated in a future iteration.
static SYSTEM_CONFIG: Mutex<Option<SystemConfiguration>> = Mutex::new(None);

/// Get app settings (command) — reads from the `app_settings` table.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn get_app_settings(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&session_token, &state, &correlation_id, UserRole::Admin);

    let settings = state
        .settings_service
        .get_app_settings_db()
        .map_err(|e| handle_settings_error(e, "get_app_settings"))?;

    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Get system configuration with lazy initialization.
///
/// `SystemConfiguration` is not yet persisted — returns in-memory defaults.
pub fn get_system_config() -> Result<SystemConfiguration, String> {
    let mut config = SYSTEM_CONFIG
        .lock()
        .unwrap_or_else(|p| p.into_inner());

    if config.is_none() {
        *config = Some(SystemConfiguration::default());
    }

    config
        .clone()
        .ok_or_else(|| "Failed to get system config".to_string())
}

/// Validate settings update permissions.
pub fn validate_settings_permissions(
    auth: &AuthContext,
    required_role: UserRole,
) -> Result<(), AppError> {
    if !matches!(auth.role, UserRole::Admin) && auth.role != required_role {
        return Err(AppError::Authorization(
            "Insufficient permissions to modify settings".to_string(),
        ));
    }
    Ok(())
}

/// Common error handling for settings operations.
pub fn handle_settings_error<E: std::fmt::Display>(error: E, operation: &str) -> AppError {
    tracing::error!("Settings operation '{}' failed: {}", operation, error);
    AppError::Database(format!("{} failed: {}", operation, error))
}

/// Extract the canonical user ID for settings operations.
pub fn settings_user_id(auth: &AuthContext) -> &str {
    &auth.user_id
}

#[cfg(test)]
mod tests {
    use super::settings_user_id;
    use crate::shared::context::AuthContext;
    use crate::shared::contracts::auth::{UserRole, UserSession};

    #[test]
    fn settings_user_id_uses_user_id_field() {
        let session = UserSession {
            id: "session-token".to_string(),
            user_id: "user-123".to_string(),
            username: "tester".to_string(),
            email: "tester@example.com".to_string(),
            role: UserRole::Technician,
            token: "session-token".to_string(),
            expires_at: "2099-01-01T00:00:00Z".to_string(),
            last_activity: "2099-01-01T00:00:00Z".to_string(),
            created_at: "2099-01-01T00:00:00Z".to_string(),
        };
        let auth = AuthContext::from(&session);

        assert_eq!(settings_user_id(&auth), "user-123");
    }
}
