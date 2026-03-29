use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GeneralSettings {
    pub auto_save: bool,
    pub language: String,
    pub timezone: String,
    pub date_format: String,
    pub currency: String,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SecuritySettings {
    pub two_factor_enabled: bool,
    pub session_timeout: u32,
    pub password_min_length: u8,
    pub password_require_special_chars: bool,
    pub password_require_numbers: bool,
    pub login_attempts_max: u8,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AppearanceSettings {
    pub dark_mode: bool,
    pub primary_color: String,
    pub font_size: String,
    pub compact_view: bool,
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            dark_mode: true,
            primary_color: "#10b981".to_string(),
            font_size: "medium".to_string(),
            compact_view: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DataManagementSettings {
    pub auto_backup: bool,
    pub backup_frequency: String,
    pub retention_days: u32,
    pub export_format: String,
    pub compression_enabled: bool,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct StorageSettings {
    pub photo_storage_type: String,
    pub local_storage_path: Option<String>,
    pub cloud_provider: Option<String>,
    pub cloud_bucket: Option<String>,
    pub cloud_region: Option<String>,
    #[serde(skip_serializing)]
    pub cloud_access_key: Option<String>,
    #[serde(skip_serializing)]
    pub cloud_secret_key: Option<String>,
    pub auto_sync_photos: bool,
    pub sync_on_wifi_only: bool,
    pub max_photo_size_mb: u32,
    pub compression_quality: u8,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AppSettings {
    pub general: GeneralSettings,
    pub security: SecuritySettings,
    pub notifications: NotificationSettings,
    pub appearance: AppearanceSettings,
    pub data_management: DataManagementSettings,
    pub storage: StorageSettings,
    #[serde(default)]
    #[ts(type = "unknown[]")]
    pub business_rules: Vec<serde_json::Value>,
    #[serde(default)]
    #[ts(type = "unknown[]")]
    pub security_policies: Vec<serde_json::Value>,
    #[serde(default)]
    #[ts(type = "unknown[]")]
    pub integrations: Vec<serde_json::Value>,
    #[serde(default)]
    #[ts(type = "unknown[]")]
    pub performance_configs: Vec<serde_json::Value>,
    #[serde(default)]
    #[ts(type = "Record<string, unknown>")]
    pub business_hours: serde_json::Value,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            general: GeneralSettings::default(),
            security: SecuritySettings::default(),
            notifications: NotificationSettings::default(),
            appearance: AppearanceSettings::default(),
            data_management: DataManagementSettings::default(),
            storage: StorageSettings::default(),
            business_rules: vec![],
            security_policies: vec![],
            integrations: vec![],
            performance_configs: vec![],
            business_hours: serde_json::Value::Object(serde_json::Map::new()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DatabaseSettings {
    pub connection_status: String,
    pub last_backup: Option<String>,
    pub database_size: String,
    pub connection_pool_size: u32,
    pub query_timeout: u32,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct IntegrationSettings {
    pub api_enabled: bool,
    pub webhook_url: Option<String>,
    pub external_services: Vec<String>,
    pub sync_interval: u32,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct PerformanceSettings {
    pub cache_enabled: bool,
    pub cache_size: u32,
    pub max_concurrent_tasks: u32,
    pub memory_limit: u32,
    pub cpu_limit: f32,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct BackupSettings {
    pub auto_backup: bool,
    pub backup_location: String,
    pub encryption_enabled: bool,
    pub compression_level: u8,
    pub include_attachments: bool,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DiagnosticSettings {
    pub logging_level: String,
    pub performance_monitoring: bool,
    pub error_reporting: bool,
    pub health_checks_enabled: bool,
    pub metrics_collection: bool,
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

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
pub struct SystemConfiguration {
    pub database: DatabaseSettings,
    pub integrations: IntegrationSettings,
    pub performance: PerformanceSettings,
    pub backup: BackupSettings,
    pub diagnostics: DiagnosticSettings,
}
