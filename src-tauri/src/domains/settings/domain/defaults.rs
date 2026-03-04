//! Centralised default-value constants for the Settings domain.
//!
//! Every user-level settings category exposes a lazily-constructed default
//! via a public function.  The values returned here are **the** single source
//! of truth for the Rust backend; the `Default` impls on the domain models
//! delegate to these same values.
//!
//! Frontend mirrors live in `frontend/src/domains/settings/services/defaults.ts`
//! and **must** stay in sync.

use super::models::settings::{
    UserAccessibilitySettings, UserNotificationSettings, UserPerformanceSettings, UserPreferences,
    UserProfileSettings, UserSecuritySettings, UserSettings,
};

// ── User Profile ────────────────────────────────────────────────────

pub fn default_profile() -> UserProfileSettings {
    UserProfileSettings {
        full_name: String::new(),
        email: String::new(),
        phone: None,
        avatar_url: None,
        notes: None,
    }
}

// ── User Preferences ────────────────────────────────────────────────

pub fn default_preferences() -> UserPreferences {
    UserPreferences {
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
    }
}

// ── User Security ───────────────────────────────────────────────────

pub fn default_security() -> UserSecuritySettings {
    UserSecuritySettings {
        two_factor_enabled: false,
        session_timeout: 480, // 8 hours
    }
}

// ── User Performance ────────────────────────────────────────────────

pub fn default_performance() -> UserPerformanceSettings {
    UserPerformanceSettings {
        cache_enabled: true,
        cache_size: 100,
        offline_mode: false,
        sync_on_startup: true,
        background_sync: true,
        image_compression: true,
        preload_data: false,
    }
}

// ── User Accessibility ──────────────────────────────────────────────

pub fn default_accessibility() -> UserAccessibilitySettings {
    UserAccessibilitySettings {
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
    }
}

// ── User Notifications ──────────────────────────────────────────────

pub fn default_notifications() -> UserNotificationSettings {
    UserNotificationSettings {
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
    }
}

// ── Composite ───────────────────────────────────────────────────────

pub fn default_user_settings() -> UserSettings {
    UserSettings {
        profile: default_profile(),
        preferences: default_preferences(),
        security: default_security(),
        performance: default_performance(),
        accessibility: default_accessibility(),
        notifications: default_notifications(),
    }
}
