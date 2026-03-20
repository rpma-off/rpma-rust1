//! SQLite-backed client repository.
//!
//! `SqliteClientRepository` owns all SQL that operates on the `clients` table.
//! It implements both the domain-layer `ClientRepository` trait (ADR-005) and
//! the legacy `IClientRepository` async trait so that existing call-sites
//! (service, tests) continue to compile unchanged during the incremental
//! migration (Phase 1 of 4).

use crate::db::Database;
use crate::domains::clients::client_handler::{Client, ClientOverviewStats, ClientRepoQuery};
use crate::domains::clients::domain::repositories::ClientRepository;
use crate::shared::contracts::task_status::TaskStatus;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};
use async_trait::async_trait;
use chrono::{Datelike, Timelike, Utc};
use rusqlite::params;
use std::sync::Arc;

// ── SQL helpers ───────────────────────────────────────────────────────────────

/// Column list shared by every `SELECT … FROM clients` query.
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

// ── SqliteClientRepository ────────────────────────────────────────────────────

/// Concrete SQLite implementation of the `ClientRepository` trait.
#[derive(Debug)]
pub struct SqliteClientRepository {
    pub(super) db: Arc<Database>,
    pub(super) cache: Arc<Cache>,
    pub(super) cache_key_builder: CacheKeyBuilder,
}

impl SqliteClientRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("client"),
        }
    }
}

// ── Domain ClientRepository trait ────────────────────────────────────────────

#[async_trait]
impl ClientRepository for SqliteClientRepository {
    async fn find_by_id(&self, id: &str) -> RepoResult<Option<Client>> {
        let cache_key = self.cache_key_builder.id(id);
        if let Some(client) = self.cache.get::<Client>(&cache_key) {
            return Ok(Some(client));
        }
        let sql = format!("{} WHERE id = ? AND deleted_at IS NULL", CLIENT_SELECT);
        let client = self
            .db
            .query_single_as::<Client>(&sql, params![id])
            .map_err(|e| RepoError::Database(format!("Failed to find client by id: {}", e)))?;
        if let Some(ref c) = client {
            self.cache.set(&cache_key, c.clone(), ttl::LONG);
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
        let exists = ClientRepository::exists_by_id(self, &entity.id).await?;

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
                        entity.id,
                        entity.name,
                        entity.email,
                        entity.phone,
                        entity.customer_type.to_string(),
                        entity.address_street,
                        entity.address_city,
                        entity.address_state,
                        entity.address_zip,
                        entity.address_country,
                        entity.tax_id,
                        entity.company_name,
                        entity.contact_person,
                        entity.notes,
                        entity.tags,
                        entity.created_by,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create client: {}", e)));
            if let Err(ref e) = result {
                logger.error("Failed to create client", Some(e), None);
            }
            result?;
        }

        self.cache.remove(&self.cache_key_builder.id(&entity.id));
        ClientRepository::find_by_id(self, &entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Client not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: &str) -> RepoResult<bool> {
        let rows_affected = self
            .db
            .execute(
                "UPDATE clients SET deleted_at = (unixepoch() * 1000), updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete client: {}", e)))?;
        if rows_affected > 0 {
            self.cache.remove(&self.cache_key_builder.id(id));
        }
        Ok(rows_affected > 0)
    }

    async fn exists_by_id(&self, id: &str) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM clients WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to check client existence: {}", e))
            })?;
        Ok(count > 0)
    }

    async fn find_by_email(&self, email: &str) -> RepoResult<Option<Client>> {
        let cache_key = self.cache_key_builder.query(&["email", email]);
        if let Some(client) = self.cache.get::<Client>(&cache_key) {
            return Ok(Some(client));
        }
        let sql = format!(
            "{} WHERE email = ? AND deleted_at IS NULL LIMIT 1",
            CLIENT_SELECT
        );
        let client = self
            .db
            .query_single_as::<Client>(&sql, params![email])
            .map_err(|e| {
                RepoError::Database(format!("Failed to find client by email: {}", e))
            })?;
        if let Some(ref c) = client {
            self.cache.set(&cache_key, c.clone(), ttl::MEDIUM);
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
        let (limit, offset): (i64, Option<i64>) =
            query.build_limit_offset().unwrap_or((50, None));
        let offset: i64 = offset.unwrap_or(0);
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
        params_vec.push(rusqlite::types::Value::Integer(limit));
        params_vec.push(rusqlite::types::Value::Integer(offset));
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
            .query_single_value(
                &sql,
                rusqlite::params_from_iter(params.iter().map(|v| v as &dyn rusqlite::ToSql)),
            )
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
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL",
                [],
            )
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
        let count: i64 = self
            .db
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
            .query_single_value(
                "SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL",
                [],
            )
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
            .ok_or_else(|| {
                RepoError::Database("Failed to calculate start of month".to_string())
            })?
            .timestamp_millis();
        let new_clients_this_month: i32 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM clients WHERE created_at >= ? AND deleted_at IS NULL",
                params![start_of_month],
            )
            .unwrap_or(0);
        let conn = self
            .db
            .get_connection()
            .map_err(|e| RepoError::Database(format!("Failed to get connection: {}", e)))?;
        let mut stmt = conn
            .prepare(
                "SELECT customer_type, COUNT(*) as count FROM clients WHERE deleted_at IS NULL GROUP BY customer_type",
            )
            .map_err(|e| RepoError::Database(format!("Failed to prepare statement: {}", e)))?;
        let type_stats: Vec<(String, i32)> = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
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

// ── Legacy IClientRepository bridge ──────────────────────────────────────────
//
// `SqliteClientRepository` also implements the legacy `IClientRepository` async
// trait so that all existing call-sites (`ClientService`, statistics helpers,
// unit tests) continue to compile unmodified during the incremental migration.

use crate::domains::clients::client_handler::IClientRepository;

#[async_trait]
impl IClientRepository for SqliteClientRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Client>> {
        ClientRepository::find_by_id(self, &id).await
    }

    async fn find_all(&self) -> RepoResult<Vec<Client>> {
        ClientRepository::find_all(self).await
    }

    async fn save(&self, entity: Client) -> RepoResult<Client> {
        ClientRepository::save(self, entity).await
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        ClientRepository::delete_by_id(self, &id).await
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        ClientRepository::exists_by_id(self, &id).await
    }

    async fn find_by_email(&self, email: &str) -> RepoResult<Option<Client>> {
        ClientRepository::find_by_email(self, email).await
    }

    async fn search(&self, query: ClientRepoQuery) -> RepoResult<Vec<Client>> {
        ClientRepository::search(self, query).await
    }

    async fn count(&self, query: ClientRepoQuery) -> RepoResult<i64> {
        ClientRepository::count(self, query).await
    }

    async fn update_statistics(&self, client_id: &str) -> RepoResult<()> {
        ClientRepository::update_statistics(self, client_id).await
    }

    fn invalidate_all_cache(&self) {
        ClientRepository::invalidate_all_cache(self);
    }

    async fn count_all(&self) -> RepoResult<i64> {
        ClientRepository::count_all(self).await
    }

    async fn search_simple(
        &self,
        query: &str,
        limit: usize,
        offset: usize,
    ) -> RepoResult<Vec<Client>> {
        ClientRepository::search_simple(self, query, limit, offset).await
    }

    async fn count_active_tasks(&self, client_id: &str) -> RepoResult<i64> {
        ClientRepository::count_active_tasks(self, client_id).await
    }

    async fn get_overview_stats(&self) -> RepoResult<ClientOverviewStats> {
        ClientRepository::get_overview_stats(self).await
    }
}

// ── Legacy Repository<Client, String> bridge ─────────────────────────────────
//
// Some helpers (e.g. `service.rs`) call methods via the base `Repository`
// trait.  We provide the same delegation so the old code continues to work.

#[async_trait]
impl Repository<Client, String> for SqliteClientRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Client>> {
        ClientRepository::find_by_id(self, &id).await
    }

    async fn find_all(&self) -> RepoResult<Vec<Client>> {
        ClientRepository::find_all(self).await
    }

    async fn save(&self, entity: Client) -> RepoResult<Client> {
        ClientRepository::save(self, entity).await
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        ClientRepository::delete_by_id(self, &id).await
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        ClientRepository::exists_by_id(self, &id).await
    }
}
