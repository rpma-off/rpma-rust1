//! Client Queries Service - Query and search operations for clients
//!
//! This service handles all client query operations including:
//! - Listing clients with filters and pagination
//! - Full-text search across client data
//! - Advanced filtering by customer type, date ranges, etc.
//! - Sorting and ordering capabilities

use crate::db::Database;
use crate::domains::clients::domain::models::client::{Client, ClientListResponse, ClientQuery};
use rusqlite::params;
use std::sync::Arc;

/// Service for client query operations
#[derive(Debug)]
pub struct ClientQueriesService {
    db: Arc<Database>,
}

impl ClientQueriesService {
    /// Create a new ClientQueriesService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get clients with advanced filtering, sorting, and pagination
    pub fn get_clients(&self, query: ClientQuery) -> Result<ClientListResponse, String> {
        let mut sql = r#"
            SELECT
                c.id, c.name, c.email, c.phone, c.customer_type, c.address_street, c.address_city,
                c.address_state, c.address_zip, c.address_country, c.tax_id, c.company_name,
                c.contact_person, c.notes, c.tags,
                COALESCE(cs.total_tasks, 0) as total_tasks,
                COALESCE(cs.active_tasks, 0) as active_tasks,
                COALESCE(cs.completed_tasks, 0) as completed_tasks,
                cs.last_task_date,
                c.created_at, c.updated_at, c.created_by, c.deleted_at,
                c.deleted_by, c.synced, c.last_synced_at
            FROM clients c
            LEFT JOIN client_statistics cs ON c.id = cs.id
            WHERE c.deleted_at IS NULL
        "#
        .to_string();

        let mut params_vec = Vec::new();

        // Add filters
        if let Some(customer_type) = &query.customer_type {
            sql.push_str(" AND customer_type = ?");
            params_vec.push(match customer_type {
                crate::domains::clients::domain::models::client::CustomerType::Individual => {
                    "individual".to_string()
                }
                crate::domains::clients::domain::models::client::CustomerType::Business => {
                    "business".to_string()
                }
            });
        }

        // Search functionality using FTS
        if let Some(search) = &query.search {
            sql.push_str(
                " AND c.rowid IN (SELECT rowid FROM clients_fts WHERE clients_fts MATCH ?)",
            );
            params_vec.push(search.clone());
        }

        // Sorting with SQL injection protection
        let valid_sort_columns = [
            "name",
            "email",
            "created_at",
            "updated_at",
            "total_tasks",
            "active_tasks",
            "completed_tasks",
            "customer_type",
        ];
        let default_sort = "created_at".to_string();
        let sort_by = query.sort_by.as_ref().unwrap_or(&default_sort);
        let sort_by_validated = if valid_sort_columns.contains(&sort_by.as_str()) {
            sort_by.clone()
        } else {
            "created_at".to_string()
        };

        let sort_order = match query
            .sort_order
            .unwrap_or(crate::shared::services::cross_domain::SortOrder::Desc)
        {
            crate::shared::services::cross_domain::SortOrder::Asc => "ASC",
            crate::shared::services::cross_domain::SortOrder::Desc => "DESC",
        };

        sql.push_str(&format!(" ORDER BY {} {}", sort_by_validated, sort_order));

        // Pagination
        let page = query.page.unwrap_or(1).max(1);
        let limit = query.limit.unwrap_or(50).min(200).max(1);
        let offset = (page - 1) * limit;

        sql.push_str(" LIMIT ? OFFSET ?");
        params_vec.push(limit.to_string());
        params_vec.push(offset.to_string());

        // Convert params to rusqlite format
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        let clients = self
            .db
            .as_ref()
            .query_as::<Client>(&sql, params_refs.as_slice())
            .map_err(|e| format!("Failed to query clients: {}", e))?;

        // Get total count for pagination
        let mut count_sql = r#"
            SELECT COUNT(*)
            FROM clients c
            WHERE c.deleted_at IS NULL
        "#
        .to_string();

        let mut count_params = Vec::new();

        if let Some(customer_type) = &query.customer_type {
            count_sql.push_str(" AND customer_type = ?");
            count_params.push(match customer_type {
                crate::domains::clients::domain::models::client::CustomerType::Individual => {
                    "individual".to_string()
                }
                crate::domains::clients::domain::models::client::CustomerType::Business => {
                    "business".to_string()
                }
            });
        }

        if let Some(search) = &query.search {
            count_sql.push_str(
                " AND c.rowid IN (SELECT rowid FROM clients_fts WHERE clients_fts MATCH ?)",
            );
            count_params.push(search.clone());
        }

        let count_params_refs: Vec<&dyn rusqlite::ToSql> = count_params
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        let total: i64 = self
            .db
            .as_ref()
            .get_connection()?
            .query_row(&count_sql, count_params_refs.as_slice(), |row| row.get(0))
            .map_err(|e| format!("Failed to count clients: {}", e))?;

        let total_pages = ((total as f64) / (limit as f64)).ceil() as i32;
        let pagination = crate::shared::services::cross_domain::PaginationInfo {
            page,
            limit,
            total,
            total_pages,
        };

        Ok(ClientListResponse {
            data: clients,
            pagination,
            statistics: None, // TODO: Add client statistics
        })
    }

    /// Search clients using full-text search
    pub fn search_clients(
        &self,
        query: &str,
        page: i32,
        limit: i32,
    ) -> Result<Vec<Client>, String> {
        let sql = r#"
            SELECT
                c.id, c.name, c.email, c.phone, c.customer_type, c.address_street, c.address_city,
                c.address_state, c.address_zip, c.address_country, c.tax_id, c.company_name,
                c.contact_person, c.notes, c.tags, c.total_tasks, c.active_tasks, c.completed_tasks,
                c.last_task_date, c.created_at, c.updated_at, c.created_by, c.deleted_at,
                c.deleted_by, c.synced, c.last_synced_at
            FROM clients c
            INNER JOIN clients_fts fts ON c.rowid = fts.rowid
            WHERE fts MATCH ? AND c.deleted_at IS NULL
            ORDER BY fts.rank
            LIMIT ? OFFSET ?
        "#;

        let offset = (page - 1) * limit;
        self.db
            .as_ref()
            .query_as::<Client>(sql, params![query, limit, offset])
            .map_err(|e| format!("Failed to search clients: {}", e))
    }

    /// Get clients by customer type
    pub fn get_clients_by_type(
        &self,
        customer_type: crate::domains::clients::domain::models::client::CustomerType,
    ) -> Result<Vec<Client>, String> {
        let sql = r#"
            SELECT
                c.id, c.name, c.email, c.phone, c.customer_type, c.address_street, c.address_city,
                c.address_state, c.address_zip, c.address_country, c.tax_id, c.company_name,
                c.contact_person, c.notes, c.tags, c.total_tasks, c.active_tasks, c.completed_tasks,
                c.last_task_date, c.created_at, c.updated_at, c.created_by, c.deleted_at,
                c.deleted_by, c.synced, c.last_synced_at
            FROM clients c
            WHERE c.customer_type = ? AND c.deleted_at IS NULL
            ORDER BY c.created_at DESC
        "#;

        let customer_type_str = match customer_type {
            crate::domains::clients::domain::models::client::CustomerType::Individual => {
                "individual"
            }
            crate::domains::clients::domain::models::client::CustomerType::Business => "business",
        };

        self.db
            .as_ref()
            .query_as::<Client>(sql, params![customer_type_str])
            .map_err(|e| format!("Failed to get clients by type: {}", e))
    }

    /// Get recently active clients (with tasks in last N days)
    pub fn get_recently_active_clients(&self, days: i32) -> Result<Vec<Client>, String> {
        let cutoff_timestamp =
            chrono::Utc::now().timestamp_millis() - (days as i64 * 24 * 60 * 60 * 1000);

        let sql = r#"
            SELECT
                c.id, c.name, c.email, c.phone, c.customer_type, c.address_street, c.address_city,
                c.address_state, c.address_zip, c.address_country, c.tax_id, c.company_name,
                c.contact_person, c.notes, c.tags, c.total_tasks, c.active_tasks, c.completed_tasks,
                c.last_task_date, c.created_at, c.updated_at, c.created_by, c.deleted_at,
                c.deleted_by, c.synced, c.last_synced_at
            FROM clients c
            WHERE c.last_task_date >= ? AND c.deleted_at IS NULL
            ORDER BY c.last_task_date DESC
        "#;

        self.db
            .as_ref()
            .query_as::<Client>(sql, params![cutoff_timestamp])
            .map_err(|e| format!("Failed to get recently active clients: {}", e))
    }
}
