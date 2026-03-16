//! Client repository — trait, concrete implementation, and query builder.

use super::{Client, ClientOverviewStats, CustomerType};
use crate::db::Database;
use crate::domains::tasks::domain::models::task::TaskStatus;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};
use async_trait::async_trait;
use chrono::{Datelike, Timelike, Utc};
use rusqlite::params;
use std::sync::Arc;

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
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
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

    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
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

    fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by =
            Self::validate_sort_column(self.sort_by.as_deref().unwrap_or("created_at"))?;
        let sort_order = match self.sort_order.as_deref() {
            Some(order) if order.eq_ignore_ascii_case("asc") => "ASC",
            Some(order) if order.eq_ignore_ascii_case("desc") => "DESC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}

// ── SQL constant ──────────────────────────────────────────────────────────────

pub(super) const CLIENT_SELECT: &str = r#"
    SELECT
        id, name, email, phone, customer_type,
        address_street, address_city, address_state, address_zip, address_country,
        tax_id, company_name, contact_person, notes, tags,
        total_tasks, active_tasks, completed_tasks, last_task_date,
        created_at, updated_at, created_by, deleted_at, deleted_by,
        synced, last_synced_at
    FROM clients
"#;

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

// ── Repository struct ─────────────────────────────────────────────────────────

/// Client repository for database operations
#[derive(Debug)]
pub struct ClientRepository {
    pub(super) db: Arc<Database>,
    pub(super) cache: Arc<Cache>,
    pub(super) cache_key_builder: CacheKeyBuilder,
}

impl ClientRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("client"),
        }
    }
}

#[async_trait]
impl IClientRepository for ClientRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Client>> {
        Repository::<Client, String>::find_by_id(self, id).await
    }

    async fn find_all(&self) -> RepoResult<Vec<Client>> {
        Repository::<Client, String>::find_all(self).await
    }

    async fn save(&self, entity: Client) -> RepoResult<Client> {
        Repository::<Client, String>::save(self, entity).await
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        Repository::<Client, String>::delete_by_id(self, id).await
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        Repository::<Client, String>::exists_by_id(self, id).await
    }

    async fn find_by_email(&self, email: &str) -> RepoResult<Option<Client>> {
        let cache_key = self.cache_key_builder.query(&["email", email]);
        if let Some(client) = self.cache.get::<Client>(&cache_key) {
            return Ok(Some(client));
        }
        let sql = format!("{} WHERE email = ? AND deleted_at IS NULL LIMIT 1", CLIENT_SELECT);
        let client = self
            .db
            .query_single_as::<Client>(&sql, params![email])
            .map_err(|e| RepoError::Database(format!("Failed to find client by email: {}", e)))?;
        if let Some(ref c) = client {
            self.cache.set::<Client>(&cache_key, c.clone(), ttl::MEDIUM);
        }
        Ok(client)
    }

    async fn search(&self, query: ClientRepoQuery) -> RepoResult<Vec<Client>> {
        let cache_key = self.cache_key_builder.query(&[&format!("{:?}", query)]);
        if let Some(clients) = self.cache.get::<Vec<Client>>(&cache_key) {
            return Ok(clients);
        }
        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_else(|e| {
            eprintln!("Invalid order clause, using default: {}", e);
            "ORDER BY created_at DESC".to_string()
        });
        let (limit, offset) = query.build_limit_offset().unwrap_or((50, None));
        let offset = offset.unwrap_or(0);
        let sql = format!(
            "SELECT id, name, email, phone, customer_type,
                address_street, address_city, address_state, address_zip, address_country,
                tax_id, company_name, contact_person, notes, tags,
                total_tasks, active_tasks, completed_tasks, last_task_date,
                created_at, updated_at, created_by, deleted_at, deleted_by,
                synced, last_synced_at
            FROM clients {} {} LIMIT ? OFFSET ?",
            where_clause, order_clause
        );
        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());
        params_vec.push(offset.into());
        let clients = self
            .db
            .query_as::<Client>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search clients: {}", e)))?;
        self.cache.set(&cache_key, clients.clone(), ttl::SHORT);
        Ok(clients)
    }

    async fn count(&self, query: ClientRepoQuery) -> RepoResult<i64> {
        let (where_clause, params) = query.build_where_clause();
        let sql = format!("SELECT COUNT(*) FROM clients {}", where_clause);
        let count: i64 = self
            .db
            .query_single_value(&sql, rusqlite::params_from_iter(params.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to count clients: {}", e)))?;
        Ok(count)
    }

    async fn update_statistics(&self, client_id: &str) -> RepoResult<()> {
        // SAFETY: format! uses only TaskStatus::to_string() values — no user input.
        let completed = TaskStatus::Completed.to_string();
        let cancelled = TaskStatus::Cancelled.to_string();
        let sql = format!(
            r#"UPDATE clients SET
                    total_tasks = (SELECT COUNT(*) FROM tasks WHERE client_id = ? AND deleted_at IS NULL),
                    active_tasks = (SELECT COUNT(*) FROM tasks WHERE client_id = ? AND status NOT IN ('{completed}', '{cancelled}') AND deleted_at IS NULL),
                    completed_tasks = (SELECT COUNT(*) FROM tasks WHERE client_id = ? AND status = '{completed}' AND deleted_at IS NULL),
                    last_task_date = (SELECT MAX(completed_at) FROM tasks WHERE client_id = ? AND deleted_at IS NULL),
                    updated_at = (unixepoch() * 1000)
                WHERE id = ?"#,
            completed = completed,
            cancelled = cancelled,
        );
        let _ = self
            .db
            .execute(
                &sql,
                params![client_id, client_id, client_id, client_id, client_id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to update client statistics: {}", e))
            })?;
        self.cache.remove(&self.cache_key_builder.id(client_id));
        Ok(())
    }

    fn invalidate_all_cache(&self) {
        self.cache.clear();
    }

    async fn count_all(&self) -> RepoResult<i64> {
        let cache_key = self.cache_key_builder.query(&["count_all"]);
        if let Some(count) = self.cache.get::<i64>(&cache_key) {
            return Ok(count);
        }
        let count = self
            .db
            .query_single_value::<i64>("SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL", [])
            .map_err(|e| RepoError::Database(format!("Failed to count clients: {}", e)))?;
        self.cache.set(&cache_key, count, ttl::MEDIUM);
        Ok(count)
    }

    async fn search_simple(
        &self,
        query: &str,
        limit: usize,
        offset: usize,
    ) -> RepoResult<Vec<Client>> {
        let cache_key = self.cache_key_builder.query(&[
            "search",
            query,
            &limit.to_string(),
            &offset.to_string(),
        ]);
        if let Some(clients) = self.cache.get::<Vec<Client>>(&cache_key) {
            return Ok(clients);
        }
        let clients = self
            .db
            .query_as::<Client>(
                "SELECT * FROM clients
                WHERE deleted_at IS NULL
                AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company_name LIKE ?)
                ORDER BY name ASC LIMIT ? OFFSET ?",
                params![
                    format!("%{}%", query),
                    format!("%{}%", query),
                    format!("%{}%", query),
                    format!("%{}%", query),
                    limit as i64,
                    offset as i64
                ],
            )
            .map_err(|e| RepoError::Database(format!("Failed to search clients: {}", e)))?;
        self.cache.set(&cache_key, clients.clone(), ttl::SHORT);
        Ok(clients)
    }

    async fn count_active_tasks(&self, client_id: &str) -> RepoResult<i64> {
        let count: i64 = self.db
            .query_single_value(
                "SELECT COUNT(*) FROM tasks WHERE client_id = ? AND status IN ('pending', 'in_progress') AND deleted_at IS NULL",
                params![client_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to check active tasks: {}", e)))?;
        Ok(count)
    }

    async fn get_overview_stats(&self) -> RepoResult<ClientOverviewStats> {
        let total_clients: i32 = self
            .db
            .query_single_value("SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL", [])
            .map_err(|e| RepoError::Database(format!("Failed to get total clients: {}", e)))?;
        let ninety_days_ago = Utc::now().timestamp_millis() - (90 * 24 * 60 * 60 * 1000);
        let active_clients: i32 = self
            .db
            .query_single_value(
                "SELECT COUNT(DISTINCT c.id) FROM clients c
                 INNER JOIN tasks t ON c.id = t.client_id
                 WHERE c.deleted_at IS NULL AND t.created_at >= ? AND t.deleted_at IS NULL",
                params![ninety_days_ago],
            )
            .map_err(|e| RepoError::Database(format!("Failed to get active clients: {}", e)))?;
        let inactive_clients = total_clients - active_clients;
        let start_of_month = Utc::now()
            .with_day(1)
            .and_then(|dt| dt.with_hour(0))
            .and_then(|dt| dt.with_minute(0))
            .and_then(|dt| dt.with_second(0))
            .ok_or_else(|| RepoError::Database("Failed to calculate start of month".to_string()))?
            .timestamp_millis();
        let new_clients_this_month: i32 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM clients WHERE created_at >= ? AND deleted_at IS NULL",
                params![start_of_month],
            )
            .unwrap_or(0);
        let conn = self.db.get_connection()
            .map_err(|e| RepoError::Database(format!("Failed to get connection: {}", e)))?;
        let mut stmt = conn
            .prepare("SELECT customer_type, COUNT(*) as count FROM clients WHERE deleted_at IS NULL GROUP BY customer_type")
            .map_err(|e| RepoError::Database(format!("Failed to prepare statement: {}", e)))?;
        let type_stats: Vec<(String, i32)> = stmt
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?)))
            .map_err(|e| RepoError::Database(format!("Failed to execute query: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| RepoError::Database(format!("Failed to collect results: {}", e)))?;
        let clients_by_type = type_stats.into_iter().collect();
        Ok(ClientOverviewStats {
            total_clients,
            active_clients,
            inactive_clients,
            new_clients_this_month,
            clients_by_type,
        })
    }
}

#[async_trait]
impl Repository<Client, String> for ClientRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Client>> {
        let cache_key = self.cache_key_builder.id(&id);
        if let Some(client) = self.cache.get::<Client>(&cache_key) {
            return Ok(Some(client));
        }
        let sql = format!("{} WHERE id = ? AND deleted_at IS NULL", CLIENT_SELECT);
        let client = self
            .db
            .query_single_as::<Client>(&sql, params![id])
            .map_err(|e| RepoError::Database(format!("Failed to find client by id: {}", e)))?;
        if let Some(ref client) = client {
            self.cache.set(&cache_key, client.clone(), ttl::LONG);
        }
        Ok(client)
    }

    async fn find_all(&self) -> RepoResult<Vec<Client>> {
        let cache_key = self.cache_key_builder.list(&["all"]);
        if let Some(clients) = self.cache.get::<Vec<Client>>(&cache_key) {
            return Ok(clients);
        }
        let sql = format!(
            "{} WHERE deleted_at IS NULL ORDER BY name ASC",
            CLIENT_SELECT
        );
        let clients = self
            .db
            .query_as::<Client>(&sql, [])
            .map_err(|e| RepoError::Database(format!("Failed to find all clients: {}", e)))?;
        self.cache.set(&cache_key, clients.clone(), ttl::MEDIUM);
        Ok(clients)
    }

    async fn save(&self, entity: Client) -> RepoResult<Client> {
        use crate::logging::RepositoryLogger;
        use serde_json::json;
        use std::collections::HashMap;

        let logger = RepositoryLogger::new();
        let exists = IClientRepository::exists_by_id(self, entity.id.clone()).await?;

        if exists {
            logger.debug(
                "Updating existing client",
                Some({
                    let mut ctx = HashMap::new();
                    ctx.insert("client_id".to_string(), json!(entity.id));
                    ctx.insert("operation".to_string(), json!("update"));
                    ctx
                }),
            );
            let result = self
                .db
                .execute(
                    r#"UPDATE clients SET
                        name = ?, email = ?, phone = ?, customer_type = ?,
                        address_street = ?, address_city = ?, address_state = ?, address_zip = ?, address_country = ?,
                        tax_id = ?, company_name = ?, contact_person = ?, notes = ?, tags = ?,
                        updated_at = (unixepoch() * 1000)
                    WHERE id = ?"#,
                    params![
                        entity.name, entity.email, entity.phone, entity.customer_type.to_string(),
                        entity.address_street, entity.address_city, entity.address_state,
                        entity.address_zip, entity.address_country, entity.tax_id,
                        entity.company_name, entity.contact_person, entity.notes, entity.tags,
                        entity.id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to update client: {}", e)));
            if let Err(ref e) = result {
                logger.error("Failed to update client", Some(e), None);
            }
            result?;
        } else {
            logger.debug(
                "Creating new client",
                Some({
                    let mut ctx = HashMap::new();
                    ctx.insert("client_id".to_string(), json!(entity.id));
                    ctx.insert("operation".to_string(), json!("create"));
                    ctx
                }),
            );
            let result = self
                .db
                .execute(
                    r#"INSERT INTO clients (
                        id, name, email, phone, customer_type,
                        address_street, address_city, address_state, address_zip, address_country,
                        tax_id, company_name, contact_person, notes, tags,
                        created_at, updated_at, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        (unixepoch() * 1000), (unixepoch() * 1000), ?)"#,
                    params![
                        entity.id, entity.name, entity.email, entity.phone,
                        entity.customer_type.to_string(), entity.address_street, entity.address_city,
                        entity.address_state, entity.address_zip, entity.address_country,
                        entity.tax_id, entity.company_name, entity.contact_person,
                        entity.notes, entity.tags, entity.created_by,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create client: {}", e)));
            if let Err(ref e) = result {
                logger.error("Failed to create client", Some(e), None);
            }
            result?;
        }

        self.cache.remove(&self.cache_key_builder.id(&entity.id));
        IClientRepository::find_by_id(self, entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Client not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let rows_affected = self
            .db
            .execute(
                "UPDATE clients SET deleted_at = (unixepoch() * 1000), updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete client: {}", e)))?;
        if rows_affected > 0 {
            self.cache.remove(&self.cache_key_builder.id(&id));
        }
        Ok(rows_affected > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM clients WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to check client existence: {}", e)))?;
        Ok(count > 0)
    }
}
