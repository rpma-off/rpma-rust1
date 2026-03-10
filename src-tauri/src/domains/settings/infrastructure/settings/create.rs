//! Create operations for user settings records.

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::UserSettings;
use rusqlite::{params, types::Value};
use tracing::{debug, error, info, warn};

pub(super) const INSERT_USER_SETTINGS_SQL: &str = r#"
    INSERT INTO user_settings (
        id, user_id, full_name, email, phone, avatar_url, notes,
        email_notifications, push_notifications, task_assignments, task_updates,
        system_alerts, weekly_reports, theme, language, date_format, time_format,
        high_contrast, large_text, reduce_motion, screen_reader, auto_refresh, refresh_interval,
        two_factor_enabled, session_timeout,
        cache_enabled, cache_size, offline_mode, sync_on_startup, background_sync,
        image_compression, preload_data,
        accessibility_high_contrast, accessibility_large_text, accessibility_reduce_motion,
        accessibility_screen_reader, accessibility_focus_indicators, accessibility_keyboard_navigation,
        accessibility_text_to_speech, accessibility_speech_rate, accessibility_font_size,
        accessibility_color_blind_mode,
        notifications_email_enabled, notifications_push_enabled, notifications_in_app_enabled,
        notifications_task_assigned, notifications_task_updated, notifications_task_completed,
        notifications_task_overdue, notifications_system_alerts, notifications_maintenance,
        notifications_security_alerts, notifications_quiet_hours_enabled,
        notifications_quiet_hours_start, notifications_quiet_hours_end,
        notifications_digest_frequency, notifications_batch_notifications,
        notifications_sound_enabled, notifications_sound_volume
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"#;

impl super::SettingsService {
    pub(super) fn build_user_settings_params(
        id: &str,
        user_id: &str,
        settings: &UserSettings,
    ) -> Vec<Value> {
        let mut params = Vec::with_capacity(60);
        params.push(Value::from(id.to_string()));
        params.push(Value::from(user_id.to_string()));
        params.push(Value::from(settings.profile.full_name.clone()));
        params.push(Value::from(settings.profile.email.clone()));
        params.push(match settings.profile.phone.as_deref() {
            Some(value) => Value::from(value.to_string()),
            None => Value::Null,
        });
        params.push(match settings.profile.avatar_url.as_deref() {
            Some(value) => Value::from(value.to_string()),
            None => Value::Null,
        });
        params.push(match settings.profile.notes.as_deref() {
            Some(value) => Value::from(value.to_string()),
            None => Value::Null,
        });
        params.push(Value::from(settings.preferences.email_notifications as i32));
        params.push(Value::from(settings.preferences.push_notifications as i32));
        params.push(Value::from(settings.preferences.task_assignments as i32));
        params.push(Value::from(settings.preferences.task_updates as i32));
        params.push(Value::from(settings.preferences.system_alerts as i32));
        params.push(Value::from(settings.preferences.weekly_reports as i32));
        params.push(Value::from(settings.preferences.theme.clone()));
        params.push(Value::from(settings.preferences.language.clone()));
        params.push(Value::from(settings.preferences.date_format.clone()));
        params.push(Value::from(settings.preferences.time_format.clone()));
        params.push(Value::from(settings.preferences.high_contrast as i32));
        params.push(Value::from(settings.preferences.large_text as i32));
        params.push(Value::from(settings.preferences.reduce_motion as i32));
        params.push(Value::from(settings.preferences.screen_reader as i32));
        params.push(Value::from(settings.preferences.auto_refresh as i32));
        params.push(Value::from(settings.preferences.refresh_interval as i64));
        params.push(Value::from(settings.security.two_factor_enabled as i32));
        params.push(Value::from(settings.security.session_timeout as i64));
        params.push(Value::from(settings.performance.cache_enabled as i32));
        params.push(Value::from(settings.performance.cache_size as i64));
        params.push(Value::from(settings.performance.offline_mode as i32));
        params.push(Value::from(settings.performance.sync_on_startup as i32));
        params.push(Value::from(settings.performance.background_sync as i32));
        params.push(Value::from(settings.performance.image_compression as i32));
        params.push(Value::from(settings.performance.preload_data as i32));
        params.push(Value::from(settings.accessibility.high_contrast as i32));
        params.push(Value::from(settings.accessibility.large_text as i32));
        params.push(Value::from(settings.accessibility.reduce_motion as i32));
        params.push(Value::from(settings.accessibility.screen_reader as i32));
        params.push(Value::from(settings.accessibility.focus_indicators as i32));
        params.push(Value::from(
            settings.accessibility.keyboard_navigation as i32,
        ));
        params.push(Value::from(settings.accessibility.text_to_speech as i32));
        params.push(Value::from(settings.accessibility.speech_rate as f64));
        params.push(Value::from(settings.accessibility.font_size as i64));
        params.push(Value::from(settings.accessibility.color_blind_mode.clone()));
        params.push(Value::from(settings.notifications.email_enabled as i32));
        params.push(Value::from(settings.notifications.push_enabled as i32));
        params.push(Value::from(settings.notifications.in_app_enabled as i32));
        params.push(Value::from(settings.notifications.task_assigned as i32));
        params.push(Value::from(settings.notifications.task_updated as i32));
        params.push(Value::from(settings.notifications.task_completed as i32));
        params.push(Value::from(settings.notifications.task_overdue as i32));
        params.push(Value::from(settings.notifications.system_alerts as i32));
        params.push(Value::from(settings.notifications.maintenance as i32));
        params.push(Value::from(settings.notifications.security_alerts as i32));
        params.push(Value::from(
            settings.notifications.quiet_hours_enabled as i32,
        ));
        params.push(Value::from(
            settings.notifications.quiet_hours_start.clone(),
        ));
        params.push(Value::from(settings.notifications.quiet_hours_end.clone()));
        params.push(Value::from(settings.notifications.digest_frequency.clone()));
        params.push(Value::from(
            settings.notifications.batch_notifications as i32,
        ));
        params.push(Value::from(settings.notifications.sound_enabled as i32));
        params.push(Value::from(settings.notifications.sound_volume as i64));
        params
    }

    /// Create user settings record
    pub(super) fn create_user_settings(
        &self,
        user_id: &str,
        settings: &UserSettings,
    ) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!(
                "Failed to get database connection for user {}: {}",
                user_id, e
            );
            AppError::Database("Database connection failed".to_string())
        })?;
        self.ensure_user_settings_schema_compatibility(&conn)?;

        // Check if settings already exist before creating
        let existing_count: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
            params![user_id],
            |row| row.get(0),
        );

        match existing_count {
            Ok(count) if count > 0 => {
                warn!(
                    "User settings already exist for user {}, skipping creation",
                    user_id
                );
                return Ok(());
            }
            Ok(_) => {} // Continue with creation
            Err(e) => {
                error!(
                    "Failed to check existing user settings for {}: {}",
                    user_id, e
                );
                return Err(AppError::Database(format!(
                    "Failed to check existing settings: {}",
                    e
                )));
            }
        }

        let id = crate::shared::utils::uuid::generate_uuid_string();

        debug!("Creating user settings for user {} with ID {}", user_id, id);

        let params = Self::build_user_settings_params(&id, user_id, settings);
        match conn.execute(INSERT_USER_SETTINGS_SQL, rusqlite::params_from_iter(params)) {
            Ok(_) => {
                info!(
                    "Successfully created user settings for user {} with ID {}",
                    user_id, id
                );
                Ok(())
            }
            Err(e) => {
                error!("Failed to create user settings for user {}: {}", user_id, e);

                // Provide more specific error messages
                let error_msg = match e {
                    rusqlite::Error::SqliteFailure(sqlite_err, _) => match sqlite_err.code {
                        rusqlite::ErrorCode::ConstraintViolation => {
                            if e.to_string().contains("UNIQUE") {
                                format!("User settings already exist for user {}", user_id)
                            } else {
                                format!("Constraint violation when creating user settings: {}", e)
                            }
                        }
                        _ => {
                            format!("Database error when creating user settings: {}", e)
                        }
                    },
                    _ => {
                        format!("Unexpected error when creating user settings: {}", e)
                    }
                };

                Err(AppError::Database(error_msg))
            }
        }
    }

    /// Ensure user settings record exists, create if not
    pub(super) fn ensure_user_settings_exist(&self, user_id: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;
        self.ensure_user_settings_schema_compatibility(&conn)?;

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
                params![user_id],
                |row| row.get(0),
            )
            .map_err(|e| {
                error!(
                    "Failed to check user settings existence for {}: {}",
                    user_id, e
                );
                AppError::Database("Failed to check user settings".to_string())
            })?;

        if count == 0 {
            let default_settings = UserSettings::default();
            self.create_user_settings(user_id, &default_settings)?;
        }

        Ok(())
    }

    /// Ensure user settings record exists within a transaction
    pub(super) fn ensure_user_settings_exist_with_tx(
        &self,
        tx: &rusqlite::Transaction,
        user_id: &str,
    ) -> Result<(), AppError> {
        let count: i32 = tx
            .query_row(
                "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
                params![user_id],
                |row| row.get(0),
            )
            .map_err(|e| {
                error!(
                    "Failed to check user settings existence for {}: {}",
                    user_id, e
                );
                AppError::Database("Failed to check user settings".to_string())
            })?;

        if count == 0 {
            let default_settings = UserSettings::default();
            self.create_user_settings_with_tx(tx, user_id, &default_settings)?;
        }

        Ok(())
    }

    /// Create user settings record within a transaction
    pub(super) fn create_user_settings_with_tx(
        &self,
        tx: &rusqlite::Transaction,
        user_id: &str,
        settings: &UserSettings,
    ) -> Result<(), AppError> {
        let id = crate::shared::utils::uuid::generate_uuid_string();

        let params = Self::build_user_settings_params(&id, user_id, settings);
        tx.execute(INSERT_USER_SETTINGS_SQL, rusqlite::params_from_iter(params))
            .map_err(|e| {
                error!("Failed to create user settings for {}: {}", user_id, e);
                AppError::Database("Failed to create user settings".to_string())
            })?;

        Ok(())
    }
}
