//! User consent data retrieval for GDPR export.

use crate::commands::AppError;
use rusqlite::OptionalExtension;
use tracing::error;

impl super::SettingsService {
    /// Get user consent data for export
    pub fn get_user_consent(&self, user_id: &str) -> Result<Option<serde_json::Value>, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let consent_row: Option<(String, i64, i64)> = conn
            .query_row(
                "SELECT consent_data, updated_at, created_at FROM user_consent WHERE user_id = ?",
                [user_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .map_err(|e| {
                error!("Failed to load user consent: {}", e);
                AppError::Database(format!("Failed to load user consent: {}", e))
            })?;

        Ok(consent_row.map(|(consent_data, updated_at, created_at)| {
            let parsed = serde_json::from_str::<serde_json::Value>(&consent_data)
                .unwrap_or_else(|_| serde_json::json!({ "raw": consent_data }));
            serde_json::json!({
                "data": parsed,
                "updated_at": updated_at,
                "created_at": created_at
            })
        }))
    }
}
