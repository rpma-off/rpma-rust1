//! Clients domain — domain models, re-exports, and sub-module declarations.

// ── Imports ───────────────────────────────────────────────────────────────────

use crate::db::FromSqlRow;
use crate::shared::contracts::common::{serialize_optional_timestamp, serialize_timestamp};
use crate::shared::services::cross_domain::{PaginationInfo, SortOrder};
use chrono;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use ts_rs::TS;

// ── Sub-modules ───────────────────────────────────────────────────────────────

pub mod ipc;
pub mod repository;
pub mod service;
pub mod statistics;
pub mod validation;

// ── Re-exports ────────────────────────────────────────────────────────────────

pub use ipc::*;
pub use repository::*;
pub use service::*;
pub use statistics::*;
pub use validation::*;

// ── Domain Models ─────────────────────────────────────────────────────────────

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
#[ts(rename = "Client")]
pub struct ClientModel {
    pub id: String,
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
    pub total_tasks: i32,
    pub active_tasks: i32,
    pub completed_tasks: i32,
    pub last_task_date: Option<String>,
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

/// Type alias for the canonical client entity (used by cross-domain re-exports).
pub type Client = ClientModel;

/// Client with associated tasks (TS-exported)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientWithTasks {
    pub id: String,
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
    pub total_tasks: i32,
    pub active_tasks: i32,
    pub completed_tasks: i32,
    pub last_task_date: Option<String>,
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
    pub tasks: Option<Vec<crate::shared::services::cross_domain::Task>>,
}

/// Client query parameters for listing and filtering
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub search: Option<String>,
    pub customer_type: Option<CustomerType>,
    pub sort_by: Option<String>,
    pub sort_order: Option<SortOrder>,
}

impl Default for ClientQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            limit: Some(20),
            search: None,
            customer_type: None,
            sort_by: Some("created_at".to_string()),
            sort_order: Some(SortOrder::Desc),
        }
    }
}

/// Client list response with pagination
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientListResponse {
    pub data: Vec<Client>,
    pub pagination: PaginationInfo,
    pub statistics: Option<ClientStatistics>,
}

/// Client statistics (TS-exported, used in IPC responses)
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
        if let Some(ref phone) = self.phone {
            if !is_valid_phone(phone) {
                return Err("Invalid phone number format".to_string());
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

pub(crate) fn get_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<i64> {
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

pub(crate) fn get_optional_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<Option<i64>> {
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

pub(crate) fn is_valid_email(email: &str) -> bool {
    let email_regex = regex::Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        .unwrap_or_else(|_| regex::Regex::new(r".+@.+\..+").expect("fallback email regex"));
    email_regex.is_match(email)
        && !email.contains("..")
        && !email.starts_with('.')
        && !email.ends_with('.')
        && email.len() <= 254
}

pub(crate) fn is_valid_phone(phone: &str) -> bool {
    let digits_only: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
    (7..=20).contains(&digits_only.len())
}

// Suppress unused import warning — `Arc` is used by sub-modules via `super::`.
#[allow(unused_imports)]
use std::sync::Arc as _Arc;
