//! Client repository — trait and query builder.
//!
//! The concrete SQL implementation lives in the infrastructure layer:
//! `crate::domains::clients::infrastructure::client_repository::SqliteClientRepository`.

use super::{Client, ClientOverviewStats, CustomerType};
use crate::shared::repositories::base::{RepoError, RepoResult};
use async_trait::async_trait;

// ── Repository query ──────────────────────────────────────────────────────────

/// Internal query struct for repository filtering (distinct from domain ClientQuery)
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
    /// Build the `WHERE` clause and its bind parameters for a filtered query.
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

    pub(crate) fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
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

    pub(crate) fn build_order_by_clause(&self) -> Result<String, RepoError> {
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

// ── Repository trait ──────────────────────────────────────────────────────────

/// Client repository trait for database operations (ADR-005)
#[async_trait]
pub trait IClientRepository: Send + Sync + std::fmt::Debug {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Client>>;
    async fn find_all(&self) -> RepoResult<Vec<Client>>;
    async fn save(&self, entity: Client) -> RepoResult<Client>;
    async fn delete_by_id(&self, id: String) -> RepoResult<bool>;
    async fn exists_by_id(&self, id: String) -> RepoResult<bool>;
    async fn find_by_email(&self, email: &str) -> RepoResult<Option<Client>>;
    async fn search(&self, query: ClientRepoQuery) -> RepoResult<Vec<Client>>;
    async fn count(&self, query: ClientRepoQuery) -> RepoResult<i64>;
    async fn update_statistics(&self, client_id: &str) -> RepoResult<()>;
    fn invalidate_all_cache(&self);
    async fn count_all(&self) -> RepoResult<i64>;
    async fn search_simple(
        &self,
        query: &str,
        limit: usize,
        offset: usize,
    ) -> RepoResult<Vec<Client>>;
    async fn count_active_tasks(&self, client_id: &str) -> RepoResult<i64>;
    async fn get_overview_stats(&self) -> RepoResult<ClientOverviewStats>;
}

// ── ClientRepository type alias ───────────────────────────────────────────────
//
// The concrete implementation lives in the infrastructure layer.
// This alias keeps every existing call-site (`ClientService`, statistics
// helpers, tests) compiling unchanged during the incremental migration.

/// Concrete client repository backed by SQLite.
///
/// The full implementation is in
/// `crate::domains::clients::infrastructure::client_repository::SqliteClientRepository`.
pub type ClientRepository =
    crate::domains::clients::infrastructure::client_repository::SqliteClientRepository;

