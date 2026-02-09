//! Settings and configuration models

use serde::{Deserialize, Serialize};
// Conditional import removed
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GeneralSettings {
    pub auto_save: bool,
    pub language: String,
    pub timezone: String,
    pub date_format: String,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SecuritySettings {
    pub two_factor_enabled: bool,
    pub session_timeout: u32, // minutes
    pub password_min_length: u8,
    pub password_require_special_chars: bool,
    pub password_require_numbers: bool,
    pub login_attempts_max: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct NotificationSettings {
    pub push_notifications: bool,
    pub email_notifications: bool,
    pub sms_notifications: bool,
    pub task_assignments: bool,
    pub task_completions: bool,
    pub system_alerts: bool,
    pub daily_digest: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AppearanceSettings {
    pub dark_mode: bool,
    pub primary_color: String,
    pub font_size: String,
    pub compact_view: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DataManagementSettings {
    pub auto_backup: bool,
    pub backup_frequency: String, // daily, weekly, monthly
    pub retention_days: u32,
    pub export_format: String, // json, csv, xml
    pub compression_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct StorageSettings {
    pub photo_storage_type: String, // "local", "cloud", "hybrid"
    pub local_storage_path: Option<String>,
    pub cloud_provider: Option<String>, // "aws_s3", "gcp_storage", "azure_blob"
    pub cloud_bucket: Option<String>,
    pub cloud_region: Option<String>,
    pub cloud_access_key: Option<String>,
    pub cloud_secret_key: Option<String>,
    pub auto_sync_photos: bool,
    pub sync_on_wifi_only: bool,
    pub max_photo_size_mb: u32,
    pub compression_quality: u8, // 1-100
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DatabaseSettings {
    pub connection_status: String,
    pub last_backup: Option<String>,
    pub database_size: String,
    pub connection_pool_size: u32,
    pub query_timeout: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct IntegrationSettings {
    pub api_enabled: bool,
    pub webhook_url: Option<String>,
    pub external_services: Vec<String>,
    pub sync_interval: u32, // minutes
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct PerformanceSettings {
    pub cache_enabled: bool,
    pub cache_size: u32, // MB
    pub max_concurrent_tasks: u32,
    pub memory_limit: u32, // MB
    pub cpu_limit: f32,    // percentage
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct BackupSettings {
    pub auto_backup: bool,
    pub backup_location: String,
    pub encryption_enabled: bool,
    pub compression_level: u8,
    pub include_attachments: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DiagnosticSettings {
    pub logging_level: String, // error, warn, info, debug
    pub performance_monitoring: bool,
    pub error_reporting: bool,
    pub health_checks_enabled: bool,
    pub metrics_collection: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
pub struct AppSettings {
    pub general: GeneralSettings,
    pub security: SecuritySettings,
    pub notifications: NotificationSettings,
    pub appearance: AppearanceSettings,
    pub data_management: DataManagementSettings,
    pub storage: StorageSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
pub struct SystemConfiguration {
    pub database: DatabaseSettings,
    pub integrations: IntegrationSettings,
    pub performance: PerformanceSettings,
    pub backup: BackupSettings,
    pub diagnostics: DiagnosticSettings,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            auto_save: true,
            language: "fr".to_string(),
            timezone: "Europe/Paris".to_string(),
            date_format: "DD/MM/YYYY".to_string(),
            currency: "EUR".to_string(),
        }
    }
}

impl Default for SecuritySettings {
    fn default() -> Self {
        Self {
            two_factor_enabled: false,
            session_timeout: 60,
            password_min_length: 8,
            password_require_special_chars: true,
            password_require_numbers: true,
            login_attempts_max: 5,
        }
    }
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            push_notifications: true,
            email_notifications: false,
            sms_notifications: false,
            task_assignments: true,
            task_completions: true,
            system_alerts: true,
            daily_digest: false,
        }
    }
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            dark_mode: true,
            primary_color: "#10b981".to_string(), // green-500
            font_size: "medium".to_string(),
            compact_view: false,
        }
    }
}

impl Default for DataManagementSettings {
    fn default() -> Self {
        Self {
            auto_backup: true,
            backup_frequency: "daily".to_string(),
            retention_days: 30,
            export_format: "json".to_string(),
            compression_enabled: true,
        }
    }
}

impl Default for StorageSettings {
    fn default() -> Self {
        Self {
            photo_storage_type: "local".to_string(),
            local_storage_path: None,
            cloud_provider: None,
            cloud_bucket: None,
            cloud_region: None,
            cloud_access_key: None,
            cloud_secret_key: None,
            auto_sync_photos: false,
            sync_on_wifi_only: true,
            max_photo_size_mb: 10,
            compression_quality: 80,
        }
    }
}

impl Default for DatabaseSettings {
    fn default() -> Self {
        Self {
            connection_status: "connected".to_string(),
            last_backup: None,
            database_size: "0 MB".to_string(),
            connection_pool_size: 10,
            query_timeout: 30,
        }
    }
}

impl Default for IntegrationSettings {
    fn default() -> Self {
        Self {
            api_enabled: false,
            webhook_url: None,
            external_services: vec![],
            sync_interval: 15,
        }
    }
}

impl Default for PerformanceSettings {
    fn default() -> Self {
        Self {
            cache_enabled: true,
            cache_size: 100,
            max_concurrent_tasks: 5,
            memory_limit: 512,
            cpu_limit: 80.0,
        }
    }
}

impl Default for BackupSettings {
    fn default() -> Self {
        Self {
            auto_backup: true,
            backup_location: "./backups".to_string(),
            encryption_enabled: false,
            compression_level: 6,
            include_attachments: true,
        }
    }
}

impl Default for DiagnosticSettings {
    fn default() -> Self {
        Self {
            logging_level: "info".to_string(),
            performance_monitoring: true,
            error_reporting: true,
            health_checks_enabled: true,
            metrics_collection: false,
        }
    }
}

// User-specific settings models

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserProfileSettings {
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserPreferences {
    // Notifications
    pub email_notifications: bool,
    pub push_notifications: bool,
    pub task_assignments: bool,
    pub task_updates: bool,
    pub system_alerts: bool,
    pub weekly_reports: bool,

    // Display
    pub theme: String,       // 'light', 'dark', 'system'
    pub language: String,    // 'fr', 'en'
    pub date_format: String, // 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'
    pub time_format: String, // '24h', '12h'

    // Accessibility
    pub high_contrast: bool,
    pub large_text: bool,
    pub reduce_motion: bool,
    pub screen_reader: bool,

    // Performance
    pub auto_refresh: bool,
    pub refresh_interval: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserSecuritySettings {
    pub two_factor_enabled: bool,
    pub session_timeout: u32, // minutes
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UserPerformanceSettings {
    pub cache_enabled: bool,
    pub cache_size: u32, // MB
    pub offline_mode: bool,
    pub sync_on_startup: bool,
    pub background_sync: bool,
    pub image_compression: bool,
    pub preload_data: bool,
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
    pub color_blind_mode: String, // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
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
    pub digest_frequency: String, // 'never', 'daily', 'weekly'
    pub batch_notifications: bool,
    pub sound_enabled: bool,
    pub sound_volume: u32,
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
        }
    }
}

impl Default for UserSecuritySettings {
    fn default() -> Self {
        Self {
            two_factor_enabled: false,
            session_timeout: 480, // 8 hours
        }
    }
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
