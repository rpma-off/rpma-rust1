//! Security settings update and password change operations for SettingsService

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::UserSecuritySettings;
use crate::shared::services::validation::ValidationService;
use rusqlite::params;
use tracing::error;

const UPDATE_SECURITY_SQL: &str = r#"
    UPDATE user_settings SET
        two_factor_enabled = ?, session_timeout = ?, updated_at = ?
     WHERE user_id = ?
"#;

impl super::SettingsService {
    /// Update security preferences (2FA toggle, session timeout).
    pub fn update_user_security(
        &self,
        user_id: &str,
        security: &UserSecuritySettings,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "security", |tx| {
            tx.execute(
                UPDATE_SECURITY_SQL,
                params![
                    security.two_factor_enabled as i32,
                    security.session_timeout,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!(
                    "Failed to update user security settings for {}: {}",
                    user_id, e
                );
                AppError::Database("Failed to update user security settings".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "security",
                &format!(
                    "Updated security settings: two_factor_enabled={}, session_timeout={}",
                    security.two_factor_enabled, security.session_timeout
                ),
            );

            Ok(())
        })
    }

    /// Change user password with current password verification and session revocation.
    pub fn change_user_password(
        &self,
        user_id: &str,
        current_password: &str,
        new_password: &str,
        current_session_token: &str,
        auth_service: &crate::shared::services::cross_domain::AuthService,
    ) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let stored_hash: String = conn
            .query_row(
                "SELECT password_hash FROM users WHERE id = ? AND is_active = 1",
                params![user_id],
                |row| row.get(0),
            )
            .map_err(|e| {
                error!("Failed to load password hash for {}: {}", user_id, e);
                AppError::Authentication("Invalid current password".to_string())
            })?;

        let is_current_password_valid = auth_service
            .verify_password(current_password, &stored_hash)
            .map_err(|e| {
                error!("Password verification failed for {}: {}", user_id, e);
                AppError::Authentication("Invalid current password".to_string())
            })?;

        if !is_current_password_valid {
            return Err(AppError::Authentication(
                "Current password is incorrect".to_string(),
            ));
        }

        let validator = ValidationService::new();
        let validated_new_password = validator
            .validate_password_enhanced(new_password)
            .map_err(|e| AppError::Validation(e.to_string()))?;

        let is_same_password = auth_service
            .verify_password(&validated_new_password, &stored_hash)
            .unwrap_or(false);
        if is_same_password {
            return Err(AppError::Validation(
                "New password must be different from the current password".to_string(),
            ));
        }

        auth_service
            .change_password(user_id, &validated_new_password)
            .map_err(|e| {
                error!("Failed to update password for {}: {}", user_id, e);
                AppError::Database(format!("Failed to update password: {}", e))
            })?;

        let current_session_token = current_session_token.to_string();

        // Invalidate all sessions for this user except the current one.
        conn.execute(
            "DELETE FROM sessions WHERE user_id = ? AND id != ?",
            params![user_id, current_session_token],
        )
        .map_err(|e| {
            error!("Failed to revoke sessions for {}: {}", user_id, e);
            AppError::Database("Failed to revoke other sessions".to_string())
        })?;

        Ok(())
    }
}
