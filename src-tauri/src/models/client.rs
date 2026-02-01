//! Client model

use crate::db::FromSqlRow;
use crate::models::common::{serialize_optional_timestamp, serialize_timestamp};

use rusqlite::Row;
use serde::{Deserialize, Serialize};
#[cfg(any(feature = "specta", feature = "ts-rs"))]
use ts_rs::TS;

/// Customer type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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
    #[cfg_attr(feature = "ts-rs", ts(type = "string"))]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string"))]
    pub updated_at: i64,
    pub created_by: Option<String>,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string | null"))]
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string | null"))]
    pub last_synced_at: Option<i64>,
}

/// Client with associated tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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
    #[cfg_attr(feature = "ts-rs", ts(type = "string"))]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string"))]
    pub updated_at: i64,
    pub created_by: Option<String>,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string | null"))]
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string | null"))]
    pub last_synced_at: Option<i64>,

    // Associated tasks
    pub tasks: Option<Vec<super::task::Task>>,
}

/// Conversion implementations for database operations
/// Client query parameters for listing and filtering
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct ClientQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub search: Option<String>,
    pub customer_type: Option<CustomerType>,
    pub sort_by: Option<String>,
    pub sort_order: Option<super::task::SortOrder>,
}

impl Default for ClientQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            limit: Some(20),
            search: None,
            customer_type: None,
            sort_by: Some("created_at".to_string()),
            sort_order: Some(super::task::SortOrder::Desc),
        }
    }
}

/// Client list response with pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct ClientListResponse {
    pub data: Vec<Client>,
    pub pagination: super::task::PaginationInfo,
    pub statistics: Option<ClientStatistics>,
}

/// Client statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct ClientStatistics {
    pub total_clients: i64,
    pub individual_clients: i64,
    pub business_clients: i64,
    pub clients_with_tasks: i64,
    pub new_clients_this_month: i64,
}

/// Create client request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            created_by: row.get("created_by")?,
            deleted_at: row.get("deleted_at")?,
            deleted_by: row.get("deleted_by")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
        })
    }
}

/// Simple email validation
fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.contains('.') && email.len() >= 5
}
