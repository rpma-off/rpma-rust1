//! Delete operations for user settings and accounts.

use crate::commands::AppError;
use rusqlite::params;
use tracing::error;
use uuid::Uuid;

impl super::SettingsService {
    /// Soft-delete user account and purge settings/consent/session data.
    pub fn delete_user_account(&self, user_id: &str) -> Result<(), AppError> {
        let mut conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let tx = conn.transaction().map_err(|e| {
            error!("Failed to start account deletion transaction: {}", e);
            AppError::Database("Failed to start account deletion".to_string())
        })?;

        let now = chrono::Utc::now().timestamp_millis();

        let updated_rows = tx
            .execute(
                "UPDATE users SET is_active = 0, deleted_at = ?, updated_at = ? WHERE id = ?",
                params![now, now, user_id],
            )
            .map_err(|e| {
                error!("Failed to soft-delete user {}: {}", user_id, e);
                AppError::Database("Failed to deactivate account".to_string())
            })?;

        if updated_rows == 0 {
            return Err(AppError::NotFound("User account not found".to_string()));
        }

        tx.execute("DELETE FROM sessions WHERE user_id = ?", params![user_id])
            .map_err(|e| {
                error!("Failed to revoke sessions for {}: {}", user_id, e);
                AppError::Database("Failed to revoke sessions".to_string())
            })?;

        tx.execute(
            "DELETE FROM user_settings WHERE user_id = ?",
            params![user_id],
        )
        .map_err(|e| {
            error!("Failed to purge settings for {}: {}", user_id, e);
            AppError::Database("Failed to purge user settings".to_string())
        })?;

        tx.execute(
            "DELETE FROM user_consent WHERE user_id = ?",
            params![user_id],
        )
        .map_err(|e| {
            error!("Failed to purge consent for {}: {}", user_id, e);
            AppError::Database("Failed to purge user consent".to_string())
        })?;

        let _ = tx.execute(
            "INSERT INTO settings_audit_log (id, user_id, setting_type, details, timestamp) VALUES (?, ?, ?, ?, ?)",
            params![
                Uuid::new_v4().to_string(),
                user_id,
                "account",
                "Account soft-deleted and user settings/consent purged",
                now
            ],
        );

        tx.commit().map_err(|e| {
            error!("Failed to commit account deletion transaction: {}", e);
            AppError::Database("Failed to finalize account deletion".to_string())
        })?;

        Ok(())
    }

    /// Delete user settings (for GDPR compliance)
    pub fn delete_user_settings(&self, user_id: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;
        self.ensure_user_settings_schema_compatibility(&conn)?;

        conn.execute(
            "DELETE FROM user_settings WHERE user_id = ?",
            params![user_id],
        )
        .map_err(|e| {
            error!("Failed to delete user settings for {}: {}", user_id, e);
            AppError::Database("Failed to delete user settings".to_string())
        })?;

        Ok(())
    }
}
