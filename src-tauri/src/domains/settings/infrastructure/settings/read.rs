//! Read operations for user settings.

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::{
    UserAccessibilitySettings, UserNotificationSettings, UserPerformanceSettings, UserPreferences,
    UserProfileSettings, UserSecuritySettings, UserSettings,
};
use rusqlite::params;
use tracing::{error, info, warn};

impl super::SettingsService {
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
}
