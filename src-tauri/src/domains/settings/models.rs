//! Settings and organization domain models, defaults, and policies.

use crate::db::FromSqlRow;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::contracts::common::serialize_timestamp;
use crate::shared::ipc::errors::AppError;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

// ── Settings Categories & Policy ─────────────────────────────────────

/// Logical categories for settings operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
pub enum SettingsCategory {
    /// User profile (name, email, phone, avatar …).
    Profile,
    /// Display / UI preferences (theme, language, date format …).
    Preferences,
    /// Per-user security (2FA, session timeout).
    Security,
    /// Performance tuning (cache, sync, compression …).
    Performance,
    /// Accessibility options.
    Accessibility,
    /// Notification preferences.
    Notifications,
    /// Application-wide settings (admin-only).
    AppSettings,
    /// System configuration (admin-only).
    SystemConfig,
    /// Data consent / GDPR.
    Consent,
}

/// Central RBAC rules for settings operations.
#[derive(Debug, Clone, Copy, Default)]
pub struct SettingsAccessPolicy;

impl SettingsAccessPolicy {
    /// Returns `true` when the given category requires an **Admin** role
    /// to read *or* write.
    pub fn is_admin_only(category: SettingsCategory) -> bool {
        matches!(
            category,
            SettingsCategory::AppSettings | SettingsCategory::SystemConfig
        )
    }

    /// Ensure the caller is allowed to operate on `category`.
    pub fn ensure_access(user: &UserSession, category: SettingsCategory) -> Result<(), AppError> {
        if Self::is_admin_only(category) && !matches!(user.role, UserRole::Admin) {
            return Err(AppError::Authorization(
                "Only administrators can manage application-wide settings".to_string(),
            ));
        }
        Ok(())
    }
}

// ── App Settings Models ──────────────────────────────────────────────

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
    // SECURITY: not serialized to frontend
    #[serde(skip_serializing)]
    pub cloud_access_key: Option<String>,
    // SECURITY: not serialized to frontend
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

// ── System Configuration Models ──────────────────────────────────────

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

// ── User Settings Models ─────────────────────────────────────────────

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

// ── Organization Models ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS, Default)]
pub struct Organization {
    pub id: String,
    pub name: String,
    pub slug: Option<String>,
    pub legal_name: Option<String>,
    pub tax_id: Option<String>,
    pub siret: Option<String>,
    pub registration_number: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub website: Option<String>,
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,
    pub logo_url: Option<String>,
    pub logo_data: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub accent_color: Option<String>,
    pub business_settings: Option<String>,
    pub invoice_settings: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
}

impl Organization {
    pub fn default_org() -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id: "default".to_string(),
            name: "My Organization".to_string(),
            slug: None,
            legal_name: None,
            tax_id: None,
            siret: None,
            registration_number: None,
            email: None,
            phone: None,
            website: None,
            address_street: None,
            address_city: None,
            address_state: None,
            address_zip: None,
            address_country: Some("France".to_string()),
            logo_url: None,
            logo_data: None,
            primary_color: Some("#3B82F6".to_string()),
            secondary_color: Some("#1E40AF".to_string()),
            accent_color: None,
            business_settings: Some("{}".to_string()),
            invoice_settings: Some("{}".to_string()),
            industry: None,
            company_size: None,
            created_at: now,
            updated_at: now,
        }
    }
}

impl FromSqlRow for Organization {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Organization {
            id: row.get("id")?,
            name: row.get("name")?,
            slug: row.get("slug")?,
            legal_name: row.get("legal_name")?,
            tax_id: row.get("tax_id")?,
            siret: row.get("siret")?,
            registration_number: row.get("registration_number")?,
            email: row.get("email")?,
            phone: row.get("phone")?,
            website: row.get("website")?,
            address_street: row.get("address_street")?,
            address_city: row.get("address_city")?,
            address_state: row.get("address_state")?,
            address_zip: row.get("address_zip")?,
            address_country: row.get("address_country")?,
            logo_url: row.get("logo_url")?,
            logo_data: row.get("logo_data")?,
            primary_color: row.get("primary_color")?,
            secondary_color: row.get("secondary_color")?,
            accent_color: row.get("accent_color")?,
            business_settings: row.get("business_settings")?,
            invoice_settings: row.get("invoice_settings")?,
            industry: row.get("industry")?,
            company_size: row.get("company_size")?,
            created_at: row.get::<_, i64>("created_at")?,
            updated_at: row.get::<_, i64>("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Default)]
pub struct CreateOrganizationRequest {
    #[serde(default)]
    pub name: String,
    pub slug: Option<String>,
    pub legal_name: Option<String>,
    pub tax_id: Option<String>,
    pub siret: Option<String>,
    pub registration_number: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub website: Option<String>,
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
}

impl CreateOrganizationRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Organization name is required".to_string());
        }
        if self.name.len() > 200 {
            return Err("Organization name must be 200 characters or less".to_string());
        }
        if let Some(ref email) = self.email {
            if !is_valid_email(email) {
                return Err("Invalid email format".to_string());
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Default)]
pub struct UpdateOrganizationRequest {
    pub name: Option<String>,
    pub slug: Option<String>,
    pub legal_name: Option<String>,
    pub tax_id: Option<String>,
    pub siret: Option<String>,
    pub registration_number: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub website: Option<String>,
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,
    pub logo_url: Option<String>,
    pub logo_data: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub accent_color: Option<String>,
    pub business_settings: Option<String>,
    pub invoice_settings: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct OnboardingStatus {
    pub completed: bool,
    pub current_step: i32,
    pub has_organization: bool,
    pub has_admin_user: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct OnboardingData {
    pub organization: CreateOrganizationRequest,
}

impl OnboardingData {
    pub fn validate(&self) -> Result<(), String> {
        self.organization.validate()?;
        Ok(())
    }
}

fn is_valid_email(email: &str) -> bool {
    let email_regex = regex::Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        .unwrap_or_else(|_| regex::Regex::new(r".+@.+\..+").expect("fallback email regex"));
    email_regex.is_match(email)
        && !email.contains("..")
        && !email.starts_with('.')
        && !email.ends_with('.')
        && email.len() <= 254
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct OrganizationSetting {
    pub key: String,
    pub value: String,
    pub category: String,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
}

impl FromSqlRow for OrganizationSetting {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(OrganizationSetting {
            key: row.get("key")?,
            value: row.get("value")?,
            category: row.get("category")?,
            updated_at: row.get::<_, i64>("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Default)]
pub struct OrganizationSettings {
    pub system: SystemSettings,
    pub tasks: TaskSettings,
    pub security: OrgSecuritySettings,
    pub regional: RegionalSettings,
    pub invoicing: InvoicingSettings,
    pub business: BusinessSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SystemSettings {
    pub onboarding_completed: bool,
    pub onboarding_step: i32,
}

impl Default for SystemSettings {
    fn default() -> Self {
        Self {
            onboarding_completed: false,
            onboarding_step: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TaskSettings {
    pub default_task_priority: String,
}

impl Default for TaskSettings {
    fn default() -> Self {
        Self {
            default_task_priority: "medium".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct OrgSecuritySettings {
    pub default_session_timeout: i32,
    pub require_2fa: bool,
}

impl Default for OrgSecuritySettings {
    fn default() -> Self {
        Self {
            default_session_timeout: 480,
            require_2fa: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct RegionalSettings {
    pub date_format: String,
    pub time_format: String,
    pub currency: String,
    pub language: String,
    pub timezone: String,
}

impl Default for RegionalSettings {
    fn default() -> Self {
        Self {
            date_format: "DD/MM/YYYY".to_string(),
            time_format: "24h".to_string(),
            currency: "EUR".to_string(),
            language: "fr".to_string(),
            timezone: "Europe/Paris".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct InvoicingSettings {
    pub invoice_prefix: String,
    pub invoice_next_number: i32,
    pub quote_prefix: String,
    pub quote_next_number: i32,
    pub quote_validity_days: i32,
    pub payment_terms: i32,
}

impl Default for InvoicingSettings {
    fn default() -> Self {
        Self {
            invoice_prefix: "INV-".to_string(),
            invoice_next_number: 1,
            quote_prefix: "QT-".to_string(),
            quote_next_number: 1,
            quote_validity_days: 30,
            payment_terms: 30,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct BusinessSettings {
    pub business_hours_start: String,
    pub business_hours_end: String,
    pub business_days: Vec<String>,
}

impl Default for BusinessSettings {
    fn default() -> Self {
        Self {
            business_hours_start: "08:00".to_string(),
            business_hours_end: "18:00".to_string(),
            business_days: vec![
                "1".to_string(),
                "2".to_string(),
                "3".to_string(),
                "4".to_string(),
                "5".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UpdateOrganizationSettingsRequest {
    pub settings: std::collections::HashMap<String, String>,
}

// ── Other Models ─────────────────────────────────────────────────────

/// Data consent for GDPR compliance
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DataConsent {
    pub user_id: String,
    pub analytics_consent: bool,
    pub marketing_consent: bool,
    pub third_party_sharing: bool,
    pub data_retention_period: u32,
    #[ts(type = "string")]
    pub consent_given_at: chrono::DateTime<chrono::Utc>,
    pub consent_version: String,
}

// ── Default Accessors ────────────────────────────────────────────────

pub fn default_profile() -> UserProfileSettings {
    UserProfileSettings::default()
}

pub fn default_preferences() -> UserPreferences {
    UserPreferences::default()
}

pub fn default_security() -> UserSecuritySettings {
    UserSecuritySettings::default()
}

pub fn default_performance() -> UserPerformanceSettings {
    UserPerformanceSettings::default()
}

pub fn default_accessibility() -> UserAccessibilitySettings {
    UserAccessibilitySettings::default()
}

pub fn default_notifications() -> UserNotificationSettings {
    UserNotificationSettings::default()
}

pub fn default_user_settings() -> UserSettings {
    UserSettings::default()
}
