use crate::db::FromSqlRow;
use crate::shared::contracts::common::serialize_timestamp;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

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
    regex::Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        .or_else(|_| regex::Regex::new(r".+@.+\..+"))
        .map(|re| re.is_match(email))
        .unwrap_or(false)
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
