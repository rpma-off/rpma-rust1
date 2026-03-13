//! Settings repository for global application settings.

/// ADR-005: Repository Pattern
use crate::shared::ipc::errors::AppError;
use crate::domains::settings::models::{
    AppSettings, GeneralSettings, SecuritySettings, NotificationSettings,
    AppearanceSettings, DataManagementSettings, StorageSettings,
};
use rusqlite::params;
use std::sync::Arc;
use tracing::{error, info};

/// Repository for global application settings.
#[derive(Clone, Debug)]
pub struct SettingsRepository {
    db: Arc<crate::db::Database>,
}

impl SettingsRepository {
    pub fn new(db: Arc<crate::db::Database>) -> Self {
        Self { db }
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    fn json_col_to<T: serde::de::DeserializeOwned>(raw: &str, col: &str) -> Result<T, AppError> {
        serde_json::from_str(raw).map_err(|e| {
            error!("Failed to deserialize app_settings.{}: {}", col, e);
            AppError::Database(format!("Corrupted app_settings column '{}'", col))
        })
    }

    fn to_json_str<T: serde::Serialize>(value: &T, col: &str) -> Result<String, AppError> {
        serde_json::to_string(value).map_err(|e| {
            error!("Failed to serialize app_settings.{}: {}", col, e);
            AppError::Database(format!("Serialization error for '{}'", col))
        })
    }

    // ── read ─────────────────────────────────────────────────────────────────

    /// Load the global `AppSettings` from the database.
    pub fn get_app_settings_db(&self) -> Result<AppSettings, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("DB connection failed: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let result: Result<(String, String, String, String, String, String,
                             String, String, String, String, String), _> = conn.query_row(
            "SELECT general_settings, security_settings, notifications_settings,
                    appearance_settings, data_management_settings, storage_settings,
                    business_rules, security_policies, integrations,
                    performance_configs, business_hours
             FROM app_settings WHERE id = 'global'",
            [],
            |row| Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, String>(8)?,
                row.get::<_, String>(9)?,
                row.get::<_, String>(10)?,
            )),
        );

        match result {
            Ok((gen, sec, notif, appear, dm, stor, br, sp, int, pc, bh)) => {
                Ok(AppSettings {
                    general:          Self::json_col_to::<GeneralSettings>(&gen, "general_settings")
                                        .unwrap_or_default(),
                    security:         Self::json_col_to::<SecuritySettings>(&sec, "security_settings")
                                        .unwrap_or_default(),
                    notifications:    Self::json_col_to::<NotificationSettings>(&notif, "notifications_settings")
                                        .unwrap_or_default(),
                    appearance:       Self::json_col_to::<AppearanceSettings>(&appear, "appearance_settings")
                                        .unwrap_or_default(),
                    data_management:  Self::json_col_to::<DataManagementSettings>(&dm, "data_management_settings")
                                        .unwrap_or_default(),
                    storage:          Self::json_col_to::<StorageSettings>(&stor, "storage_settings")
                                        .unwrap_or_default(),
                    business_rules:   Self::json_col_to::<Vec<serde_json::Value>>(&br, "business_rules")
                                        .unwrap_or_default(),
                    security_policies: Self::json_col_to::<Vec<serde_json::Value>>(&sp, "security_policies")
                                        .unwrap_or_default(),
                    integrations:     Self::json_col_to::<Vec<serde_json::Value>>(&int, "integrations")
                                        .unwrap_or_default(),
                    performance_configs: Self::json_col_to::<Vec<serde_json::Value>>(&pc, "performance_configs")
                                        .unwrap_or_default(),
                    business_hours:   serde_json::from_str(&bh)
                                        .unwrap_or(serde_json::Value::Object(serde_json::Map::new())),
                })
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                let defaults = AppSettings::default();
                self.save_app_settings_db(&defaults, "system")?;
                Ok(defaults)
            }
            Err(e) => {
                error!("Failed to load app_settings: {}", e);
                Err(AppError::Database("Failed to load app settings".to_string()))
            }
        }
    }

    // ── write (full) ──────────────────────────────────────────────────────────

    /// Persist all `AppSettings` fields to the database.
    pub fn save_app_settings_db(&self, settings: &AppSettings, user_id: &str) -> Result<(), AppError> {
        let mut conn = self.db.get_connection().map_err(|e| {
            error!("DB connection failed: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let tx = conn.transaction().map_err(|e| {
            error!("Failed to start transaction: {}", e);
            AppError::Database("Failed to start transaction".to_string())
        })?;

        let general   = Self::to_json_str(&settings.general,         "general_settings")?;
        let security  = Self::to_json_str(&settings.security,        "security_settings")?;
        let notif     = Self::to_json_str(&settings.notifications,   "notifications_settings")?;
        let appear    = Self::to_json_str(&settings.appearance,      "appearance_settings")?;
        let dm        = Self::to_json_str(&settings.data_management, "data_management_settings")?;
        let stor      = Self::to_json_str(&settings.storage,         "storage_settings")?;
        let br        = Self::to_json_str(&settings.business_rules,  "business_rules")?;
        let sp        = Self::to_json_str(&settings.security_policies, "security_policies")?;
        let int       = Self::to_json_str(&settings.integrations,    "integrations")?;
        let pc        = Self::to_json_str(&settings.performance_configs, "performance_configs")?;
        let bh        = Self::to_json_str(&settings.business_hours,  "business_hours")?;
        let now       = chrono::Utc::now().timestamp();

        tx.execute(
            "INSERT INTO app_settings
                (id, general_settings, security_settings, notifications_settings,
                 appearance_settings, data_management_settings, storage_settings,
                 business_rules, security_policies, integrations,
                 performance_configs, business_hours, updated_at, updated_by)
             VALUES ('global', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                general_settings         = excluded.general_settings,
                security_settings        = excluded.security_settings,
                notifications_settings   = excluded.notifications_settings,
                appearance_settings      = excluded.appearance_settings,
                data_management_settings = excluded.data_management_settings,
                storage_settings         = excluded.storage_settings,
                business_rules           = excluded.business_rules,
                security_policies        = excluded.security_policies,
                integrations             = excluded.integrations,
                performance_configs      = excluded.performance_configs,
                business_hours           = excluded.business_hours,
                updated_at               = excluded.updated_at,
                updated_by               = excluded.updated_by",
            params![general, security, notif, appear, dm, stor, br, sp, int, pc, bh, now, user_id],
        ).map_err(|e| {
            error!("Failed to save app_settings: {}", e);
            AppError::Database("Failed to save app settings".to_string())
        })?;

        self.log_settings_change(&tx, user_id, "app_settings", "full update");

        tx.commit().map_err(|e| {
            error!("Failed to commit app_settings save: {}", e);
            AppError::Database("Failed to commit transaction".to_string())
        })?;

        info!("app_settings saved by user_id={}", user_id);
        Ok(())
    }

    // ── granular writes ───────────────────────────────────────────────────────

    pub fn update_general_settings_db(&self, s: &GeneralSettings, user_id: &str) -> Result<(), AppError> {
        self.update_app_settings_column(
            "general_settings",
            &Self::to_json_str(s, "general_settings")?,
            user_id,
        )
    }

    pub fn update_business_rules_db(&self, rules: &[serde_json::Value], user_id: &str) -> Result<(), AppError> {
        self.update_app_settings_column(
            "business_rules",
            &Self::to_json_str(&rules, "business_rules")?,
            user_id,
        )
    }

    pub fn update_security_policies_db(&self, policies: &[serde_json::Value], user_id: &str) -> Result<(), AppError> {
        self.update_app_settings_column(
            "security_policies",
            &Self::to_json_str(&policies, "security_policies")?,
            user_id,
        )
    }

    pub fn update_integrations_db(&self, integrations: &[serde_json::Value], user_id: &str) -> Result<(), AppError> {
        self.update_app_settings_column(
            "integrations",
            &Self::to_json_str(&integrations, "integrations")?,
            user_id,
        )
    }

    pub fn update_performance_configs_db(&self, configs: &[serde_json::Value], user_id: &str) -> Result<(), AppError> {
        self.update_app_settings_column(
            "performance_configs",
            &Self::to_json_str(&configs, "performance_configs")?,
            user_id,
        )
    }

    pub fn update_business_hours_db(&self, hours: &serde_json::Value, user_id: &str) -> Result<(), AppError> {
        self.update_app_settings_column(
            "business_hours",
            &Self::to_json_str(hours, "business_hours")?,
            user_id,
        )
    }

    pub fn get_max_tasks_per_user(&self) -> Result<i32, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let result: Result<i32, _> = conn.query_row(
            "SELECT value FROM application_settings WHERE key = 'max_tasks_per_user'",
            [],
            |row| row.get(0),
        );

        match result {
            Ok(value) => Ok(value),
            Err(_) => Ok(10),
        }
    }

    // ── internal helpers ───────────────────────────────────────────────────────

    fn update_app_settings_column(&self, col_name: &'static str, json_value: &str, user_id: &str) -> Result<(), AppError> {
        let mut conn = self.db.get_connection().map_err(|e| {
            error!("DB connection failed: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;

        let tx = conn.transaction().map_err(|e| {
            error!("Failed to start transaction: {}", e);
            AppError::Database("Failed to start transaction".to_string())
        })?;

        let now = chrono::Utc::now().timestamp();
        let sql = format!(
            "UPDATE app_settings SET {} = ?, updated_at = ?, updated_by = ? WHERE id = 'global'",
            col_name
        );

        let rows = tx.execute(&sql, params![json_value, now, user_id]).map_err(|e| {
            error!("Failed to update app_settings.{}: {}", col_name, e);
            AppError::Database(format!("Failed to update {}", col_name))
        })?;

        if rows == 0 {
            let defaults = AppSettings::default();
            drop(tx);
            self.save_app_settings_db(&defaults, user_id)?;
            return self.update_app_settings_column(col_name, json_value, user_id);
        }

        self.log_settings_change(&tx, user_id, "app_settings", &format!("updated {}", col_name));

        tx.commit().map_err(|e| {
            error!("Failed to commit update for app_settings.{}: {}", col_name, e);
            AppError::Database("Failed to commit transaction".to_string())
        })?;

        info!("app_settings.{} updated by user_id={}", col_name, user_id);
        Ok(())
    }

    fn log_settings_change(
        &self,
        tx: &rusqlite::Transaction,
        user_id: &str,
        setting_type: &str,
        details: &str,
    ) {
        let id = crate::shared::utils::uuid::generate_uuid_string();
        let timestamp = chrono::Utc::now().timestamp_millis();

        if let Err(e) = tx.execute(
            "INSERT INTO settings_audit_log (id, user_id, setting_type, details, timestamp) VALUES (?, ?, ?, ?, ?)",
            params![id, user_id, setting_type, details, timestamp],
        ) {
            error!("Failed to log settings change for user {}: {}", user_id, e);
        }
    }
}
