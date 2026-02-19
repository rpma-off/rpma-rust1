//! Property-based tests for User Settings Service
//!
//! Uses proptest to test settings validation and persistence with random inputs

use crate::db::Database;
use crate::models::settings::*;
use crate::services::settings::SettingsService;
use proptest::prelude::*;
use rusqlite::params;
use uuid::Uuid;

// Helper to create a test database with settings tables
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Create user and settings tables
    db.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            role TEXT DEFAULT 'user',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            deleted_at INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS user_settings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            
            -- Profile settings
            full_name TEXT,
            email TEXT,
            phone TEXT,
            avatar_url TEXT,
            notes TEXT,
            
            -- Preference settings
            email_notifications INTEGER NOT NULL DEFAULT 1,
            push_notifications INTEGER NOT NULL DEFAULT 1,
            task_assignments INTEGER NOT NULL DEFAULT 1,
            task_updates INTEGER NOT NULL DEFAULT 1,
            system_alerts INTEGER NOT NULL DEFAULT 1,
            weekly_reports INTEGER NOT NULL DEFAULT 0,
            theme TEXT NOT NULL DEFAULT 'system',
            language TEXT NOT NULL DEFAULT 'fr',
            date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
            time_format TEXT NOT NULL DEFAULT '24h',
            high_contrast INTEGER NOT NULL DEFAULT 0,
            large_text INTEGER NOT NULL DEFAULT 0,
            reduce_motion INTEGER NOT NULL DEFAULT 0,
            screen_reader INTEGER NOT NULL DEFAULT 0,
            auto_refresh INTEGER NOT NULL DEFAULT 1,
            refresh_interval INTEGER NOT NULL DEFAULT 60,
            
            -- Security settings
            two_factor_enabled INTEGER NOT NULL DEFAULT 0,
            session_timeout INTEGER NOT NULL DEFAULT 480,
            
            -- Performance settings
            cache_enabled INTEGER NOT NULL DEFAULT 1,
            cache_size INTEGER NOT NULL DEFAULT 100,
            offline_mode INTEGER NOT NULL DEFAULT 0,
            sync_on_startup INTEGER NOT NULL DEFAULT 1,
            background_sync INTEGER NOT NULL DEFAULT 1,
            image_compression INTEGER NOT NULL DEFAULT 1,
            preload_data INTEGER NOT NULL DEFAULT 0,
            
            -- Accessibility settings
            accessibility_high_contrast INTEGER NOT NULL DEFAULT 0,
            accessibility_large_text INTEGER NOT NULL DEFAULT 0,
            accessibility_reduce_motion INTEGER NOT NULL DEFAULT 0,
            accessibility_screen_reader INTEGER NOT NULL DEFAULT 0,
            accessibility_focus_indicators INTEGER NOT NULL DEFAULT 1,
            accessibility_keyboard_navigation INTEGER NOT NULL DEFAULT 1,
            accessibility_text_to_speech INTEGER NOT NULL DEFAULT 0,
            accessibility_speech_rate REAL NOT NULL DEFAULT 1.0,
            accessibility_font_size INTEGER NOT NULL DEFAULT 16,
            accessibility_color_blind_mode TEXT NOT NULL DEFAULT 'none',
            
            -- Notification settings
            notifications_email_enabled INTEGER NOT NULL DEFAULT 1,
            notifications_push_enabled INTEGER NOT NULL DEFAULT 1,
            notifications_in_app_enabled INTEGER NOT NULL DEFAULT 1,
            notifications_task_assigned INTEGER NOT NULL DEFAULT 1,
            notifications_task_updated INTEGER NOT NULL DEFAULT 1,
            notifications_task_completed INTEGER NOT NULL DEFAULT 0,
            notifications_task_overdue INTEGER NOT NULL DEFAULT 1,
            notifications_system_alerts INTEGER NOT NULL DEFAULT 1,
            notifications_maintenance INTEGER NOT NULL DEFAULT 0,
            notifications_security_alerts INTEGER NOT NULL DEFAULT 1,
            notifications_quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
            notifications_quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
            notifications_quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
            notifications_digest_frequency TEXT NOT NULL DEFAULT 'never',
            notifications_batch_notifications INTEGER NOT NULL DEFAULT 0,
            notifications_sound_enabled INTEGER NOT NULL DEFAULT 1,
            notifications_sound_volume INTEGER NOT NULL DEFAULT 70,
            
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    "#,
    )
    .unwrap();

    db
}

// Helper to create a test user
fn create_test_user(db: &Database, user_id: &str, email: &str) {
    db.execute(r#"
        INSERT INTO users (id, email, username, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        user_id,
        email,
        email.split('@').next().unwrap_or("user"),
        "hashed_password",
        "user",
        1,
        chrono::Utc::now().timestamp_millis(),
        chrono::Utc::now().timestamp_millis()
    ]).unwrap();
}

// Strategy for generating valid themes
fn theme_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("system".to_string()),
        Just("light".to_string()),
        Just("dark".to_string()),
    ]
}

// Strategy for generating valid languages
fn language_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("fr".to_string()),
        Just("en".to_string()),
        Just("es".to_string()),
        Just("de".to_string()),
    ]
}

// Strategy for generating valid date formats
fn date_format_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("DD/MM/YYYY".to_string()),
        Just("MM/DD/YYYY".to_string()),
        Just("YYYY-MM-DD".to_string()),
    ]
}

// Strategy for generating valid time formats
fn time_format_strategy() -> impl Strategy<Value = String> {
    prop_oneof![Just("24h".to_string()), Just("12h".to_string()),]
}

// Strategy for generating valid digest frequencies
fn digest_frequency_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("never".to_string()),
        Just("daily".to_string()),
        Just("weekly".to_string()),
        Just("monthly".to_string()),
    ]
}

// Strategy for generating valid color blind modes
fn color_blind_mode_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("none".to_string()),
        Just("protanopia".to_string()),
        Just("deuteranopia".to_string()),
        Just("tritanopia".to_string()),
    ]
}

// Strategy for generating valid refresh intervals (1-1440 minutes)
fn refresh_interval_strategy() -> impl Strategy<Value = u32> {
    1u32..=1440u32
}

// Strategy for generating valid session timeouts (60-1440 minutes)
fn session_timeout_strategy() -> impl Strategy<Value = u32> {
    60u32..=1440u32
}

// Strategy for generating valid cache sizes (1-1000 MB)
fn cache_size_strategy() -> impl Strategy<Value = u32> {
    1u32..=1000u32
}

// Strategy for generating valid font sizes (8-32)
fn font_size_strategy() -> impl Strategy<Value = u32> {
    8u32..=32u32
}

// Strategy for generating valid speech rates (0.5-3.0)
fn speech_rate_strategy() -> impl Strategy<Value = f32> {
    0.5f32..=3.0f32
}

// Strategy for generating valid sound volumes (0-100)
fn sound_volume_strategy() -> impl Strategy<Value = u32> {
    0u32..=100u32
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn test_user_preferences_with_random_valid_values(
        email_notifications in prop::bool::ANY,
        push_notifications in prop::bool::ANY,
        task_assignments in prop::bool::ANY,
        task_updates in prop::bool::ANY,
        system_alerts in prop::bool::ANY,
        weekly_reports in prop::bool::ANY,
        theme in theme_strategy(),
        language in language_strategy(),
        date_format in date_format_strategy(),
        time_format in time_format_strategy(),
        high_contrast in prop::bool::ANY,
        large_text in prop::bool::ANY,
        reduce_motion in prop::bool::ANY,
        screen_reader in prop::bool::ANY,
        auto_refresh in prop::bool::ANY,
        refresh_interval in refresh_interval_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = SettingsService::new(db);

            // Create a test user
            let user_id = Uuid::new_v4().to_string();
            let email = format!("{}@example.com", user_id);
            create_test_user(&service.db, &user_id, &email);

            // Create preferences with random valid values
            let preferences = UserPreferences {
                email_notifications,
                push_notifications,
                task_assignments,
                task_updates,
                system_alerts,
                weekly_reports,
                theme: theme.clone(),
                language: language.clone(),
                date_format: date_format.clone(),
                time_format: time_format.clone(),
                high_contrast,
                large_text,
                reduce_motion,
                screen_reader,
                auto_refresh,
                refresh_interval,
            };

            // Update preferences
            let result = service.update_user_preferences(&user_id, &preferences);
            prop_assert!(result.is_ok(), "Should successfully update preferences with valid values");

            // Verify the values were persisted correctly
            let retrieved_settings = service.get_user_settings(&user_id).unwrap();
            let retrieved = &retrieved_settings.preferences;

            prop_assert_eq!(retrieved.email_notifications, email_notifications);
            prop_assert_eq!(retrieved.push_notifications, push_notifications);
            prop_assert_eq!(retrieved.task_assignments, task_assignments);
            prop_assert_eq!(retrieved.task_updates, task_updates);
            prop_assert_eq!(retrieved.system_alerts, system_alerts);
            prop_assert_eq!(retrieved.weekly_reports, weekly_reports);
            prop_assert_eq!(retrieved.theme, theme);
            prop_assert_eq!(retrieved.language, language);
            prop_assert_eq!(retrieved.date_format, date_format);
            prop_assert_eq!(retrieved.time_format, time_format);
            prop_assert_eq!(retrieved.high_contrast, high_contrast);
            prop_assert_eq!(retrieved.large_text, large_text);
            prop_assert_eq!(retrieved.reduce_motion, reduce_motion);
            prop_assert_eq!(retrieved.screen_reader, screen_reader);
            prop_assert_eq!(retrieved.auto_refresh, auto_refresh);
            prop_assert_eq!(retrieved.refresh_interval, refresh_interval);
        });
    }

    #[test]
    fn test_user_security_with_random_valid_values(
        two_factor_enabled in prop::bool::ANY,
        session_timeout in session_timeout_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = SettingsService::new(db);

            // Create a test user
            let user_id = Uuid::new_v4().to_string();
            let email = format!("{}@example.com", user_id);
            create_test_user(&service.db, &user_id, &email);

            // Create security settings with random valid values
            let security = UserSecuritySettings {
                two_factor_enabled,
                session_timeout,
            };

            // Update security settings
            let result = service.update_user_security(&user_id, &security);
            prop_assert!(result.is_ok(), "Should successfully update security settings with valid values");

            // Verify the values were persisted correctly
            let retrieved_settings = service.get_user_settings(&user_id).unwrap();
            let retrieved = &retrieved_settings.security;

            prop_assert_eq!(retrieved.two_factor_enabled, two_factor_enabled);
            prop_assert_eq!(retrieved.session_timeout, session_timeout);
        });
    }

    #[test]
    fn test_user_performance_with_random_valid_values(
        cache_enabled in prop::bool::ANY,
        cache_size in cache_size_strategy(),
        offline_mode in prop::bool::ANY,
        sync_on_startup in prop::bool::ANY,
        background_sync in prop::bool::ANY,
        image_compression in prop::bool::ANY,
        preload_data in prop::bool::ANY
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = SettingsService::new(db);

            // Create a test user
            let user_id = Uuid::new_v4().to_string();
            let email = format!("{}@example.com", user_id);
            create_test_user(&service.db, &user_id, &email);

            // Create performance settings with random valid values
            let performance = UserPerformanceSettings {
                cache_enabled,
                cache_size,
                offline_mode,
                sync_on_startup,
                background_sync,
                image_compression,
                preload_data,
            };

            // Update performance settings
            let result = service.update_user_performance(&user_id, &performance);
            prop_assert!(result.is_ok(), "Should successfully update performance settings with valid values");

            // Verify the values were persisted correctly
            let retrieved_settings = service.get_user_settings(&user_id).unwrap();
            let retrieved = &retrieved_settings.performance;

            prop_assert_eq!(retrieved.cache_enabled, cache_enabled);
            prop_assert_eq!(retrieved.cache_size, cache_size);
            prop_assert_eq!(retrieved.offline_mode, offline_mode);
            prop_assert_eq!(retrieved.sync_on_startup, sync_on_startup);
            prop_assert_eq!(retrieved.background_sync, background_sync);
            prop_assert_eq!(retrieved.image_compression, image_compression);
            prop_assert_eq!(retrieved.preload_data, preload_data);
        });
    }

    #[test]
    fn test_user_accessibility_with_random_valid_values(
        high_contrast in prop::bool::ANY,
        large_text in prop::bool::ANY,
        reduce_motion in prop::bool::ANY,
        screen_reader in prop::bool::ANY,
        focus_indicators in prop::bool::ANY,
        keyboard_navigation in prop::bool::ANY,
        text_to_speech in prop::bool::ANY,
        speech_rate in speech_rate_strategy(),
        font_size in font_size_strategy(),
        color_blind_mode in color_blind_mode_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = SettingsService::new(db);

            // Create a test user
            let user_id = Uuid::new_v4().to_string();
            let email = format!("{}@example.com", user_id);
            create_test_user(&service.db, &user_id, &email);

            // Create accessibility settings with random valid values
            let accessibility = UserAccessibilitySettings {
                high_contrast,
                large_text,
                reduce_motion,
                screen_reader,
                focus_indicators,
                keyboard_navigation,
                text_to_speech,
                speech_rate,
                font_size,
                color_blind_mode: color_blind_mode.clone(),
            };

            // Update accessibility settings
            let result = service.update_user_accessibility(&user_id, &accessibility);
            prop_assert!(result.is_ok(), "Should successfully update accessibility settings with valid values");

            // Verify the values were persisted correctly
            let retrieved_settings = service.get_user_settings(&user_id).unwrap();
            let retrieved = &retrieved_settings.accessibility;

            prop_assert_eq!(retrieved.high_contrast, high_contrast);
            prop_assert_eq!(retrieved.large_text, large_text);
            prop_assert_eq!(retrieved.reduce_motion, reduce_motion);
            prop_assert_eq!(retrieved.screen_reader, screen_reader);
            prop_assert_eq!(retrieved.focus_indicators, focus_indicators);
            prop_assert_eq!(retrieved.keyboard_navigation, keyboard_navigation);
            prop_assert_eq!(retrieved.text_to_speech, text_to_speech);
            prop_assert!((retrieved.speech_rate - speech_rate).abs() < 0.01);
            prop_assert_eq!(retrieved.font_size, font_size);
            prop_assert_eq!(retrieved.color_blind_mode, color_blind_mode);
        });
    }

    #[test]
    fn test_user_notifications_with_random_valid_values(
        email_enabled in prop::bool::ANY,
        push_enabled in prop::bool::ANY,
        in_app_enabled in prop::bool::ANY,
        task_assigned in prop::bool::ANY,
        task_updated in prop::bool::ANY,
        task_completed in prop::bool::ANY,
        task_overdue in prop::bool::ANY,
        system_alerts in prop::bool::ANY,
        maintenance in prop::bool::ANY,
        security_alerts in prop::bool::ANY,
        quiet_hours_enabled in prop::bool::ANY,
        digest_frequency in digest_frequency_strategy(),
        batch_notifications in prop::bool::ANY,
        sound_enabled in prop::bool::ANY,
        sound_volume in sound_volume_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = SettingsService::new(db);

            // Create a test user
            let user_id = Uuid::new_v4().to_string();
            let email = format!("{}@example.com", user_id);
            create_test_user(&service.db, &user_id, &email);

            // Create notification settings with random valid values
            let notifications = UserNotificationSettings {
                email_enabled,
                push_enabled,
                in_app_enabled,
                task_assigned,
                task_updated,
                task_completed,
                task_overdue,
                system_alerts,
                maintenance,
                security_alerts,
                quiet_hours_enabled,
                quiet_hours_start: "21:00".to_string(),
                quiet_hours_end: "09:00".to_string(),
                digest_frequency: digest_frequency.clone(),
                batch_notifications,
                sound_enabled,
                sound_volume,
            };

            // Update notification settings
            let result = service.update_user_notifications(&user_id, &notifications);
            prop_assert!(result.is_ok(), "Should successfully update notification settings with valid values");

            // Verify the values were persisted correctly
            let retrieved_settings = service.get_user_settings(&user_id).unwrap();
            let retrieved = &retrieved_settings.notifications;

            prop_assert_eq!(retrieved.email_enabled, email_enabled);
            prop_assert_eq!(retrieved.push_enabled, push_enabled);
            prop_assert_eq!(retrieved.in_app_enabled, in_app_enabled);
            prop_assert_eq!(retrieved.task_assigned, task_assigned);
            prop_assert_eq!(retrieved.task_updated, task_updated);
            prop_assert_eq!(retrieved.task_completed, task_completed);
            prop_assert_eq!(retrieved.task_overdue, task_overdue);
            prop_assert_eq!(retrieved.system_alerts, system_alerts);
            prop_assert_eq!(retrieved.maintenance, maintenance);
            prop_assert_eq!(retrieved.security_alerts, security_alerts);
            prop_assert_eq!(retrieved.quiet_hours_enabled, quiet_hours_enabled);
            prop_assert_eq!(retrieved.quiet_hours_start, "21:00");
            prop_assert_eq!(retrieved.quiet_hours_end, "09:00");
            prop_assert_eq!(retrieved.digest_frequency, digest_frequency);
            prop_assert_eq!(retrieved.batch_notifications, batch_notifications);
            prop_assert_eq!(retrieved.sound_enabled, sound_enabled);
            prop_assert_eq!(retrieved.sound_volume, sound_volume);
        });
    }

    #[test]
    fn test_user_profile_with_random_valid_strings(
        full_name in "[a-zA-Z]{1,50}",
        email_prefix in "[a-zA-Z0-9]{1,20}",
        phone in "[0-9\\-+ ]{0,20}",
        notes in "[\\w\\s]{0,500}"
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = SettingsService::new(db);

            // Create a test user
            let user_id = Uuid::new_v4().to_string();
            let email = format!("{}@example.com", user_id);
            create_test_user(&service.db, &user_id, &email);

            // Create profile with random valid strings
            let profile = UserProfileSettings {
                full_name: full_name.clone(),
                email: format!("{}@example.com", email_prefix),
                phone: if phone.is_empty() { None } else { Some(phone.clone()) },
                avatar_url: None,
                notes: if notes.is_empty() { None } else { Some(notes.clone()) },
            };

            // Update profile
            let result = service.update_user_profile(&user_id, &profile);
            prop_assert!(result.is_ok(), "Should successfully update profile with valid strings");

            // Verify the values were persisted correctly
            let retrieved_settings = service.get_user_settings(&user_id).unwrap();
            let retrieved = &retrieved_settings.profile;

            prop_assert_eq!(retrieved.full_name, full_name);
            prop_assert!(retrieved.email.starts_with(&email_prefix));
            prop_assert_eq!(retrieved.phone, if phone.is_empty() { None } else { Some(phone) });
            prop_assert_eq!(retrieved.notes, if notes.is_empty() { None } else { Some(notes) });
        });
    }

    #[test]
    fn test_max_tasks_per_user_boundary_values(
        max_tasks in prop::num::i32::ANY
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = SettingsService::new(db);

            // Test with boundary values including negative and very large values
            let result = service.set_max_tasks_per_user(max_tasks);

            // The implementation should accept the value (validation might be added later)
            prop_assert!(result.is_ok(), "Should successfully set max tasks per user");

            // Verify the value
            let retrieved = service.get_max_tasks_per_user().unwrap();
            prop_assert_eq!(retrieved, max_tasks);
        });
    }

    #[test]
    fn test_user_settings_roundtrip_persistence(
        profile_full_name in "[a-zA-Z]{1,30}",
        theme in theme_strategy(),
        language in language_strategy(),
        two_factor_enabled in prop::bool::ANY,
        cache_size in cache_size_strategy(),
        font_size in font_size_strategy(),
        quiet_hours_enabled in prop::bool::ANY,
        digest_frequency in digest_frequency_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = SettingsService::new(db);

            // Create a test user
            let user_id = Uuid::new_v4().to_string();
            let email = format!("{}@example.com", user_id);
            create_test_user(&service.db, &user_id, &email);

            // Create complete settings with random values
            let original_settings = UserSettings {
                profile: UserProfileSettings {
                    full_name: profile_full_name.clone(),
                    email: email.clone(),
                    phone: Some("555-1234".to_string()),
                    avatar_url: None,
                    notes: None,
                },
                preferences: UserPreferences {
                    theme: theme.clone(),
                    language: language.clone(),
                    ..Default::default()
                },
                security: UserSecuritySettings {
                    two_factor_enabled,
                    ..Default::default()
                },
                performance: UserPerformanceSettings {
                    cache_size,
                    ..Default::default()
                },
                accessibility: UserAccessibilitySettings {
                    font_size,
                    ..Default::default()
                },
                notifications: UserNotificationSettings {
                    quiet_hours_enabled,
                    digest_frequency: digest_frequency.clone(),
                    ..Default::default()
                },
            };

            // Update all settings
            service.update_user_profile(&user_id, &original_settings.profile).unwrap();
            service.update_user_preferences(&user_id, &original_settings.preferences).unwrap();
            service.update_user_security(&user_id, &original_settings.security).unwrap();
            service.update_user_performance(&user_id, &original_settings.performance).unwrap();
            service.update_user_accessibility(&user_id, &original_settings.accessibility).unwrap();
            service.update_user_notifications(&user_id, &original_settings.notifications).unwrap();

            // Verify round-trip persistence
            let retrieved_settings = service.get_user_settings(&user_id).unwrap();

            prop_assert_eq!(retrieved_settings.profile.full_name, profile_full_name);
            prop_assert_eq!(retrieved_settings.profile.email, email);
            prop_assert_eq!(retrieved_settings.preferences.theme, theme);
            prop_assert_eq!(retrieved_settings.preferences.language, language);
            prop_assert_eq!(retrieved_settings.security.two_factor_enabled, two_factor_enabled);
            prop_assert_eq!(retrieved_settings.performance.cache_size, cache_size);
            prop_assert_eq!(retrieved_settings.accessibility.font_size, font_size);
            prop_assert_eq!(retrieved_settings.notifications.quiet_hours_enabled, quiet_hours_enabled);
            prop_assert_eq!(retrieved_settings.notifications.digest_frequency, digest_frequency);
        });
    }
}
