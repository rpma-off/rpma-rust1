//! Preferences update operations for SettingsService

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::UserPreferences;
use rusqlite::params;
use tracing::error;

const UPDATE_PREFERENCES_SQL: &str = r#"
    UPDATE user_settings SET
        email_notifications = ?, push_notifications = ?, task_assignments = ?, task_updates = ?,
        system_alerts = ?, weekly_reports = ?, theme = ?, language = ?, date_format = ?,
        time_format = ?, high_contrast = ?, large_text = ?, reduce_motion = ?, screen_reader = ?,
        auto_refresh = ?, refresh_interval = ?, updated_at = ?
     WHERE user_id = ?
"#;

impl super::SettingsService {
    /// Update UI/notification preferences (theme, language, refresh, etc.).
    pub fn update_user_preferences(
        &self,
        user_id: &str,
        preferences: &UserPreferences,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "preferences", |tx| {
            tx.execute(
                UPDATE_PREFERENCES_SQL,
                params![
                    preferences.email_notifications as i32,
                    preferences.push_notifications as i32,
                    preferences.task_assignments as i32,
                    preferences.task_updates as i32,
                    preferences.system_alerts as i32,
                    preferences.weekly_reports as i32,
                    preferences.theme,
                    preferences.language,
                    preferences.date_format,
                    preferences.time_format,
                    preferences.high_contrast as i32,
                    preferences.large_text as i32,
                    preferences.reduce_motion as i32,
                    preferences.screen_reader as i32,
                    preferences.auto_refresh as i32,
                    preferences.refresh_interval,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!("Failed to update user preferences for {}: {}", user_id, e);
                AppError::Database("Failed to update user preferences".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "preferences",
                &format!("Updated preferences: {:?}", preferences),
            );

            Ok(())
        })
    }
}
