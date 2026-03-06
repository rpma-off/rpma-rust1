//! Application-wide settings (stored in the `application_settings` table).

use crate::commands::AppError;
use rusqlite::params;
use tracing::error;

impl super::SettingsService {
    /// Get maximum tasks per user setting
    ///
    /// Returns the configured maximum number of tasks a user can be assigned.
    /// This is a system-wide setting stored in application_settings table.
    pub fn get_max_tasks_per_user(&self) -> Result<i32, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // Try to get from application_settings
        let result: Result<i32, _> = conn.query_row(
            "SELECT value FROM application_settings WHERE key = 'max_tasks_per_user'",
            [],
            |row| row.get(0),
        );

        match result {
            Ok(value) => Ok(value),
            Err(_) => {
                // Default value if not configured
                Ok(10)
            }
        }
    }

    /// Set maximum tasks per user setting
    pub fn set_max_tasks_per_user(&self, max_tasks: i32) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        conn.execute(
            "INSERT INTO application_settings (key, value) VALUES ('max_tasks_per_user', ?)
             ON CONFLICT(key) DO UPDATE SET value = ?",
            params![max_tasks.to_string(), max_tasks.to_string()],
        )
        .map_err(|e| {
            error!("Failed to set max_tasks_per_user: {}", e);
            AppError::Database("Failed to update setting".to_string())
        })?;

        Ok(())
    }
}
