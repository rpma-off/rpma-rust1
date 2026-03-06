//! Notification settings update operations for SettingsService

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::UserNotificationSettings;
use rusqlite::params;
use tracing::error;

const UPDATE_NOTIFICATIONS_SQL: &str = r#"
    UPDATE user_settings SET
        notifications_email_enabled = ?, notifications_push_enabled = ?, notifications_in_app_enabled = ?,
        notifications_task_assigned = ?, notifications_task_updated = ?, notifications_task_completed = ?,
        notifications_task_overdue = ?, notifications_system_alerts = ?, notifications_maintenance = ?,
        notifications_security_alerts = ?, notifications_quiet_hours_enabled = ?,
        notifications_quiet_hours_start = ?, notifications_quiet_hours_end = ?,
        notifications_digest_frequency = ?, notifications_batch_notifications = ?,
        notifications_sound_enabled = ?, notifications_sound_volume = ?, updated_at = ?
     WHERE user_id = ?
"#;

impl super::SettingsService {
    /// Update notification preferences (channels, quiet hours, digest, sound).
    pub fn update_user_notifications(
        &self,
        user_id: &str,
        notifications: &UserNotificationSettings,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "notifications", |tx| {
            tx.execute(
                UPDATE_NOTIFICATIONS_SQL,
                params![
                    notifications.email_enabled as i32,
                    notifications.push_enabled as i32,
                    notifications.in_app_enabled as i32,
                    notifications.task_assigned as i32,
                    notifications.task_updated as i32,
                    notifications.task_completed as i32,
                    notifications.task_overdue as i32,
                    notifications.system_alerts as i32,
                    notifications.maintenance as i32,
                    notifications.security_alerts as i32,
                    notifications.quiet_hours_enabled as i32,
                    notifications.quiet_hours_start,
                    notifications.quiet_hours_end,
                    notifications.digest_frequency,
                    notifications.batch_notifications as i32,
                    notifications.sound_enabled as i32,
                    notifications.sound_volume,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!(
                    "Failed to update user notification settings for {}: {}",
                    user_id, e
                );
                AppError::Database("Failed to update user notification settings".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "notifications",
                &format!(
                    "Updated notification settings: email_enabled={}, push_enabled={}",
                    notifications.email_enabled, notifications.push_enabled
                ),
            );

            Ok(())
        })
    }
}
