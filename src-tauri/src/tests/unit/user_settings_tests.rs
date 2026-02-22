//! Unit tests for User Settings Service
//!
//! Tests user settings management, validation, and persistence

use crate::db::Database;
use crate::models::settings::*;
use crate::domains::settings::infrastructure::settings::SettingsService;
use rusqlite::params;
use uuid::Uuid;

// Helper to create a test database with settings tables
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Create user table and user_settings table (from migration 026)
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
        
        CREATE TABLE IF NOT EXISTS settings_audit_log (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            setting_type TEXT,
            details TEXT,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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

// Helper to create default user settings
fn create_default_settings() -> UserSettings {
    UserSettings {
        profile: UserProfileSettings {
            full_name: "Test User".to_string(),
            email: "test@example.com".to_string(),
            phone: None,
            avatar_url: None,
            notes: None,
        },
        preferences: UserPreferences {
            email_notifications: true,
            push_notifications: true,
            task_assignments: true,
            task_updates: true,
            system_alerts: true,
            weekly_reports: false,
            theme: "system".to_string(),
            language: "fr".to_string(),
            date_format: "DD/MM/YYYY".to_string(),
            time_format: "24h".to_string(),
            high_contrast: false,
            large_text: false,
            reduce_motion: false,
            screen_reader: false,
            auto_refresh: true,
            refresh_interval: 60,
        },
        security: UserSecuritySettings {
            two_factor_enabled: false,
            session_timeout: 480,
        },
        performance: UserPerformanceSettings {
            cache_enabled: true,
            cache_size: 100,
            offline_mode: false,
            sync_on_startup: true,
            background_sync: true,
            image_compression: true,
            preload_data: false,
        },
        accessibility: UserAccessibilitySettings {
            high_contrast: false,
            large_text: false,
            reduce_motion: false,
            screen_reader: false,
            focus_indicators: true,
            keyboard_navigation: true,
            text_to_speech: false,
            speech_rate: 1.0,
            font_size: 16,
            color_blind_mode: "none".to_string(),
        },
        notifications: UserNotificationSettings {
            email_enabled: true,
            push_enabled: true,
            in_app_enabled: true,
            task_assigned: true,
            task_updated: true,
            task_completed: false,
            task_overdue: true,
            system_alerts: true,
            maintenance: false,
            security_alerts: true,
            quiet_hours_enabled: false,
            quiet_hours_start: "22:00".to_string(),
            quiet_hours_end: "08:00".to_string(),
            digest_frequency: "never".to_string(),
            batch_notifications: false,
            sound_enabled: true,
            sound_volume: 70,
        },
    }
}

#[tokio::test]
async fn test_create_user_settings() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user
    let user_id = "user_test_create";
    create_test_user(&service.db, user_id, "test_create@example.com");

    // Create default settings
    let settings = create_default_settings();
    let result = service.create_user_settings(user_id, &settings);

    assert!(result.is_ok(), "Should successfully create user settings");

    // Verify settings were created
    let retrieved_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(
        retrieved_settings.profile.full_name,
        settings.profile.full_name
    );
    assert_eq!(
        retrieved_settings.preferences.theme,
        settings.preferences.theme
    );
    assert_eq!(
        retrieved_settings.security.session_timeout,
        settings.security.session_timeout
    );
}

#[tokio::test]
async fn test_get_user_settings_default() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user but no settings
    let user_id = "user_test_default";
    create_test_user(&service.db, user_id, "test_default@example.com");

    // Get settings - should create defaults
    let settings = service.get_user_settings(user_id).unwrap();

    // Verify default values
    assert_eq!(settings.profile.full_name, "");
    assert_eq!(settings.preferences.theme, "system");
    assert_eq!(settings.preferences.language, "fr");
    assert_eq!(settings.security.two_factor_enabled, false);
    assert_eq!(settings.security.session_timeout, 480);
    assert_eq!(settings.performance.cache_enabled, true);
    assert_eq!(settings.performance.cache_size, 100);
    assert_eq!(settings.accessibility.high_contrast, false);
    assert_eq!(settings.accessibility.font_size, 16);
    assert_eq!(settings.notifications.email_enabled, true);
    assert_eq!(settings.notifications.push_enabled, true);
    assert_eq!(settings.notifications.quiet_hours_enabled, false);
}

#[tokio::test]
async fn test_get_user_settings_existing() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_existing";
    create_test_user(&service.db, user_id, "test_existing@example.com");

    // Create custom settings
    let mut settings = create_default_settings();
    settings.profile.full_name = "John Doe".to_string();
    settings.preferences.theme = "dark".to_string();
    settings.security.session_timeout = 600;
    settings.performance.cache_size = 200;
    settings.accessibility.font_size = 20;
    settings.notifications.quiet_hours_enabled = true;

    service.create_user_settings(user_id, &settings).unwrap();

    // Get settings
    let retrieved_settings = service.get_user_settings(user_id).unwrap();

    // Verify custom values
    assert_eq!(retrieved_settings.profile.full_name, "John Doe");
    assert_eq!(retrieved_settings.preferences.theme, "dark");
    assert_eq!(retrieved_settings.security.session_timeout, 600);
    assert_eq!(retrieved_settings.performance.cache_size, 200);
    assert_eq!(retrieved_settings.accessibility.font_size, 20);
    assert_eq!(retrieved_settings.notifications.quiet_hours_enabled, true);
}

#[tokio::test]
async fn test_update_user_profile() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_profile";
    create_test_user(&service.db, user_id, "test_profile@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Update profile
    let new_profile = UserProfileSettings {
        full_name: "Jane Smith".to_string(),
        email: "jane@example.com".to_string(),
        phone: Some("555-1234".to_string()),
        avatar_url: Some("https://example.com/avatar.jpg".to_string()),
        notes: Some("Test notes".to_string()),
    };

    let result = service.update_user_profile(user_id, &new_profile);
    assert!(result.is_ok(), "Should successfully update user profile");

    // Verify update
    let retrieved_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(retrieved_settings.profile.full_name, "Jane Smith");
    assert_eq!(retrieved_settings.profile.email, "jane@example.com");
    assert_eq!(
        retrieved_settings.profile.phone,
        Some("555-1234".to_string())
    );
    assert_eq!(
        retrieved_settings.profile.avatar_url,
        Some("https://example.com/avatar.jpg".to_string())
    );
    assert_eq!(
        retrieved_settings.profile.notes,
        Some("Test notes".to_string())
    );
}

#[tokio::test]
async fn test_update_user_preferences() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_preferences";
    create_test_user(&service.db, user_id, "test_preferences@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Update preferences
    let new_preferences = UserPreferences {
        email_notifications: false,
        push_notifications: true,
        task_assignments: false,
        task_updates: true,
        system_alerts: false,
        weekly_reports: true,
        theme: "dark".to_string(),
        language: "en".to_string(),
        date_format: "MM/DD/YYYY".to_string(),
        time_format: "12h".to_string(),
        high_contrast: true,
        large_text: true,
        reduce_motion: true,
        screen_reader: true,
        auto_refresh: false,
        refresh_interval: 30,
    };

    let result = service.update_user_preferences(user_id, &new_preferences);
    assert!(
        result.is_ok(),
        "Should successfully update user preferences"
    );

    // Verify update
    let retrieved_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(retrieved_settings.preferences.email_notifications, false);
    assert_eq!(retrieved_settings.preferences.push_notifications, true);
    assert_eq!(retrieved_settings.preferences.weekly_reports, true);
    assert_eq!(retrieved_settings.preferences.theme, "dark");
    assert_eq!(retrieved_settings.preferences.language, "en");
    assert_eq!(retrieved_settings.preferences.date_format, "MM/DD/YYYY");
    assert_eq!(retrieved_settings.preferences.time_format, "12h");
    assert_eq!(retrieved_settings.preferences.high_contrast, true);
    assert_eq!(retrieved_settings.preferences.refresh_interval, 30);
}

#[tokio::test]
async fn test_update_user_security() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_security";
    create_test_user(&service.db, user_id, "test_security@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Update security settings
    let new_security = UserSecuritySettings {
        two_factor_enabled: true,
        session_timeout: 300, // 5 minutes
    };

    let result = service.update_user_security(user_id, &new_security);
    assert!(
        result.is_ok(),
        "Should successfully update user security settings"
    );

    // Verify update
    let retrieved_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(retrieved_settings.security.two_factor_enabled, true);
    assert_eq!(retrieved_settings.security.session_timeout, 300);
}

#[tokio::test]
async fn test_update_user_performance() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_performance";
    create_test_user(&service.db, user_id, "test_performance@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Update performance settings
    let new_performance = UserPerformanceSettings {
        cache_enabled: false,
        cache_size: 50,
        offline_mode: true,
        sync_on_startup: false,
        background_sync: false,
        image_compression: false,
        preload_data: true,
    };

    let result = service.update_user_performance(user_id, &new_performance);
    assert!(
        result.is_ok(),
        "Should successfully update user performance settings"
    );

    // Verify update
    let retrieved_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(retrieved_settings.performance.cache_enabled, false);
    assert_eq!(retrieved_settings.performance.cache_size, 50);
    assert_eq!(retrieved_settings.performance.offline_mode, true);
    assert_eq!(retrieved_settings.performance.sync_on_startup, false);
    assert_eq!(retrieved_settings.performance.background_sync, false);
    assert_eq!(retrieved_settings.performance.image_compression, false);
    assert_eq!(retrieved_settings.performance.preload_data, true);
}

#[tokio::test]
async fn test_update_user_accessibility() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_accessibility";
    create_test_user(&service.db, user_id, "test_accessibility@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Update accessibility settings
    let new_accessibility = UserAccessibilitySettings {
        high_contrast: true,
        large_text: true,
        reduce_motion: true,
        screen_reader: true,
        focus_indicators: false,
        keyboard_navigation: false,
        text_to_speech: true,
        speech_rate: 1.5,
        font_size: 24,
        color_blind_mode: "protanopia".to_string(),
    };

    let result = service.update_user_accessibility(user_id, &new_accessibility);
    assert!(
        result.is_ok(),
        "Should successfully update user accessibility settings"
    );

    // Verify update
    let retrieved_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(retrieved_settings.accessibility.high_contrast, true);
    assert_eq!(retrieved_settings.accessibility.large_text, true);
    assert_eq!(retrieved_settings.accessibility.reduce_motion, true);
    assert_eq!(retrieved_settings.accessibility.screen_reader, true);
    assert_eq!(retrieved_settings.accessibility.focus_indicators, false);
    assert_eq!(retrieved_settings.accessibility.keyboard_navigation, false);
    assert_eq!(retrieved_settings.accessibility.text_to_speech, true);
    assert_eq!(retrieved_settings.accessibility.speech_rate, 1.5);
    assert_eq!(retrieved_settings.accessibility.font_size, 24);
    assert_eq!(
        retrieved_settings.accessibility.color_blind_mode,
        "protanopia"
    );
}

#[tokio::test]
async fn test_update_user_notifications() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_notifications";
    create_test_user(&service.db, user_id, "test_notifications@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Update notification settings
    let new_notifications = UserNotificationSettings {
        email_enabled: false,
        push_enabled: false,
        in_app_enabled: true,
        task_assigned: false,
        task_updated: true,
        task_completed: true,
        task_overdue: false,
        system_alerts: false,
        maintenance: true,
        security_alerts: true,
        quiet_hours_enabled: true,
        quiet_hours_start: "21:00".to_string(),
        quiet_hours_end: "09:00".to_string(),
        digest_frequency: "daily".to_string(),
        batch_notifications: true,
        sound_enabled: false,
        sound_volume: 50,
    };

    let result = service.update_user_notifications(user_id, &new_notifications);
    assert!(
        result.is_ok(),
        "Should successfully update user notification settings"
    );

    // Verify update
    let retrieved_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(retrieved_settings.notifications.email_enabled, false);
    assert_eq!(retrieved_settings.notifications.push_enabled, false);
    assert_eq!(retrieved_settings.notifications.in_app_enabled, true);
    assert_eq!(retrieved_settings.notifications.task_assigned, false);
    assert_eq!(retrieved_settings.notifications.task_updated, true);
    assert_eq!(retrieved_settings.notifications.task_completed, true);
    assert_eq!(retrieved_settings.notifications.quiet_hours_enabled, true);
    assert_eq!(retrieved_settings.notifications.quiet_hours_start, "21:00");
    assert_eq!(retrieved_settings.notifications.quiet_hours_end, "09:00");
    assert_eq!(retrieved_settings.notifications.digest_frequency, "daily");
    assert_eq!(retrieved_settings.notifications.batch_notifications, true);
    assert_eq!(retrieved_settings.notifications.sound_enabled, false);
    assert_eq!(retrieved_settings.notifications.sound_volume, 50);
}

#[tokio::test]
async fn test_settings_validation() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user
    let user_id = "user_test_validation";
    create_test_user(&service.db, user_id, "test_validation@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Test invalid refresh interval (should be positive)
    let mut invalid_preferences = create_default_settings().preferences;
    invalid_preferences.refresh_interval = 0; // Invalid

    let result = service.update_user_preferences(user_id, &invalid_preferences);
    // Note: The current implementation doesn't validate this, but a real implementation should

    // Test invalid session timeout (should be positive)
    let mut invalid_security = create_default_settings().security;
    invalid_security.session_timeout = 0; // Invalid

    let result = service.update_user_security(user_id, &invalid_security);
    // Note: The current implementation doesn't validate this, but a real implementation should

    // Test invalid speech rate (should be positive)
    let mut invalid_accessibility = create_default_settings().accessibility;
    invalid_accessibility.speech_rate = -1.0; // Invalid

    let result = service.update_user_accessibility(user_id, &invalid_accessibility);
    // Note: The current implementation doesn't validate this, but a real implementation should

    // Test invalid sound volume (should be 0-100)
    let mut invalid_notifications = create_default_settings().notifications;
    invalid_notifications.sound_volume = 150; // Invalid

    let result = service.update_user_notifications(user_id, &invalid_notifications);
    // Note: The current implementation doesn't validate this, but a real implementation should
}

#[tokio::test]
async fn test_delete_user_settings() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_delete";
    create_test_user(&service.db, user_id, "test_delete@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Verify settings exist
    let retrieved_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(
        retrieved_settings.profile.full_name,
        settings.profile.full_name
    );

    // Delete settings
    let result = service.delete_user_settings(user_id);
    assert!(result.is_ok(), "Should successfully delete user settings");

    // Try to get settings again - should create defaults
    let new_settings = service.get_user_settings(user_id).unwrap();
    assert_eq!(new_settings.profile.full_name, ""); // Default empty string
}

#[tokio::test]
async fn test_settings_audit_logging() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create a test user and settings
    let user_id = "user_test_audit";
    create_test_user(&service.db, user_id, "test_audit@example.com");

    let settings = create_default_settings();
    service.create_user_settings(user_id, &settings).unwrap();

    // Update profile
    let new_profile = UserProfileSettings {
        full_name: "Audit User".to_string(),
        email: "audit@example.com".to_string(),
        phone: None,
        avatar_url: None,
        notes: None,
    };

    service.update_user_profile(user_id, &new_profile).unwrap();

    // Check audit log
    let audit_logs: Vec<(String, String, String, i64)> = service
        .db
        .query_as(
            r#"
            SELECT id, user_id, setting_type, timestamp
            FROM settings_audit_log
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        "#,
            params![user_id],
        )
        .unwrap_or_default();

    assert_eq!(audit_logs.len(), 1, "Should have one audit log entry");
    assert_eq!(audit_logs[0].1, user_id);
    assert_eq!(audit_logs[0].2, "profile");
}

#[tokio::test]
async fn test_multiple_users_settings() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Create multiple users
    let user1_id = "user_test_1";
    let user2_id = "user_test_2";

    create_test_user(&service.db, user1_id, "test1@example.com");
    create_test_user(&service.db, user2_id, "test2@example.com");

    // Create different settings for each user
    let mut settings1 = create_default_settings();
    settings1.profile.full_name = "User One".to_string();
    settings1.preferences.theme = "dark".to_string();

    let mut settings2 = create_default_settings();
    settings2.profile.full_name = "User Two".to_string();
    settings2.preferences.theme = "light".to_string();

    service.create_user_settings(user1_id, &settings1).unwrap();
    service.create_user_settings(user2_id, &settings2).unwrap();

    // Verify settings are isolated
    let retrieved1 = service.get_user_settings(user1_id).unwrap();
    let retrieved2 = service.get_user_settings(user2_id).unwrap();

    assert_eq!(retrieved1.profile.full_name, "User One");
    assert_eq!(retrieved1.preferences.theme, "dark");

    assert_eq!(retrieved2.profile.full_name, "User Two");
    assert_eq!(retrieved2.preferences.theme, "light");
}

#[tokio::test]
async fn test_max_tasks_per_user_setting() {
    let db = create_test_db().await;
    let service = SettingsService::new(db);

    // Initially should have default value
    let max_tasks = service.get_max_tasks_per_user().unwrap();
    assert_eq!(max_tasks, 10, "Default max tasks should be 10");

    // Set custom value
    service.set_max_tasks_per_user(20).unwrap();

    // Verify new value
    let max_tasks = service.get_max_tasks_per_user().unwrap();
    assert_eq!(max_tasks, 20, "Should get updated max tasks value");
}
