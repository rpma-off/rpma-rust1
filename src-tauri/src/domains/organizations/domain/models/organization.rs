//! Organization domain models with ts-rs exports

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
    pub admin_email: String,
    pub admin_password: String,
    pub admin_first_name: String,
    pub admin_last_name: String,
}

impl OnboardingData {
    pub fn validate(&self) -> Result<(), String> {
        self.organization.validate()?;
        if self.admin_email.trim().is_empty() {
            return Err("Admin email is required".to_string());
        }
        if !is_valid_email(&self.admin_email) {
            return Err("Invalid admin email format".to_string());
        }
        if self.admin_password.len() < 8 {
            return Err("Password must be at least 8 characters".to_string());
        }
        if self.admin_first_name.trim().is_empty() {
            return Err("Admin first name is required".to_string());
        }
        if self.admin_last_name.trim().is_empty() {
            return Err("Admin last name is required".to_string());
        }
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
