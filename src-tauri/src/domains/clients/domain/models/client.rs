//! Client model

use crate::db::FromSqlRow;
use crate::shared::contracts::common::{serialize_optional_timestamp, serialize_timestamp};

use rusqlite::Row;
use serde::{Deserialize, Serialize};
// Conditional import removed
use ts_rs::TS;

/// Customer type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, TS)]
pub enum CustomerType {
    #[serde(rename = "individual")]
    #[default]
    Individual,
    #[serde(rename = "business")]
    Business,
}

impl std::fmt::Display for CustomerType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Individual => "individual",
            Self::Business => "business",
        };
        write!(f, "{}", s)
    }
}

/// Main Client entity
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct Client {
    // Identifiers
    pub id: String,

    // Personal information
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,

    // Type
    pub customer_type: CustomerType,

    // Address
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,

    // Business info
    pub tax_id: Option<String>,
    pub company_name: Option<String>,
    pub contact_person: Option<String>,

    // Metadata
    pub notes: Option<String>,
    pub tags: Option<String>, // JSON array

    // Statistics (computed)
    pub total_tasks: i32,
    pub active_tasks: i32,
    pub completed_tasks: i32,
    pub last_task_date: Option<String>,

    // Audit
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
    pub created_by: Option<String>,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,
}

/// Client with associated tasks
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientWithTasks {
    // Identifiers
    pub id: String,

    // Personal information
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,

    // Type
    pub customer_type: CustomerType,

    // Address
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,

    // Business info
    pub tax_id: Option<String>,
    pub company_name: Option<String>,
    pub contact_person: Option<String>,

    // Metadata
    pub notes: Option<String>,
    pub tags: Option<String>, // JSON array

    // Statistics (computed)
    pub total_tasks: i32,
    pub active_tasks: i32,
    pub completed_tasks: i32,
    pub last_task_date: Option<String>,

    // Audit
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
    pub created_by: Option<String>,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,

    // Associated tasks
    pub tasks: Option<Vec<crate::shared::services::cross_domain::Task>>,
}

/// Conversion implementations for database operations
/// Client query parameters for listing and filtering
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub search: Option<String>,
    pub customer_type: Option<CustomerType>,
    pub sort_by: Option<String>,
    pub sort_order: Option<crate::shared::services::cross_domain::SortOrder>,
}

impl Default for ClientQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            limit: Some(20),
            search: None,
            customer_type: None,
            sort_by: Some("created_at".to_string()),
            sort_order: Some(crate::shared::services::cross_domain::SortOrder::Desc),
        }
    }
}

/// Client list response with pagination
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientListResponse {
    pub data: Vec<Client>,
    pub pagination: crate::shared::services::cross_domain::PaginationInfo,
    pub statistics: Option<ClientStatistics>,
}

/// Client statistics
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientStatistics {
    pub total_clients: i64,
    pub individual_clients: i64,
    pub business_clients: i64,
    pub clients_with_tasks: i64,
    pub new_clients_this_month: i64,
}

/// Create client request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateClientRequest {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub customer_type: CustomerType,
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,
    pub tax_id: Option<String>,
    pub company_name: Option<String>,
    pub contact_person: Option<String>,
    pub notes: Option<String>,
    pub tags: Option<String>,
}

impl CreateClientRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Name is required and cannot be empty".to_string());
        }

        if self.name.len() > 100 {
            return Err("Name must be 100 characters or less".to_string());
        }

        if let Some(ref email) = self.email {
            if !is_valid_email(email) {
                return Err("Invalid email format".to_string());
            }
        }

        if let Some(ref notes) = self.notes {
            if notes.len() > 1000 {
                return Err("Notes must be 1000 characters or less".to_string());
            }
        }

        Ok(())
    }
}

/// Update client request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UpdateClientRequest {
    pub id: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub customer_type: Option<CustomerType>,
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,
    pub tax_id: Option<String>,
    pub company_name: Option<String>,
    pub contact_person: Option<String>,
    pub notes: Option<String>,
    pub tags: Option<String>,
}

impl FromSqlRow for Client {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Client {
            id: row.get("id")?,
            name: row.get("name")?,
            email: row.get("email")?,
            phone: row.get("phone")?,
            customer_type: match row.get::<_, String>("customer_type")?.as_str() {
                "business" => CustomerType::Business,
                _ => CustomerType::Individual,
            },
            address_street: row.get("address_street")?,
            address_city: row.get("address_city")?,
            address_state: row.get("address_state")?,
            address_zip: row.get("address_zip")?,
            address_country: row.get("address_country")?,
            tax_id: row.get("tax_id")?,
            company_name: row.get("company_name")?,
            contact_person: row.get("contact_person")?,
            notes: row.get("notes")?,
            tags: row.get("tags")?,
            total_tasks: row.get("total_tasks")?,
            active_tasks: row.get("active_tasks")?,
            completed_tasks: row.get("completed_tasks")?,
            last_task_date: row.get("last_task_date")?,
            created_at: get_i64_from_row(row, "created_at")?,
            updated_at: get_i64_from_row(row, "updated_at")?,
            created_by: row.get("created_by")?,
            deleted_at: get_optional_i64_from_row(row, "deleted_at")?,
            deleted_by: row.get("deleted_by")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: get_optional_i64_from_row(row, "last_synced_at")?,
        })
    }
}

fn get_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<i64> {
    match row.get::<_, i64>(column) {
        Ok(value) => Ok(value),
        Err(_) => {
            let value: String = row.get(column)?;
            parse_timestamp_millis(&value).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    "Unable to parse timestamp".into(),
                )
            })
        }
    }
}

fn get_optional_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<Option<i64>> {
    match row.get::<_, Option<i64>>(column) {
        Ok(value) => Ok(value),
        Err(_) => {
            let value: Option<String> = row.get(column)?;
            match value {
                Some(v) => parse_timestamp_millis(&v).map(Some).ok_or_else(|| {
                    rusqlite::Error::FromSqlConversionFailure(
                        0,
                        rusqlite::types::Type::Text,
                        "Unable to parse timestamp".into(),
                    )
                }),
                None => Ok(None),
            }
        }
    }
}

fn parse_timestamp_millis(value: &str) -> Option<i64> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    if let Ok(v) = trimmed.parse::<i64>() {
        return Some(v);
    }

    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(trimmed) {
        return Some(dt.timestamp_millis());
    }

    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S") {
        return Some(dt.and_utc().timestamp_millis());
    }

    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S%.f") {
        return Some(dt.and_utc().timestamp_millis());
    }

    if let Ok(d) = chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        let dt = d.and_hms_opt(0, 0, 0)?;
        return Some(dt.and_utc().timestamp_millis());
    }

    None
}

/// Simple email validation
fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.contains('.') && email.len() >= 5
}
