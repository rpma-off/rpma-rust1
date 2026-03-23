//! Clients domain — core models and value objects.

use crate::shared::contracts::common::{serialize_optional_timestamp, serialize_timestamp};
use crate::shared::services::cross_domain::PaginationInfo;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

// ── Enums ─────────────────────────────────────────────────────────────────────

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

// ── Core Entities ─────────────────────────────────────────────────────────────

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

// ── Query / Request / Response DTOs ──────────────────────────────────────────

/// Client query parameters for listing and filtering
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientQuery {
    pub pagination: crate::shared::repositories::base::PaginationParams,
    pub search: Option<String>,
    pub customer_type: Option<CustomerType>,
}

impl Default for ClientQuery {
    fn default() -> Self {
        Self {
            pagination: crate::shared::repositories::base::PaginationParams {
                page: Some(1),
                page_size: Some(20),
                sort_by: Some("created_at".to_string()),
                sort_order: Some("desc".to_string()),
            },
            search: None,
            customer_type: None,
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

// ── Analytics models ──────────────────────────────────────────────────────────

/// Overall client statistics (from analytics service)
#[derive(Debug, Serialize, Deserialize)]
pub struct ClientOverviewStats {
    pub total_clients: i32,
    pub active_clients: i32,
    pub inactive_clients: i32,
    pub new_clients_this_month: i32,
    pub clients_by_type: HashMap<String, i32>,
}

/// Activity metrics for a specific client
#[derive(Debug, Serialize, Deserialize)]
pub struct ClientActivityMetrics {
    pub client_id: String,
    pub total_tasks: i32,
    pub completed_tasks: i32,
    pub active_tasks: i32,
    pub completion_rate: f64,
    pub average_task_duration: Option<f64>,
    pub last_activity_date: Option<i64>,
    pub total_revenue: Option<f64>,
}

// ── Repository query ──────────────────────────────────────────────────────────

/// Internal query struct for repository filtering
#[derive(Debug, Clone, Default)]
pub struct ClientRepoQuery {
    pub search: Option<String>,
    pub customer_type: Option<CustomerType>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub city: Option<String>,
    pub tags: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl ClientRepoQuery {
    pub(crate) fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["deleted_at IS NULL".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();
        if let Some(search) = &self.search {
            conditions.push(
                "(name LIKE ? OR email LIKE ? OR phone LIKE ? OR company_name LIKE ? OR contact_person LIKE ?)"
                    .to_string(),
            );
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
        }
        if let Some(customer_type) = &self.customer_type {
            conditions.push("customer_type = ?".to_string());
            params.push(customer_type.to_string().into());
        }
        if let Some(email) = &self.email {
            conditions.push("email = ?".to_string());
            params.push(email.clone().into());
        }
        if let Some(phone) = &self.phone {
            conditions.push("phone = ?".to_string());
            params.push(phone.clone().into());
        }
        if let Some(city) = &self.city {
            conditions.push("address_city = ?".to_string());
            params.push(city.clone().into());
        }
        if let Some(tags) = &self.tags {
            conditions.push("tags LIKE ?".to_string());
            params.push(format!("%{}%", tags).into());
        }
        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };
        (where_clause, params)
    }

    pub(crate) fn validate_sort_column(sort_by: &str) -> Result<String, crate::shared::repositories::base::RepoError> {
        crate::shared::repositories::base::validate_sort_column(
            sort_by,
            &[
                "created_at",
                "updated_at",
                "name",
                "email",
                "phone",
                "customer_type",
                "city",
                "total_tasks",
                "active_tasks",
                "completed_tasks",
            ],
        )
    }

    pub(crate) fn build_order_by_clause(&self) -> Result<String, crate::shared::repositories::base::RepoError> {
        let sort_by = Self::validate_sort_column(self.sort_by.as_deref().unwrap_or("created_at"))?;
        let sort_order = match self.sort_order.as_deref() {
            Some(order) if order.eq_ignore_ascii_case("asc") => "ASC",
            Some(order) if order.eq_ignore_ascii_case("desc") => "DESC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    pub(crate) fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}

// ── Validation helpers ────────────────────────────────────────────────────────
// Row-mapping (FromSqlRow impl) lives in infrastructure/client_row_mapping.rs (ADR-001).

pub(crate) fn is_valid_email(email: &str) -> bool {
    let Ok(email_regex) = regex::Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    else {
        return false;
    };
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
