//! Organization settings models

use rusqlite::Row;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct OrganizationSetting {
    pub key: String,
    pub value: String,
    pub category: String,
    #[serde(serialize_with = "crate::shared::contracts::common::serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
}

impl crate::db::FromSqlRow for OrganizationSetting {
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
    pub security: SecuritySettings,
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
#[ts(rename = "OrgSecuritySettings")]
pub struct SecuritySettings {
    pub default_session_timeout: i32,
    pub require_2fa: bool,
}

impl Default for SecuritySettings {
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
