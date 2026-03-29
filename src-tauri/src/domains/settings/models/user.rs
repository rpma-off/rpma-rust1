use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserProfileSettings {
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub notes: Option<String>,
}

impl Default for UserProfileSettings {
    fn default() -> Self {
        Self {
            full_name: "".to_string(),
            email: "".to_string(),
            phone: None,
            avatar_url: None,
            notes: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(rename_all = "camelCase")]
pub struct UserPreferences {
    pub email_notifications: bool,
    pub push_notifications: bool,
    pub task_assignments: bool,
    pub task_updates: bool,
    pub system_alerts: bool,
    pub weekly_reports: bool,
    pub theme: String,
    pub language: String,
    pub date_format: String,
    pub time_format: String,
    pub high_contrast: bool,
    pub large_text: bool,
    pub reduce_motion: bool,
    pub screen_reader: bool,
    pub auto_refresh: bool,
    pub refresh_interval: u32,
    pub calendar_view: Option<String>,
    pub calendar_show_my_events_only: Option<bool>,
    pub calendar_filter_statuses: Option<Vec<String>>,
    pub calendar_filter_priorities: Option<Vec<String>>,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
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
            calendar_view: None,
            calendar_show_my_events_only: None,
            calendar_filter_statuses: None,
            calendar_filter_priorities: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserSecuritySettings {
    pub two_factor_enabled: bool,
    pub session_timeout: u32,
}

impl Default for UserSecuritySettings {
    fn default() -> Self {
        Self {
            two_factor_enabled: false,
            session_timeout: 480,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserPerformanceSettings {
    pub cache_enabled: bool,
    pub cache_size: u32,
    pub offline_mode: bool,
    pub sync_on_startup: bool,
    pub background_sync: bool,
    pub image_compression: bool,
    pub preload_data: bool,
}

impl Default for UserPerformanceSettings {
    fn default() -> Self {
        Self {
            cache_enabled: true,
            cache_size: 100,
            offline_mode: false,
            sync_on_startup: true,
            background_sync: true,
            image_compression: true,
            preload_data: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserAccessibilitySettings {
    pub high_contrast: bool,
    pub large_text: bool,
    pub reduce_motion: bool,
    pub screen_reader: bool,
    pub focus_indicators: bool,
    pub keyboard_navigation: bool,
    pub text_to_speech: bool,
    pub speech_rate: f32,
    pub font_size: u32,
    pub color_blind_mode: String,
}

impl Default for UserAccessibilitySettings {
    fn default() -> Self {
        Self {
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
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserNotificationSettings {
    pub email_enabled: bool,
    pub push_enabled: bool,
    pub in_app_enabled: bool,
    pub task_assigned: bool,
    pub task_updated: bool,
    pub task_completed: bool,
    pub task_overdue: bool,
    pub system_alerts: bool,
    pub maintenance: bool,
    pub security_alerts: bool,
    pub quiet_hours_enabled: bool,
    pub quiet_hours_start: String,
    pub quiet_hours_end: String,
    pub digest_frequency: String,
    pub batch_notifications: bool,
    pub sound_enabled: bool,
    pub sound_volume: u32,
}

impl Default for UserNotificationSettings {
    fn default() -> Self {
        Self {
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
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
pub struct UserSettings {
    pub profile: UserProfileSettings,
    pub preferences: UserPreferences,
    pub security: UserSecuritySettings,
    pub performance: UserPerformanceSettings,
    pub accessibility: UserAccessibilitySettings,
    pub notifications: UserNotificationSettings,
}
