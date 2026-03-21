//! Tests for the centralised settings defaults.
//!
//! Ensures that the `Default` impls on domain models return exactly the
//! values declared in `models`, preventing silent drift.

use crate::domains::settings::models::{
    default_accessibility, default_notifications, default_performance, default_preferences,
    default_profile, default_security, default_user_settings, AppSettings, OnboardingData,
    StorageSettings, UserAccessibilitySettings, UserNotificationSettings, UserPerformanceSettings,
    UserPreferences, UserProfileSettings, UserSecuritySettings, UserSettings,
};
use crate::test_utils::build_test_app_state;

// ── UserProfileSettings ─────────────────────────────────────────────

#[test]
fn profile_default_matches_centralised() {
    let d: UserProfileSettings = UserProfileSettings::default();
    let c = default_profile();
    assert_eq!(d.full_name, c.full_name);
    assert_eq!(d.email, c.email);
    assert_eq!(d.phone, c.phone);
    assert_eq!(d.avatar_url, c.avatar_url);
    assert_eq!(d.notes, c.notes);
}

// ── UserPreferences ─────────────────────────────────────────────────

#[test]
fn preferences_default_matches_centralised() {
    let d: UserPreferences = UserPreferences::default();
    let c = default_preferences();

    assert_eq!(d.email_notifications, c.email_notifications);
    assert_eq!(d.push_notifications, c.push_notifications);
    assert_eq!(d.task_assignments, c.task_assignments);
    assert_eq!(d.task_updates, c.task_updates);
    assert_eq!(d.system_alerts, c.system_alerts);
    assert_eq!(d.weekly_reports, c.weekly_reports);
    assert_eq!(d.theme, c.theme);
    assert_eq!(d.language, c.language);
    assert_eq!(d.date_format, c.date_format);
    assert_eq!(d.time_format, c.time_format);
    assert_eq!(d.high_contrast, c.high_contrast);
    assert_eq!(d.large_text, c.large_text);
    assert_eq!(d.reduce_motion, c.reduce_motion);
    assert_eq!(d.screen_reader, c.screen_reader);
    assert_eq!(d.auto_refresh, c.auto_refresh);
    assert_eq!(d.refresh_interval, c.refresh_interval);
}

// ── UserSecuritySettings ────────────────────────────────────────────

#[test]
fn security_default_matches_centralised() {
    let d: UserSecuritySettings = UserSecuritySettings::default();
    let c = default_security();
    assert_eq!(d.two_factor_enabled, c.two_factor_enabled);
    assert_eq!(d.session_timeout, c.session_timeout);
}

// ── UserPerformanceSettings ─────────────────────────────────────────

#[test]
fn performance_default_matches_centralised() {
    let d: UserPerformanceSettings = UserPerformanceSettings::default();
    let c = default_performance();
    assert_eq!(d.cache_enabled, c.cache_enabled);
    assert_eq!(d.cache_size, c.cache_size);
    assert_eq!(d.offline_mode, c.offline_mode);
    assert_eq!(d.sync_on_startup, c.sync_on_startup);
    assert_eq!(d.background_sync, c.background_sync);
    assert_eq!(d.image_compression, c.image_compression);
    assert_eq!(d.preload_data, c.preload_data);
}

// ── UserAccessibilitySettings ───────────────────────────────────────

#[test]
fn accessibility_default_matches_centralised() {
    let d: UserAccessibilitySettings = UserAccessibilitySettings::default();
    let c = default_accessibility();
    assert_eq!(d.high_contrast, c.high_contrast);
    assert_eq!(d.large_text, c.large_text);
    assert_eq!(d.reduce_motion, c.reduce_motion);
    assert_eq!(d.screen_reader, c.screen_reader);
    assert_eq!(d.focus_indicators, c.focus_indicators);
    assert_eq!(d.keyboard_navigation, c.keyboard_navigation);
    assert_eq!(d.text_to_speech, c.text_to_speech);
    assert_eq!(d.speech_rate, c.speech_rate);
    assert_eq!(d.font_size, c.font_size);
    assert_eq!(d.color_blind_mode, c.color_blind_mode);
}

// ── UserNotificationSettings ────────────────────────────────────────

#[test]
fn notifications_default_matches_centralised() {
    let d: UserNotificationSettings = UserNotificationSettings::default();
    let c = default_notifications();
    assert_eq!(d.email_enabled, c.email_enabled);
    assert_eq!(d.push_enabled, c.push_enabled);
    assert_eq!(d.in_app_enabled, c.in_app_enabled);
    assert_eq!(d.task_assigned, c.task_assigned);
    assert_eq!(d.task_updated, c.task_updated);
    assert_eq!(d.task_completed, c.task_completed);
    assert_eq!(d.task_overdue, c.task_overdue);
    assert_eq!(d.system_alerts, c.system_alerts);
    assert_eq!(d.maintenance, c.maintenance);
    assert_eq!(d.security_alerts, c.security_alerts);
    assert_eq!(d.quiet_hours_enabled, c.quiet_hours_enabled);
    assert_eq!(d.quiet_hours_start, c.quiet_hours_start);
    assert_eq!(d.quiet_hours_end, c.quiet_hours_end);
    assert_eq!(d.digest_frequency, c.digest_frequency);
    assert_eq!(d.batch_notifications, c.batch_notifications);
    assert_eq!(d.sound_enabled, c.sound_enabled);
    assert_eq!(d.sound_volume, c.sound_volume);
}

// ── Composite UserSettings ──────────────────────────────────────────

#[test]
fn user_settings_default_composes_all_sub_defaults() {
    let d: UserSettings = UserSettings::default();
    let c = default_user_settings();

    // Profile
    assert_eq!(d.profile.full_name, c.profile.full_name);
    assert_eq!(d.profile.email, c.profile.email);

    // Preferences
    assert_eq!(d.preferences.theme, c.preferences.theme);
    assert_eq!(d.preferences.language, c.preferences.language);

    // Security
    assert_eq!(d.security.session_timeout, c.security.session_timeout);

    // Performance
    assert_eq!(d.performance.cache_enabled, c.performance.cache_enabled);

    // Accessibility
    assert_eq!(d.accessibility.font_size, c.accessibility.font_size);

    // Notifications
    assert_eq!(d.notifications.sound_volume, c.notifications.sound_volume);
}

#[test]
fn storage_settings_serialization_omits_cloud_credentials() {
    let settings = StorageSettings {
        photo_storage_type: "cloud".to_string(),
        local_storage_path: Some("/tmp/photos".to_string()),
        cloud_provider: Some("s3".to_string()),
        cloud_bucket: Some("bucket".to_string()),
        cloud_region: Some("eu-west-1".to_string()),
        cloud_access_key: Some("access-key".to_string()),
        cloud_secret_key: Some("secret-key".to_string()),
        auto_sync_photos: true,
        sync_on_wifi_only: false,
        max_photo_size_mb: 10,
        compression_quality: 80,
    };

    let value = serde_json::to_value(&settings).expect("storage settings should serialize");
    let object = value
        .as_object()
        .expect("storage settings should serialize to an object");

    assert!(!object.contains_key("cloud_access_key"));
    assert!(!object.contains_key("cloud_secret_key"));
}

#[tokio::test]
async fn storage_settings_repository_round_trip_preserves_cloud_credentials() {
    let state = build_test_app_state().await;
    let mut settings = AppSettings::default();
    settings.storage = StorageSettings {
        photo_storage_type: "cloud".to_string(),
        local_storage_path: Some("/tmp/photos".to_string()),
        cloud_provider: Some("s3".to_string()),
        cloud_bucket: Some("bucket".to_string()),
        cloud_region: Some("eu-west-1".to_string()),
        cloud_access_key: Some("access-key".to_string()),
        cloud_secret_key: Some("secret-key".to_string()),
        auto_sync_photos: true,
        sync_on_wifi_only: false,
        max_photo_size_mb: 10,
        compression_quality: 80,
    };

    state
        .settings_repository
        .save_app_settings_db(&settings, "test-user")
        .expect("app settings should save");

    let loaded = state
        .settings_repository
        .get_app_settings_db()
        .expect("app settings should load");

    assert_eq!(
        loaded.storage.cloud_access_key.as_deref(),
        Some("access-key")
    );
    assert_eq!(
        loaded.storage.cloud_secret_key.as_deref(),
        Some("secret-key")
    );
}

#[tokio::test]
async fn storage_settings_repository_persists_cloud_credentials_in_raw_json() {
    let state = build_test_app_state().await;
    let mut settings = AppSettings::default();
    settings.storage = StorageSettings {
        photo_storage_type: "cloud".to_string(),
        local_storage_path: Some("/tmp/photos".to_string()),
        cloud_provider: Some("s3".to_string()),
        cloud_bucket: Some("bucket".to_string()),
        cloud_region: Some("eu-west-1".to_string()),
        cloud_access_key: Some("access-key".to_string()),
        cloud_secret_key: Some("secret-key".to_string()),
        auto_sync_photos: true,
        sync_on_wifi_only: false,
        max_photo_size_mb: 10,
        compression_quality: 80,
    };

    state
        .settings_repository
        .save_app_settings_db(&settings, "test-user")
        .expect("app settings should save");

    let conn = state
        .db
        .get_connection()
        .expect("database connection should be available");
    let raw_storage: String = conn
        .query_row(
            "SELECT storage_settings FROM app_settings WHERE id = 'global'",
            [],
            |row| row.get(0),
        )
        .expect("storage_settings JSON should be readable");

    let raw_value: serde_json::Value =
        serde_json::from_str(&raw_storage).expect("storage_settings JSON should parse");
    let raw_object = raw_value
        .as_object()
        .expect("storage_settings JSON should be an object");

    assert_eq!(
        raw_object
            .get("cloud_access_key")
            .and_then(serde_json::Value::as_str),
        Some("access-key")
    );
    assert_eq!(
        raw_object
            .get("cloud_secret_key")
            .and_then(serde_json::Value::as_str),
        Some("secret-key")
    );
}
