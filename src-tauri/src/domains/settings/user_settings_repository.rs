//! Repository for user-specific settings.

/// ADR-005: Repository Pattern
use std::sync::Arc;
use rusqlite::params;
use tracing::{error, info, warn};

use crate::commands::AppError;
use crate::db::Database;
use super::models::*;

pub struct UserSettingsRepository {
    db: Arc<Database>,
}

impl UserSettingsRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get user settings by user ID
    pub fn get_user_settings(&self, user_id: &str) -> Result<UserSettings, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection for user {}: {}", user_id, e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // Try to get existing settings
        let result: Result<UserSettings, _> = conn.query_row(
            "SELECT 
                full_name, email, phone, avatar_url, notes,
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
             FROM user_settings WHERE user_id = ?",
            params![user_id],
            |row| {
                Ok(UserSettings {
                    profile: UserProfileSettings {
                        full_name: row.get(0)?,
                        email: row.get(1)?,
                        phone: row.get(2)?,
                        avatar_url: row.get(3)?,
                        notes: row.get(4)?,
                    },
                    preferences: UserPreferences {
                        email_notifications: row.get::<_, i32>(5)? != 0,
                        push_notifications: row.get::<_, i32>(6)? != 0,
                        task_assignments: row.get::<_, i32>(7)? != 0,
                        task_updates: row.get::<_, i32>(8)? != 0,
                        system_alerts: row.get::<_, i32>(9)? != 0,
                        weekly_reports: row.get::<_, i32>(10)? != 0,
                        theme: row.get(11)?,
                        language: row.get(12)?,
                        date_format: row.get(13)?,
                        time_format: row.get(14)?,
                        high_contrast: row.get::<_, i32>(15)? != 0,
                        large_text: row.get::<_, i32>(16)? != 0,
                        reduce_motion: row.get::<_, i32>(17)? != 0,
                        screen_reader: row.get::<_, i32>(18)? != 0,
                        auto_refresh: row.get::<_, i32>(19)? != 0,
                        refresh_interval: row.get::<_, u32>(20)?,
                    },
                    security: UserSecuritySettings {
                        two_factor_enabled: row.get::<_, i32>(21)? != 0,
                        session_timeout: row.get::<_, u32>(22)?,
                    },
                    performance: UserPerformanceSettings {
                        cache_enabled: row.get::<_, i32>(23)? != 0,
                        cache_size: row.get::<_, u32>(24)?,
                        offline_mode: row.get::<_, i32>(25)? != 0,
                        sync_on_startup: row.get::<_, i32>(26)? != 0,
                        background_sync: row.get::<_, i32>(27)? != 0,
                        image_compression: row.get::<_, i32>(28)? != 0,
                        preload_data: row.get::<_, i32>(29)? != 0,
                    },
                    accessibility: UserAccessibilitySettings {
                        high_contrast: row.get::<_, i32>(30)? != 0,
                        large_text: row.get::<_, i32>(31)? != 0,
                        reduce_motion: row.get::<_, i32>(32)? != 0,
                        screen_reader: row.get::<_, i32>(33)? != 0,
                        focus_indicators: row.get::<_, i32>(34)? != 0,
                        keyboard_navigation: row.get::<_, i32>(35)? != 0,
                        text_to_speech: row.get::<_, i32>(36)? != 0,
                        speech_rate: row.get::<_, f32>(37)?,
                        font_size: row.get::<_, u32>(38)?,
                        color_blind_mode: row.get(39)?,
                    },
                    notifications: UserNotificationSettings {
                        email_enabled: row.get::<_, i32>(40)? != 0,
                        push_enabled: row.get::<_, i32>(41)? != 0,
                        in_app_enabled: row.get::<_, i32>(42)? != 0,
                        task_assigned: row.get::<_, i32>(43)? != 0,
                        task_updated: row.get::<_, i32>(44)? != 0,
                        task_completed: row.get::<_, i32>(45)? != 0,
                        task_overdue: row.get::<_, i32>(46)? != 0,
                        system_alerts: row.get::<_, i32>(47)? != 0,
                        maintenance: row.get::<_, i32>(48)? != 0,
                        security_alerts: row.get::<_, i32>(49)? != 0,
                        quiet_hours_enabled: row.get::<_, i32>(50)? != 0,
                        quiet_hours_start: row.get(51)?,
                        quiet_hours_end: row.get(52)?,
                        digest_frequency: row.get(53)?,
                        batch_notifications: row.get::<_, i32>(54)? != 0,
                        sound_enabled: row.get::<_, i32>(55)? != 0,
                        sound_volume: row.get::<_, u32>(56)?,
                    },
                })
            },
        );

        match result {
            Ok(settings) => Ok(settings),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                info!("No settings found for user {}, creating defaults", user_id);
                let default_settings = UserSettings::default();
                self.save_user_settings(user_id, &default_settings)?;
                Ok(default_settings)
            }
            Err(e) => {
                error!("Database error fetching user settings for {}: {}", user_id, e);
                Err(AppError::Database("Failed to fetch user settings".to_string()))
            }
        }
    }

    pub fn save_user_settings(&self, user_id: &str, settings: &UserSettings) -> Result<(), AppError> {
        self.db.execute(
            "INSERT OR REPLACE INTO user_settings (
                user_id, full_name, email, phone, avatar_url, notes,
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
                notifications_sound_enabled, notifications_sound_volume,
                updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6,
                ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
                ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24,
                ?25, ?26, ?27, ?28, ?29, ?30, ?31,
                ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40, ?41,
                ?42, ?43, ?44, ?45, ?46, ?47, ?48, ?49, ?50, ?51,
                ?52, ?53, ?54, ?55, ?56, ?57, ?58,
                ?59
            )",
            params![
                user_id, settings.profile.full_name, settings.profile.email, settings.profile.phone, settings.profile.avatar_url, settings.profile.notes,
                settings.preferences.email_notifications as i32, settings.preferences.push_notifications as i32, settings.preferences.task_assignments as i32, settings.preferences.task_updates as i32,
                settings.preferences.system_alerts as i32, settings.preferences.weekly_reports as i32, settings.preferences.theme, settings.preferences.language, settings.preferences.date_format, settings.preferences.time_format,
                settings.preferences.high_contrast as i32, settings.preferences.large_text as i32, settings.preferences.reduce_motion as i32, settings.preferences.screen_reader as i32, settings.preferences.auto_refresh as i32, settings.preferences.refresh_interval,
                settings.security.two_factor_enabled as i32, settings.security.session_timeout,
                settings.performance.cache_enabled as i32, settings.performance.cache_size, settings.performance.offline_mode as i32, settings.performance.sync_on_startup as i32, settings.performance.background_sync as i32,
                settings.performance.image_compression as i32, settings.performance.preload_data as i32,
                settings.accessibility.high_contrast as i32, settings.accessibility.large_text as i32, settings.accessibility.reduce_motion as i32,
                settings.accessibility.screen_reader as i32, settings.accessibility.focus_indicators as i32, settings.accessibility.keyboard_navigation as i32,
                settings.accessibility.text_to_speech as i32, settings.accessibility.speech_rate, settings.accessibility.font_size,
                settings.accessibility.color_blind_mode,
                settings.notifications.email_enabled as i32, settings.notifications.push_enabled as i32, settings.notifications.in_app_enabled as i32,
                settings.notifications.task_assigned as i32, settings.notifications.task_updated as i32, settings.notifications.task_completed as i32,
                settings.notifications.task_overdue as i32, settings.notifications.system_alerts as i32, settings.notifications.maintenance as i32,
                settings.notifications.security_alerts as i32, settings.notifications.quiet_hours_enabled as i32,
                settings.notifications.quiet_hours_start, settings.notifications.quiet_hours_end,
                settings.notifications.digest_frequency, settings.notifications.batch_notifications as i32,
                settings.notifications.sound_enabled as i32, settings.notifications.sound_volume,
                chrono::Utc::now().timestamp_millis()
            ],
        ).map_err(|e| {
            error!("Failed to save user settings for {}: {}", user_id, e);
            AppError::Database("Failed to save user settings".to_string())
        })?;

        Ok(())
    }

    pub fn get_data_consent(&self, user_id: &str) -> Result<Option<DataConsent>, AppError> {
        let conn = self.db.get_connection().map_err(|_| AppError::Database("Connection failed".to_string()))?;
        let result = conn.query_row(
            "SELECT analytics_consent, marketing_consent, third_party_sharing, data_retention_period, consent_given_at, consent_version 
             FROM user_consent WHERE user_id = ?",
            params![user_id],
            |row| {
                let given_at_str: String = row.get(4)?;
                let given_at = chrono::DateTime::parse_from_rfc3339(&given_at_str)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now());

                Ok(DataConsent {
                    user_id: user_id.to_string(),
                    analytics_consent: row.get::<_, i32>(0)? != 0,
                    marketing_consent: row.get::<_, i32>(1)? != 0,
                    third_party_sharing: row.get::<_, i32>(2)? != 0,
                    data_retention_period: row.get(3)?,
                    consent_given_at: given_at,
                    consent_version: row.get(5)?,
                })
            },
        );

        match result {
            Ok(consent) => Ok(Some(consent)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Database(format!("Consent query failed: {}", e))),
        }
    }
}
