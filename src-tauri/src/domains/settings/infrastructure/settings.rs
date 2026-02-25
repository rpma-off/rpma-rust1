//! Settings service for user settings management

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::{
    UserAccessibilitySettings, UserNotificationSettings, UserPerformanceSettings, UserPreferences,
    UserProfileSettings, UserSecuritySettings, UserSettings,
};
use crate::shared::services::validation::ValidationService;
use rusqlite::{params, types::Value, OptionalExtension};
use std::collections::HashSet;
use std::sync::Arc;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

const INSERT_USER_SETTINGS_SQL: &str = r#"
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

const UPDATE_PROFILE_SQL: &str = r#"
    UPDATE user_settings SET
        full_name = ?, email = ?, phone = ?, avatar_url = ?, notes = ?, updated_at = ?
     WHERE user_id = ?
"#;

const UPDATE_PREFERENCES_SQL: &str = r#"
    UPDATE user_settings SET
        email_notifications = ?, push_notifications = ?, task_assignments = ?, task_updates = ?,
        system_alerts = ?, weekly_reports = ?, theme = ?, language = ?, date_format = ?,
        time_format = ?, high_contrast = ?, large_text = ?, reduce_motion = ?, screen_reader = ?,
        auto_refresh = ?, refresh_interval = ?, updated_at = ?
     WHERE user_id = ?
"#;

const UPDATE_SECURITY_SQL: &str = r#"
    UPDATE user_settings SET
        two_factor_enabled = ?, session_timeout = ?, updated_at = ?
     WHERE user_id = ?
"#;

const UPDATE_PERFORMANCE_SQL: &str = r#"
    UPDATE user_settings SET
        cache_enabled = ?, cache_size = ?, offline_mode = ?, sync_on_startup = ?,
        background_sync = ?, image_compression = ?, preload_data = ?, updated_at = ?
     WHERE user_id = ?
"#;

const UPDATE_ACCESSIBILITY_SQL: &str = r#"
    UPDATE user_settings SET
        accessibility_high_contrast = ?, accessibility_large_text = ?, accessibility_reduce_motion = ?,
        accessibility_screen_reader = ?, accessibility_focus_indicators = ?, accessibility_keyboard_navigation = ?,
        accessibility_text_to_speech = ?, accessibility_speech_rate = ?, accessibility_font_size = ?,
        accessibility_color_blind_mode = ?, updated_at = ?
     WHERE user_id = ?
"#;

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

#[derive(Clone, Debug)]
pub struct SettingsService {
    db: Arc<crate::db::Database>,
}

impl SettingsService {
    pub fn new(db: Arc<crate::db::Database>) -> Self {
        Self { db }
    }

    fn build_user_settings_params(id: &str, user_id: &str, settings: &UserSettings) -> Vec<Value> {
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

    fn with_settings_tx<T>(
        &self,
        user_id: &str,
        context: &str,
        op: impl FnOnce(&rusqlite::Transaction) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        let mut conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;
        self.ensure_user_settings_schema_compatibility(&conn)?;

        let tx = conn.transaction().map_err(|e| {
            error!("Failed to start transaction for {} update: {}", context, e);
            AppError::Database("Failed to start transaction".to_string())
        })?;

        self.ensure_user_settings_exist_with_tx(&tx, user_id)?;

        let result = op(&tx)?;

        tx.commit().map_err(|e| {
            error!(
                "Failed to commit {} update transaction for {}: {}",
                context, user_id, e
            );
            AppError::Database("Failed to commit transaction".to_string())
        })?;

        Ok(result)
    }

    /// Legacy databases may miss columns that newer settings code expects.
    /// We patch the table in-place to keep settings reads/updates resilient.
    fn ensure_user_settings_schema_compatibility(
        &self,
        conn: &rusqlite::Connection,
    ) -> Result<(), AppError> {
        const EXPECTED_COLUMNS: &[(&str, &str)] = &[
            ("full_name", "TEXT"),
            ("email", "TEXT"),
            ("phone", "TEXT"),
            ("avatar_url", "TEXT"),
            ("notes", "TEXT"),
            ("email_notifications", "INTEGER NOT NULL DEFAULT 1"),
            ("push_notifications", "INTEGER NOT NULL DEFAULT 1"),
            ("task_assignments", "INTEGER NOT NULL DEFAULT 1"),
            ("task_updates", "INTEGER NOT NULL DEFAULT 1"),
            ("system_alerts", "INTEGER NOT NULL DEFAULT 1"),
            ("weekly_reports", "INTEGER NOT NULL DEFAULT 0"),
            ("theme", "TEXT NOT NULL DEFAULT 'system'"),
            ("language", "TEXT NOT NULL DEFAULT 'fr'"),
            ("date_format", "TEXT NOT NULL DEFAULT 'DD/MM/YYYY'"),
            ("time_format", "TEXT NOT NULL DEFAULT '24h'"),
            ("high_contrast", "INTEGER NOT NULL DEFAULT 0"),
            ("large_text", "INTEGER NOT NULL DEFAULT 0"),
            ("reduce_motion", "INTEGER NOT NULL DEFAULT 0"),
            ("screen_reader", "INTEGER NOT NULL DEFAULT 0"),
            ("auto_refresh", "INTEGER NOT NULL DEFAULT 1"),
            ("refresh_interval", "INTEGER NOT NULL DEFAULT 60"),
            ("two_factor_enabled", "INTEGER NOT NULL DEFAULT 0"),
            ("session_timeout", "INTEGER NOT NULL DEFAULT 480"),
            ("cache_enabled", "INTEGER NOT NULL DEFAULT 1"),
            ("cache_size", "INTEGER NOT NULL DEFAULT 100"),
            ("offline_mode", "INTEGER NOT NULL DEFAULT 0"),
            ("sync_on_startup", "INTEGER NOT NULL DEFAULT 1"),
            ("background_sync", "INTEGER NOT NULL DEFAULT 1"),
            ("image_compression", "INTEGER NOT NULL DEFAULT 1"),
            ("preload_data", "INTEGER NOT NULL DEFAULT 0"),
            ("accessibility_high_contrast", "INTEGER NOT NULL DEFAULT 0"),
            ("accessibility_large_text", "INTEGER NOT NULL DEFAULT 0"),
            ("accessibility_reduce_motion", "INTEGER NOT NULL DEFAULT 0"),
            ("accessibility_screen_reader", "INTEGER NOT NULL DEFAULT 0"),
            (
                "accessibility_focus_indicators",
                "INTEGER NOT NULL DEFAULT 1",
            ),
            (
                "accessibility_keyboard_navigation",
                "INTEGER NOT NULL DEFAULT 1",
            ),
            ("accessibility_text_to_speech", "INTEGER NOT NULL DEFAULT 0"),
            ("accessibility_speech_rate", "REAL NOT NULL DEFAULT 1.0"),
            ("accessibility_font_size", "INTEGER NOT NULL DEFAULT 16"),
            (
                "accessibility_color_blind_mode",
                "TEXT NOT NULL DEFAULT 'none'",
            ),
            ("notifications_email_enabled", "INTEGER NOT NULL DEFAULT 1"),
            ("notifications_push_enabled", "INTEGER NOT NULL DEFAULT 1"),
            ("notifications_in_app_enabled", "INTEGER NOT NULL DEFAULT 1"),
            ("notifications_task_assigned", "INTEGER NOT NULL DEFAULT 1"),
            ("notifications_task_updated", "INTEGER NOT NULL DEFAULT 1"),
            ("notifications_task_completed", "INTEGER NOT NULL DEFAULT 0"),
            ("notifications_task_overdue", "INTEGER NOT NULL DEFAULT 1"),
            ("notifications_system_alerts", "INTEGER NOT NULL DEFAULT 1"),
            ("notifications_maintenance", "INTEGER NOT NULL DEFAULT 0"),
            (
                "notifications_security_alerts",
                "INTEGER NOT NULL DEFAULT 1",
            ),
            (
                "notifications_quiet_hours_enabled",
                "INTEGER NOT NULL DEFAULT 0",
            ),
            (
                "notifications_quiet_hours_start",
                "TEXT NOT NULL DEFAULT '22:00'",
            ),
            (
                "notifications_quiet_hours_end",
                "TEXT NOT NULL DEFAULT '08:00'",
            ),
            (
                "notifications_digest_frequency",
                "TEXT NOT NULL DEFAULT 'never'",
            ),
            (
                "notifications_batch_notifications",
                "INTEGER NOT NULL DEFAULT 0",
            ),
            ("notifications_sound_enabled", "INTEGER NOT NULL DEFAULT 1"),
            ("notifications_sound_volume", "INTEGER NOT NULL DEFAULT 70"),
            ("updated_at", "INTEGER NOT NULL DEFAULT 0"),
        ];

        let mut stmt = conn
            .prepare("PRAGMA table_info(user_settings)")
            .map_err(|e| {
                AppError::Database(format!("Failed to inspect user_settings schema: {}", e))
            })?;

        let existing_columns: HashSet<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| {
                AppError::Database(format!("Failed to inspect user_settings columns: {}", e))
            })?
            .collect::<Result<HashSet<_>, _>>()
            .map_err(|e| {
                AppError::Database(format!("Failed to read user_settings columns: {}", e))
            })?;

        if existing_columns.is_empty() {
            return Err(AppError::Database(
                "user_settings table not found while validating settings schema".to_string(),
            ));
        }

        for &(column, definition) in EXPECTED_COLUMNS {
            if existing_columns.contains(column) {
                continue;
            }

            let alter_sql = format!(
                "ALTER TABLE user_settings ADD COLUMN {} {}",
                column, definition
            );
            conn.execute(&alter_sql, []).map_err(|e| {
                AppError::Database(format!(
                    "Failed to upgrade user settings schema (missing column '{}'): {}",
                    column, e
                ))
            })?;
            warn!(
                "Added missing '{}' column to user_settings table for compatibility",
                column
            );
        }

        Ok(())
    }

    /// Get user settings by user ID
    pub fn get_user_settings(&self, user_id: &str) -> Result<UserSettings, AppError> {
        // Get connection and ensure schema compatibility first
        let conn = self.db.get_connection().map_err(|e| {
            error!(
                "Failed to get database connection for user {}: {}",
                user_id, e
            );
            AppError::Database("Database connection failed".to_string())
        })?;
        self.ensure_user_settings_schema_compatibility(&conn)?;

        // Try to get existing settings
        let result: Result<UserSettings, _> = conn.query_row(
            "SELECT
                id, user_id, COALESCE(full_name, ''), COALESCE(email, ''), phone, avatar_url, notes,
                COALESCE(email_notifications, 1), COALESCE(push_notifications, 1), COALESCE(task_assignments, 1), COALESCE(task_updates, 1),
                COALESCE(system_alerts, 1), COALESCE(weekly_reports, 0), COALESCE(theme, 'system'), COALESCE(language, 'fr'), COALESCE(date_format, 'DD/MM/YYYY'), COALESCE(time_format, '24h'),
                COALESCE(high_contrast, 0), COALESCE(large_text, 0), COALESCE(reduce_motion, 0), COALESCE(screen_reader, 0), COALESCE(auto_refresh, 1), COALESCE(refresh_interval, 60),
                COALESCE(two_factor_enabled, 0), COALESCE(session_timeout, 480),
                COALESCE(cache_enabled, 1), COALESCE(cache_size, 100), COALESCE(offline_mode, 0), COALESCE(sync_on_startup, 1), COALESCE(background_sync, 1),
                COALESCE(image_compression, 1), COALESCE(preload_data, 0),
                COALESCE(accessibility_high_contrast, 0), COALESCE(accessibility_large_text, 0), COALESCE(accessibility_reduce_motion, 0),
                COALESCE(accessibility_screen_reader, 0), COALESCE(accessibility_focus_indicators, 1), COALESCE(accessibility_keyboard_navigation, 1),
                COALESCE(accessibility_text_to_speech, 0), COALESCE(accessibility_speech_rate, 1.0), COALESCE(accessibility_font_size, 16),
                COALESCE(accessibility_color_blind_mode, 'none'),
                COALESCE(notifications_email_enabled, 1), COALESCE(notifications_push_enabled, 1), COALESCE(notifications_in_app_enabled, 1),
                COALESCE(notifications_task_assigned, 1), COALESCE(notifications_task_updated, 1), COALESCE(notifications_task_completed, 0),
                COALESCE(notifications_task_overdue, 1), COALESCE(notifications_system_alerts, 1), COALESCE(notifications_maintenance, 0),
                COALESCE(notifications_security_alerts, 1), COALESCE(notifications_quiet_hours_enabled, 0),
                COALESCE(notifications_quiet_hours_start, '22:00'), COALESCE(notifications_quiet_hours_end, '08:00'),
                COALESCE(notifications_digest_frequency, 'never'), COALESCE(notifications_batch_notifications, 0),
                COALESCE(notifications_sound_enabled, 1), COALESCE(notifications_sound_volume, 70)
             FROM user_settings WHERE user_id = ?",
            params![user_id],
            |row| {
                Ok(UserSettings {
                    profile: UserProfileSettings {
                        full_name: row.get(2)?,
                        email: row.get(3)?,
                        phone: row.get(4)?,
                        avatar_url: row.get(5)?,
                        notes: row.get(6)?,
                    },
                    preferences: UserPreferences {
                        email_notifications: row.get::<_, i32>(7)? != 0,
                        push_notifications: row.get::<_, i32>(8)? != 0,
                        task_assignments: row.get::<_, i32>(9)? != 0,
                        task_updates: row.get::<_, i32>(10)? != 0,
                        system_alerts: row.get::<_, i32>(11)? != 0,
                        weekly_reports: row.get::<_, i32>(12)? != 0,
                        theme: row.get(13)?,
                        language: row.get(14)?,
                        date_format: row.get(15)?,
                        time_format: row.get(16)?,
                        high_contrast: row.get::<_, i32>(17)? != 0,
                        large_text: row.get::<_, i32>(18)? != 0,
                        reduce_motion: row.get::<_, i32>(19)? != 0,
                        screen_reader: row.get::<_, i32>(20)? != 0,
                        auto_refresh: row.get::<_, i32>(21)? != 0,
                        refresh_interval: row.get::<_, u32>(22)?,
                    },
                    security: UserSecuritySettings {
                        two_factor_enabled: row.get::<_, i32>(23)? != 0,
                        session_timeout: row.get::<_, u32>(24)?,
                    },
                    performance: UserPerformanceSettings {
                        cache_enabled: row.get::<_, i32>(25)? != 0,
                        cache_size: row.get::<_, u32>(26)?,
                        offline_mode: row.get::<_, i32>(27)? != 0,
                        sync_on_startup: row.get::<_, i32>(28)? != 0,
                        background_sync: row.get::<_, i32>(29)? != 0,
                        image_compression: row.get::<_, i32>(30)? != 0,
                        preload_data: row.get::<_, i32>(31)? != 0,
                    },
                    accessibility: UserAccessibilitySettings {
                        high_contrast: row.get::<_, i32>(32)? != 0,
                        large_text: row.get::<_, i32>(33)? != 0,
                        reduce_motion: row.get::<_, i32>(34)? != 0,
                        screen_reader: row.get::<_, i32>(35)? != 0,
                        focus_indicators: row.get::<_, i32>(36)? != 0,
                        keyboard_navigation: row.get::<_, i32>(37)? != 0,
                        text_to_speech: row.get::<_, i32>(38)? != 0,
                        speech_rate: row.get::<_, f32>(39)?,
                        font_size: row.get::<_, u32>(40)?,
                        color_blind_mode: row.get(41)?,
                    },
                    notifications: UserNotificationSettings {
                        email_enabled: row.get::<_, i32>(42)? != 0,
                        push_enabled: row.get::<_, i32>(43)? != 0,
                        in_app_enabled: row.get::<_, i32>(44)? != 0,
                        task_assigned: row.get::<_, i32>(45)? != 0,
                        task_updated: row.get::<_, i32>(46)? != 0,
                        task_completed: row.get::<_, i32>(47)? != 0,
                        task_overdue: row.get::<_, i32>(48)? != 0,
                        system_alerts: row.get::<_, i32>(49)? != 0,
                        maintenance: row.get::<_, i32>(50)? != 0,
                        security_alerts: row.get::<_, i32>(51)? != 0,
                        quiet_hours_enabled: row.get::<_, i32>(52)? != 0,
                        quiet_hours_start: row.get(53)?,
                        quiet_hours_end: row.get(54)?,
                        digest_frequency: row.get(55)?,
                        batch_notifications: row.get::<_, i32>(56)? != 0,
                        sound_enabled: row.get::<_, i32>(57)? != 0,
                        sound_volume: row.get::<_, u32>(58)?,
                    },
                })
            }
        );

        match result {
            Ok(settings) => Ok(settings),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // Create default settings for new user
                warn!("No settings found for user {}, creating defaults", user_id);
                let default_settings = UserSettings::default();

                // Try to create the settings with detailed error logging
                match self.create_user_settings(user_id, &default_settings) {
                    Ok(()) => {
                        info!("Successfully created default settings for user {}", user_id);
                        Ok(default_settings)
                    }
                    Err(e) => {
                        error!(
                            "Failed to create default settings for user {}: {}",
                            user_id, e
                        );

                        // Log the error details for debugging
                        match e {
                            AppError::Database(ref msg) => {
                                error!("Database error details: {}", msg);

                                // Check if it's a constraint violation
                                if msg.contains("UNIQUE constraint failed") {
                                    error!("User settings already exists for user {}, attempting to retrieve", user_id);
                                    // Try once more to get the settings
                                    return self.get_user_settings(user_id);
                                }
                            }
                            _ => {}
                        }

                        Err(AppError::Database(format!(
                            "Failed to create user settings for user {}: {}",
                            user_id, e
                        )))
                    }
                }
            }
            Err(e) => {
                error!("Failed to get user settings for {}: {}", user_id, e);

                // Handle specific database errors with more context
                let error_msg = match e {
                    rusqlite::Error::SqliteFailure(sqlite_err, _) => {
                        match sqlite_err.code {
                            rusqlite::ErrorCode::ConstraintViolation => {
                                error!(
                                    "Constraint violation when accessing user_settings for user {}",
                                    user_id
                                );
                                format!("Database constraint violation when accessing user settings: {}", e)
                            }
                            rusqlite::ErrorCode::CannotOpen => {
                                error!(
                                    "Cannot open database when accessing user_settings for user {}",
                                    user_id
                                );
                                "Database access error: cannot open database".to_string()
                            }
                            _ => {
                                format!("Database error when accessing user settings: {}", e)
                            }
                        }
                    }
                    _ => {
                        format!("Unexpected error when accessing user settings: {}", e)
                    }
                };

                Err(AppError::Database(error_msg))
            }
        }
    }

    /// Create user settings record
    fn create_user_settings(&self, user_id: &str, settings: &UserSettings) -> Result<(), AppError> {
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

        let id = Uuid::new_v4().to_string();

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

    /// Update user profile settings with transaction
    pub fn update_user_profile(
        &self,
        user_id: &str,
        profile: &UserProfileSettings,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "profile", |tx| {
            tx.execute(
                UPDATE_PROFILE_SQL,
                params![
                    profile.full_name,
                    profile.email,
                    profile.phone,
                    profile.avatar_url,
                    profile.notes,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!("Failed to update user profile for {}: {}", user_id, e);
                AppError::Database("Failed to update user profile".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "profile",
                &format!("Updated profile: {:?}", profile),
            );

            Ok(())
        })
    }

    /// Update user preferences with transaction
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

    /// Update user security settings
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

    /// Update user performance settings
    pub fn update_user_performance(
        &self,
        user_id: &str,
        performance: &UserPerformanceSettings,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "performance", |tx| {
            tx.execute(
                UPDATE_PERFORMANCE_SQL,
                params![
                    performance.cache_enabled as i32,
                    performance.cache_size,
                    performance.offline_mode as i32,
                    performance.sync_on_startup as i32,
                    performance.background_sync as i32,
                    performance.image_compression as i32,
                    performance.preload_data as i32,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!(
                    "Failed to update user performance settings for {}: {}",
                    user_id, e
                );
                AppError::Database("Failed to update user performance settings".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "performance",
                &format!(
                    "Updated performance settings: cache_enabled={}, cache_size={}, offline_mode={}",
                    performance.cache_enabled, performance.cache_size, performance.offline_mode
                ),
            );

            Ok(())
        })
    }

    /// Update user accessibility settings
    pub fn update_user_accessibility(
        &self,
        user_id: &str,
        accessibility: &UserAccessibilitySettings,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "accessibility", |tx| {
            tx.execute(
                UPDATE_ACCESSIBILITY_SQL,
                params![
                    accessibility.high_contrast as i32,
                    accessibility.large_text as i32,
                    accessibility.reduce_motion as i32,
                    accessibility.screen_reader as i32,
                    accessibility.focus_indicators as i32,
                    accessibility.keyboard_navigation as i32,
                    accessibility.text_to_speech as i32,
                    accessibility.speech_rate,
                    accessibility.font_size,
                    accessibility.color_blind_mode,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!(
                    "Failed to update user accessibility settings for {}: {}",
                    user_id, e
                );
                AppError::Database("Failed to update user accessibility settings".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "accessibility",
                &format!(
                    "Updated accessibility settings: high_contrast={}, large_text={}",
                    accessibility.high_contrast, accessibility.large_text
                ),
            );

            Ok(())
        })
    }

    /// Update user notification settings
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

    /// Change user password with current password verification and session revocation.
    pub fn change_user_password(
        &self,
        user_id: &str,
        current_password: &str,
        new_password: &str,
        current_session_token: &str,
        auth_service: &crate::domains::auth::infrastructure::auth::AuthService,
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

    /// Ensure user settings record exists, create if not
    fn ensure_user_settings_exist(&self, user_id: &str) -> Result<(), AppError> {
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
    fn ensure_user_settings_exist_with_tx(
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
    fn create_user_settings_with_tx(
        &self,
        tx: &rusqlite::Transaction,
        user_id: &str,
        settings: &UserSettings,
    ) -> Result<(), AppError> {
        let id = Uuid::new_v4().to_string();

        let params = Self::build_user_settings_params(&id, user_id, settings);
        tx.execute(INSERT_USER_SETTINGS_SQL, rusqlite::params_from_iter(params))
            .map_err(|e| {
                error!("Failed to create user settings for {}: {}", user_id, e);
                AppError::Database("Failed to create user settings".to_string())
            })?;

        Ok(())
    }

    /// Log settings change for audit purposes
    fn log_settings_change(
        &self,
        tx: &rusqlite::Transaction,
        user_id: &str,
        setting_type: &str,
        details: &str,
    ) {
        let id = Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().timestamp_millis();

        if let Err(e) = tx.execute(
            "INSERT INTO settings_audit_log (id, user_id, setting_type, details, timestamp) VALUES (?, ?, ?, ?, ?)",
            params![id, user_id, setting_type, details, timestamp],
        ) {
            error!("Failed to log settings change for user {}: {}", user_id, e);
            warn!("Audit logging failed but continuing with settings update");
        }
    }

    /// Validate and persist a base64-encoded avatar image for a user.
    ///
    /// All avatar business rules (size limit, allowed MIME types, encoding) are
    /// enforced here rather than in the IPC handler.
    pub fn upload_avatar(
        &self,
        user_id: &str,
        avatar_data: &str,
        mime_type: &str,
    ) -> Result<String, AppError> {
        use base64::{engine::general_purpose, Engine as _};

        let decoded = general_purpose::STANDARD
            .decode(avatar_data)
            .map_err(|e| AppError::Validation(format!("Invalid base64 data: {}", e)))?;

        if decoded.len() > 5 * 1024 * 1024 {
            return Err(AppError::Validation(
                "Avatar file too large (max 5MB)".to_string(),
            ));
        }

        if !["image/jpeg", "image/png", "image/gif", "image/webp"].contains(&mime_type) {
            return Err(AppError::Validation("Unsupported image format".to_string()));
        }

        let data_url = format!("data:{};base64,{}", mime_type.trim(), avatar_data.trim());

        let mut profile = self.get_user_settings(user_id)?.profile;
        profile.avatar_url = Some(data_url.clone());
        self.update_user_profile(user_id, &profile)?;

        Ok(data_url)
    }

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

#[cfg(test)]
mod tests {
    use super::SettingsService;
    use crate::domains::auth::infrastructure::auth::AuthService;
    use crate::shared::contracts::auth::{UserAccount, UserRole};
    use chrono::Utc;
    use rusqlite::params;
    use std::sync::Arc;
    use tempfile::TempDir;
    use tracing::{debug, info};
    use uuid::Uuid;

    struct LocalTestDb {
        _temp_dir: TempDir,
        db: Arc<crate::db::Database>,
    }

    impl LocalTestDb {
        fn new() -> Self {
            let temp_dir = tempfile::tempdir().expect("failed to create temp dir");
            let db_path = temp_dir.path().join("settings-service-tests.db");
            let db = Arc::new(
                crate::db::Database::new(&db_path, "test_encryption_key_32_bytes_long!")
                    .expect("failed to create database"),
            );
            db.init().expect("failed to init database");
            let latest = crate::db::Database::get_latest_migration_version();
            db.migrate(latest).expect("failed to run migrations");

            Self {
                _temp_dir: temp_dir,
                db,
            }
        }
    }

    fn setup_services() -> (LocalTestDb, SettingsService, AuthService) {
        let test_db = LocalTestDb::new();
        let db = test_db.db.clone();
        let settings_service = SettingsService::new(db.clone());
        let auth_service =
            AuthService::new(db.as_ref().clone()).expect("failed to create auth service");

        (test_db, settings_service, auth_service)
    }

    fn create_test_user(auth_service: &AuthService) -> crate::shared::contracts::auth::UserAccount {
        auth_service
            .create_account(
                "settings.test@example.com",
                "settings.test@example.com",
                "Settings",
                "Tester",
                crate::shared::contracts::auth::UserRole::Technician,
                "CurrentPass1!",
            )
            .expect("failed to create test user")
    }

    fn insert_session(
        test_db: &LocalTestDb,
        user: &crate::shared::contracts::auth::UserAccount,
        token: &str,
    ) {
        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");
        let now_ms = Utc::now().timestamp_millis();
        let expires_ms = (Utc::now() + chrono::Duration::hours(8)).timestamp_millis();
        conn.execute(
            "INSERT INTO sessions (id, user_id, username, email, role, created_at, expires_at, last_activity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                token,
                user.id,
                user.username,
                user.email,
                user.role.to_string(),
                now_ms,
                expires_ms,
                now_ms,
            ],
        )
        .expect("failed to insert session");
    }

    #[test]
    fn default_settings_bootstrap_on_first_fetch() {
        let (test_db, settings_service, auth_service) = setup_services();
        let user = create_test_user(&auth_service);

        let first = settings_service
            .get_user_settings(&user.id)
            .expect("failed to get first settings");
        assert_eq!(first.preferences.theme, "system");
        assert_eq!(first.performance.cache_enabled, true);
        assert_eq!(first.notifications.email_enabled, true);

        let second = settings_service
            .get_user_settings(&user.id)
            .expect("failed to get second settings");
        assert_eq!(second.preferences.theme, "system");

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count settings rows");
        assert_eq!(count, 1);
    }

    #[test]
    fn legacy_user_settings_schema_is_healed_automatically() {
        let (test_db, settings_service, _auth_service) = setup_services();
        let legacy_user_id = "legacy-user-1";

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");

        conn.execute("DROP TABLE IF EXISTS user_settings", [])
            .expect("failed to drop user_settings");
        conn.execute(
            "CREATE TABLE user_settings (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL UNIQUE
            )",
            [],
        )
        .expect("failed to create legacy user_settings table");

        conn.execute(
            "INSERT INTO user_settings (id, user_id) VALUES (?, ?)",
            params![Uuid::new_v4().to_string(), legacy_user_id],
        )
        .expect("failed to seed legacy user_settings row");

        let settings = settings_service
            .get_user_settings(legacy_user_id)
            .expect("failed to load settings from legacy schema");
        assert_eq!(settings.preferences.theme, "system");
        assert_eq!(settings.notifications.sound_volume, 70);

        let mut stmt = conn
            .prepare("PRAGMA table_info(user_settings)")
            .expect("failed to inspect user_settings columns");
        let columns: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .expect("failed to iterate user_settings columns")
            .collect::<Result<Vec<_>, _>>()
            .expect("failed to collect user_settings columns");

        assert!(columns.contains(&"notes".to_string()));
        assert!(columns.contains(&"updated_at".to_string()));
        assert!(columns.contains(&"notifications_sound_volume".to_string()));
    }

    #[test]
    fn legacy_nullable_quiet_hours_are_coalesced_on_read() {
        let (test_db, settings_service, _auth_service) = setup_services();
        let legacy_user_id = "legacy-user-null-quiet-hours";

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");

        conn.execute("DROP TABLE IF EXISTS user_settings", [])
            .expect("failed to drop user_settings");
        conn.execute(
            "CREATE TABLE user_settings (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL UNIQUE,
                notifications_quiet_hours_start TEXT,
                notifications_quiet_hours_end TEXT
            )",
            [],
        )
        .expect("failed to create legacy nullable user_settings table");

        conn.execute(
            "INSERT INTO user_settings (id, user_id, notifications_quiet_hours_start, notifications_quiet_hours_end)
             VALUES (?, ?, NULL, NULL)",
            params![Uuid::new_v4().to_string(), legacy_user_id],
        )
        .expect("failed to seed legacy nullable user_settings row");

        let settings = settings_service
            .get_user_settings(legacy_user_id)
            .expect("failed to load settings with nullable quiet hours");

        assert_eq!(settings.notifications.quiet_hours_start, "22:00");
        assert_eq!(settings.notifications.quiet_hours_end, "08:00");
    }

    #[test]
    fn profile_update_and_avatar_roundtrip() {
        let (_test_db, settings_service, auth_service) = setup_services();
        let user = create_test_user(&auth_service);

        let mut settings = settings_service
            .get_user_settings(&user.id)
            .expect("failed to load settings");
        settings.profile.full_name = "Settings Tester".to_string();
        settings.profile.email = "new.email@example.com".to_string();
        settings.profile.phone = Some("+1234567890".to_string());
        settings.profile.avatar_url = Some("data:image/png;base64,aGVsbG8=".to_string());
        settings.profile.notes = Some("Updated through test".to_string());

        settings_service
            .update_user_profile(&user.id, &settings.profile)
            .expect("failed to update profile");

        let reloaded = settings_service
            .get_user_settings(&user.id)
            .expect("failed to reload settings");
        assert_eq!(reloaded.profile.full_name, "Settings Tester");
        assert_eq!(reloaded.profile.email, "new.email@example.com");
        assert_eq!(reloaded.profile.phone.as_deref(), Some("+1234567890"));
        assert_eq!(
            reloaded.profile.avatar_url.as_deref(),
            Some("data:image/png;base64,aGVsbG8=")
        );
        assert_eq!(
            reloaded.profile.notes.as_deref(),
            Some("Updated through test")
        );
    }

    #[test]
    fn password_change_success_and_failure_paths() {
        let (test_db, settings_service, auth_service) = setup_services();
        let user = create_test_user(&auth_service);

        insert_session(&test_db, &user, "current-token");
        insert_session(&test_db, &user, "other-token");

        let failed = settings_service.change_user_password(
            &user.id,
            "WrongPass1!",
            "NextPass1!",
            "current-token",
            &auth_service,
        );
        assert!(failed.is_err());

        settings_service
            .change_user_password(
                &user.id,
                "CurrentPass1!",
                "NextPass1!",
                "current-token",
                &auth_service,
            )
            .expect("password change should succeed");

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");
        let hash: String = conn
            .query_row(
                "SELECT password_hash FROM users WHERE id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to get password hash");

        let old_valid = auth_service
            .verify_password("CurrentPass1!", &hash)
            .expect("failed to verify old password");
        let new_valid = auth_service
            .verify_password("NextPass1!", &hash)
            .expect("failed to verify new password");
        assert!(!old_valid);
        assert!(new_valid);

        let session_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sessions WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count sessions");
        let current_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sessions WHERE user_id = ? AND id = ?",
                params![user.id, "current-token"],
                |row| row.get(0),
            )
            .expect("failed to check current session");
        assert_eq!(session_count, 1);
        assert_eq!(current_exists, 1);
    }

    #[test]
    fn delete_account_soft_delete_and_purge() {
        let (test_db, settings_service, auth_service) = setup_services();
        let user = create_test_user(&auth_service);

        settings_service
            .get_user_settings(&user.id)
            .expect("failed to bootstrap settings");
        insert_session(&test_db, &user, "delete-token");

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");
        conn.execute(
            "INSERT INTO user_consent (user_id, consent_data, created_at, updated_at)
             VALUES (?, ?, ?, ?)",
            params![
                user.id,
                "{\"analytics_consent\":true}",
                Utc::now().timestamp_millis(),
                Utc::now().timestamp_millis(),
            ],
        )
        .expect("failed to insert consent");

        settings_service
            .delete_user_account(&user.id)
            .expect("failed to delete user account");

        let is_active: i64 = conn
            .query_row(
                "SELECT is_active FROM users WHERE id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to query user status");
        let deleted_at: i64 = conn
            .query_row(
                "SELECT deleted_at FROM users WHERE id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to query deleted_at");
        assert_eq!(is_active, 0);
        assert!(deleted_at > 0);

        let settings_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count settings rows");
        let consent_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM user_consent WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count consent rows");
        let session_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sessions WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count sessions");

        assert_eq!(settings_count, 0);
        assert_eq!(consent_count, 0);
        assert_eq!(session_count, 0);
    }
}
