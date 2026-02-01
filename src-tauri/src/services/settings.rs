//! Settings service for user settings management

use crate::commands::AppError;
use crate::models::settings::{
    UserAccessibilitySettings, UserNotificationSettings, UserPerformanceSettings, UserPreferences,
    UserProfileSettings, UserSecuritySettings, UserSettings,
};
use rusqlite::params;
use std::sync::Arc;
use tracing::{error, warn};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct SettingsService {
    db: Arc<crate::db::Database>,
}

impl SettingsService {
    pub fn new(db: Arc<crate::db::Database>) -> Self {
        Self { db }
    }

    /// Get user settings by user ID
    pub fn get_user_settings(&self, user_id: &str) -> Result<UserSettings, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // Try to get existing settings
        let result: Result<UserSettings, _> = conn.query_row(
            "SELECT
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
                self.create_user_settings(user_id, &default_settings)?;
                Ok(default_settings)
            }
            Err(e) => {
                error!("Failed to get user settings for {}: {}", user_id, e);
                Err(AppError::Database(
                    "Failed to get user settings".to_string(),
                ))
            }
        }
    }

    /// Create user settings record
    fn create_user_settings(&self, user_id: &str, settings: &UserSettings) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let id = Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO user_settings (
                id, user_id, full_name, email, phone, notes,
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id, user_id,
                settings.profile.full_name, settings.profile.email, settings.profile.phone, settings.profile.notes,
                settings.preferences.email_notifications as i32, settings.preferences.push_notifications as i32,
                settings.preferences.task_assignments as i32, settings.preferences.task_updates as i32,
                settings.preferences.system_alerts as i32, settings.preferences.weekly_reports as i32,
                settings.preferences.theme, settings.preferences.language, settings.preferences.date_format,
                settings.preferences.time_format, settings.preferences.high_contrast as i32,
                settings.preferences.large_text as i32, settings.preferences.reduce_motion as i32,
                settings.preferences.screen_reader as i32, settings.preferences.auto_refresh as i32,
                settings.preferences.refresh_interval,
                settings.security.two_factor_enabled as i32, settings.security.session_timeout,
                settings.performance.cache_enabled as i32, settings.performance.cache_size,
                settings.performance.offline_mode as i32, settings.performance.sync_on_startup as i32,
                settings.performance.background_sync as i32, settings.performance.image_compression as i32,
                settings.performance.preload_data as i32,
                settings.accessibility.high_contrast as i32, settings.accessibility.large_text as i32,
                settings.accessibility.reduce_motion as i32, settings.accessibility.screen_reader as i32,
                settings.accessibility.focus_indicators as i32, settings.accessibility.keyboard_navigation as i32,
                settings.accessibility.text_to_speech as i32, settings.accessibility.speech_rate,
                settings.accessibility.font_size, settings.accessibility.color_blind_mode,
                settings.notifications.email_enabled as i32, settings.notifications.push_enabled as i32,
                settings.notifications.in_app_enabled as i32, settings.notifications.task_assigned as i32,
                settings.notifications.task_updated as i32, settings.notifications.task_completed as i32,
                settings.notifications.task_overdue as i32, settings.notifications.system_alerts as i32,
                settings.notifications.maintenance as i32, settings.notifications.security_alerts as i32,
                settings.notifications.quiet_hours_enabled as i32, settings.notifications.quiet_hours_start,
                settings.notifications.quiet_hours_end, settings.notifications.digest_frequency,
                settings.notifications.batch_notifications as i32, settings.notifications.sound_enabled as i32,
                settings.notifications.sound_volume
            ],
        ).map_err(|e| {
            error!("Failed to create user settings for {}: {}", user_id, e);
            AppError::Database("Failed to create user settings".to_string())
        })?;

        Ok(())
    }

    /// Update user profile settings with transaction
    pub fn update_user_profile(
        &self,
        user_id: &str,
        profile: &UserProfileSettings,
    ) -> Result<(), AppError> {
        let mut conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // Start transaction
        let tx = conn.transaction().map_err(|e| {
            error!("Failed to start transaction for profile update: {}", e);
            AppError::Database("Failed to start transaction".to_string())
        })?;

        // First ensure user settings exist
        self.ensure_user_settings_exist_with_tx(&tx, user_id)?;

        // Update profile settings
        tx.execute(
            "UPDATE user_settings SET
                full_name = ?, email = ?, phone = ?, avatar_url = ?, notes = ?, updated_at = ?
             WHERE user_id = ?",
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

        // Log the change for audit purposes (don't fail if logging fails)
        let _ = self.log_settings_change(
            &tx,
            user_id,
            "profile",
            &format!("Updated profile: {:?}", profile),
        );

        // Commit transaction
        tx.commit().map_err(|e| {
            error!(
                "Failed to commit profile update transaction for {}: {}",
                user_id, e
            );
            AppError::Database("Failed to commit transaction".to_string())
        })?;

        Ok(())
    }

    /// Update user preferences with transaction
    pub fn update_user_preferences(
        &self,
        user_id: &str,
        preferences: &UserPreferences,
    ) -> Result<(), AppError> {
        let mut conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // Start transaction
        let tx = conn.transaction().map_err(|e| {
            error!("Failed to start transaction for preferences update: {}", e);
            AppError::Database("Failed to start transaction".to_string())
        })?;

        // First ensure user settings exist
        self.ensure_user_settings_exist_with_tx(&tx, user_id)?;

        // Update preferences settings
        tx.execute(
            "UPDATE user_settings SET
                email_notifications = ?, push_notifications = ?, task_assignments = ?, task_updates = ?,
                system_alerts = ?, weekly_reports = ?, theme = ?, language = ?, date_format = ?,
                time_format = ?, high_contrast = ?, large_text = ?, reduce_motion = ?, screen_reader = ?,
                auto_refresh = ?, refresh_interval = ?, updated_at = ?
             WHERE user_id = ?",
            params![
                preferences.email_notifications as i32, preferences.push_notifications as i32,
                preferences.task_assignments as i32, preferences.task_updates as i32,
                preferences.system_alerts as i32, preferences.weekly_reports as i32,
                preferences.theme, preferences.language, preferences.date_format, preferences.time_format,
                preferences.high_contrast as i32, preferences.large_text as i32,
                preferences.reduce_motion as i32, preferences.screen_reader as i32,
                preferences.auto_refresh as i32, preferences.refresh_interval,
                chrono::Utc::now().timestamp_millis(), user_id
            ],
        ).map_err(|e| {
            error!("Failed to update user preferences for {}: {}", user_id, e);
            AppError::Database("Failed to update user preferences".to_string())
        })?;

        // Log the change for audit purposes (don't fail if logging fails)
        let _ = self.log_settings_change(
            &tx,
            user_id,
            "preferences",
            &format!("Updated preferences: {:?}", preferences),
        );

        // Commit transaction
        tx.commit().map_err(|e| {
            error!(
                "Failed to commit preferences update transaction for {}: {}",
                user_id, e
            );
            AppError::Database("Failed to commit transaction".to_string())
        })?;

        Ok(())
    }

    /// Update user security settings
    pub fn update_user_security(
        &self,
        user_id: &str,
        security: &UserSecuritySettings,
    ) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // First ensure user settings exist
        self.ensure_user_settings_exist(user_id)?;

        conn.execute(
            "UPDATE user_settings SET
                two_factor_enabled = ?, session_timeout = ?, updated_at = ?
             WHERE user_id = ?",
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

        Ok(())
    }

    /// Update user performance settings
    pub fn update_user_performance(
        &self,
        user_id: &str,
        performance: &UserPerformanceSettings,
    ) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // First ensure user settings exist
        self.ensure_user_settings_exist(user_id)?;

        conn.execute(
            "UPDATE user_settings SET
                cache_enabled = ?, cache_size = ?, offline_mode = ?, sync_on_startup = ?,
                background_sync = ?, image_compression = ?, preload_data = ?, updated_at = ?
             WHERE user_id = ?",
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

        Ok(())
    }

    /// Update user accessibility settings
    pub fn update_user_accessibility(
        &self,
        user_id: &str,
        accessibility: &UserAccessibilitySettings,
    ) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // First ensure user settings exist
        self.ensure_user_settings_exist(user_id)?;

        conn.execute(
            "UPDATE user_settings SET
                accessibility_high_contrast = ?, accessibility_large_text = ?, accessibility_reduce_motion = ?,
                accessibility_screen_reader = ?, accessibility_focus_indicators = ?, accessibility_keyboard_navigation = ?,
                accessibility_text_to_speech = ?, accessibility_speech_rate = ?, accessibility_font_size = ?,
                accessibility_color_blind_mode = ?, updated_at = ?
             WHERE user_id = ?",
            params![
                accessibility.high_contrast as i32, accessibility.large_text as i32, accessibility.reduce_motion as i32,
                accessibility.screen_reader as i32, accessibility.focus_indicators as i32,
                accessibility.keyboard_navigation as i32, accessibility.text_to_speech as i32,
                accessibility.speech_rate, accessibility.font_size, accessibility.color_blind_mode,
                chrono::Utc::now().timestamp_millis(), user_id
            ],
        ).map_err(|e| {
            error!("Failed to update user accessibility settings for {}: {}", user_id, e);
            AppError::Database("Failed to update user accessibility settings".to_string())
        })?;

        Ok(())
    }

    /// Update user notification settings
    pub fn update_user_notifications(
        &self,
        user_id: &str,
        notifications: &UserNotificationSettings,
    ) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        // First ensure user settings exist
        self.ensure_user_settings_exist(user_id)?;

        conn.execute(
            "UPDATE user_settings SET
                notifications_email_enabled = ?, notifications_push_enabled = ?, notifications_in_app_enabled = ?,
                notifications_task_assigned = ?, notifications_task_updated = ?, notifications_task_completed = ?,
                notifications_task_overdue = ?, notifications_system_alerts = ?, notifications_maintenance = ?,
                notifications_security_alerts = ?, notifications_quiet_hours_enabled = ?,
                notifications_quiet_hours_start = ?, notifications_quiet_hours_end = ?,
                notifications_digest_frequency = ?, notifications_batch_notifications = ?,
                notifications_sound_enabled = ?, notifications_sound_volume = ?, updated_at = ?
             WHERE user_id = ?",
            params![
                notifications.email_enabled as i32, notifications.push_enabled as i32,
                notifications.in_app_enabled as i32, notifications.task_assigned as i32,
                notifications.task_updated as i32, notifications.task_completed as i32,
                notifications.task_overdue as i32, notifications.system_alerts as i32,
                notifications.maintenance as i32, notifications.security_alerts as i32,
                notifications.quiet_hours_enabled as i32, notifications.quiet_hours_start,
                notifications.quiet_hours_end, notifications.digest_frequency,
                notifications.batch_notifications as i32, notifications.sound_enabled as i32,
                notifications.sound_volume, chrono::Utc::now().timestamp_millis(), user_id
            ],
        ).map_err(|e| {
            error!("Failed to update user notification settings for {}: {}", user_id, e);
            AppError::Database("Failed to update user notification settings".to_string())
        })?;

        Ok(())
    }

    /// Change user password (placeholder - actual implementation would hash and verify)
    pub fn change_user_password(
        &self,
        _user_id: &str,
        _new_password_hash: &str,
    ) -> Result<(), AppError> {
        // This is a placeholder - actual password change would involve:
        // 1. Verifying current password
        // 2. Hashing new password
        // 3. Updating user record
        // 4. Invalidating sessions
        // 5. Audit logging

        Ok(())
    }

    /// Delete user settings (for GDPR compliance)
    pub fn delete_user_settings(&self, user_id: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

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

        tx.execute(
            "INSERT INTO user_settings (
                id, user_id, full_name, email, phone, notes,
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id, user_id,
                settings.profile.full_name, settings.profile.email, settings.profile.phone, settings.profile.notes,
                settings.preferences.email_notifications as i32, settings.preferences.push_notifications as i32,
                settings.preferences.task_assignments as i32, settings.preferences.task_updates as i32,
                settings.preferences.system_alerts as i32, settings.preferences.weekly_reports as i32,
                settings.preferences.theme, settings.preferences.language, settings.preferences.date_format,
                settings.preferences.time_format, settings.preferences.high_contrast as i32,
                settings.preferences.large_text as i32, settings.preferences.reduce_motion as i32,
                settings.preferences.screen_reader as i32, settings.preferences.auto_refresh as i32,
                settings.preferences.refresh_interval,
                settings.security.two_factor_enabled as i32, settings.security.session_timeout,
                settings.performance.cache_enabled as i32, settings.performance.cache_size,
                settings.performance.offline_mode as i32, settings.performance.sync_on_startup as i32,
                settings.performance.background_sync as i32, settings.performance.image_compression as i32,
                settings.performance.preload_data as i32,
                settings.accessibility.high_contrast as i32, settings.accessibility.large_text as i32,
                settings.accessibility.reduce_motion as i32, settings.accessibility.screen_reader as i32,
                settings.accessibility.focus_indicators as i32, settings.accessibility.keyboard_navigation as i32,
                settings.accessibility.text_to_speech as i32, settings.accessibility.speech_rate,
                settings.accessibility.font_size, settings.accessibility.color_blind_mode,
                settings.notifications.email_enabled as i32, settings.notifications.push_enabled as i32,
                settings.notifications.in_app_enabled as i32, settings.notifications.task_assigned as i32,
                settings.notifications.task_updated as i32, settings.notifications.task_completed as i32,
                settings.notifications.task_overdue as i32, settings.notifications.system_alerts as i32,
                settings.notifications.maintenance as i32, settings.notifications.security_alerts as i32,
                settings.notifications.quiet_hours_enabled as i32, settings.notifications.quiet_hours_start,
                settings.notifications.quiet_hours_end, settings.notifications.digest_frequency,
                settings.notifications.batch_notifications as i32, settings.notifications.sound_enabled as i32,
                settings.notifications.sound_volume
            ],
        ).map_err(|e| {
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
}
