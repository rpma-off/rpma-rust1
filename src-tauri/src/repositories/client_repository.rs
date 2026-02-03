//! Client repository implementation
//!
//! Provides consistent database access patterns for Client entities.

use crate::db::Database;
use crate::models::client::{Client, CustomerType};
use crate::repositories::base::{Repository, RepoError, RepoResult};
use crate::repositories::cache::{Cache, CacheKeyBuilder, ttl};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Query for filtering clients
#[derive(Debug, Clone, Default)]
pub struct ClientQuery {
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

impl ClientQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["deleted_at IS NULL".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(search) = &self.search {
            conditions.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)".to_string());
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

    fn build_order_by_clause(&self) -> Option<String> {
        let sort_by = self.sort_by.as_ref().map(|s| s.as_str()).unwrap_or("created_at");
        let sort_order = self.sort_order.as_ref().map(|s| s.as_str()).unwrap_or("DESC");

        Some(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}

/// Client repository for database operations
#[derive(Debug)]
pub struct ClientRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl ClientRepository {
    /// Create a new ClientRepository
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("client"),
        }
    }

    /// Find clients by email
    pub async fn find_by_email(&self, email: &str) -> RepoResult<Option<Client>> {
        let cache_key = self.cache_key_builder.query(&["email", email]);

        if let Some(client) = self.cache.get::<Client>(&cache_key) {
            return Ok(Some(client));
        }

        let client = self
            .db
            .query_single_as::<Client>(
                r#"
                SELECT
                    id, name, email, phone, customer_type,
                    address_street, address_city, address_state, address_zip, address_country,
                    tax_id, company_name, contact_person, notes, tags,
                    total_tasks, active_tasks, completed_tasks, last_task_date,
                    created_at, updated_at, created_by, deleted_at, deleted_by,
                    synced, last_synced_at
                FROM clients
                WHERE email = ? AND deleted_at IS NULL
                LIMIT 1
                "#,
                params![email],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find client by email: {}", e)))?;

        if let Some(ref client) = client {
            self.cache
                .set(&cache_key, client.clone(), ttl::MEDIUM);
        }

        Ok(client)
    }

    /// Find clients by phone
    pub async fn find_by_phone(&self, phone: &str) -> RepoResult<Option<Client>> {
        let cache_key = self.cache_key_builder.query(&["phone", phone]);

        if let Some(client) = self.cache.get::<Client>(&cache_key) {
            return Ok(Some(client));
        }

        let client = self
            .db
            .query_single_as::<Client>(
                r#"
                SELECT
                    id, name, email, phone, customer_type,
                    address_street, address_city, address_state, address_zip, address_country,
                    tax_id, company_name, contact_person, notes, tags,
                    total_tasks, active_tasks, completed_tasks, last_task_date,
                    created_at, updated_at, created_by, deleted_at, deleted_by,
                    synced, last_synced_at
                FROM clients
                WHERE phone = ? AND deleted_at IS NULL
                LIMIT 1
                "#,
                params![phone],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find client by phone: {}", e)))?;

        if let Some(ref client) = client {
            self.cache
                .set(&cache_key, client.clone(), ttl::MEDIUM);
        }

        Ok(client)
    }

    /// Find clients by customer type
    pub async fn find_by_customer_type(
        &self,
        customer_type: CustomerType,
    ) -> RepoResult<Vec<Client>> {
        let cache_key = self
            .cache_key_builder
            .query(&["type", &customer_type.to_string()]);

        if let Some(clients) = self.cache.get::<Vec<Client>>(&cache_key) {
            return Ok(clients);
        }

        let clients = self
            .db
            .query_as::<Client>(
                r#"
                SELECT
                    id, name, email, phone, customer_type,
                    address_street, address_city, address_state, address_zip, address_country,
                    tax_id, company_name, contact_person, notes, tags,
                    total_tasks, active_tasks, completed_tasks, last_task_date,
                    created_at, updated_at, created_by, deleted_at, deleted_by,
                    synced, last_synced_at
                FROM clients
                WHERE customer_type = ? AND deleted_at IS NULL
                ORDER BY name ASC
                "#,
                params![customer_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find clients by type: {}", e)))?;

        self.cache
            .set(&cache_key, clients.clone(), ttl::MEDIUM);

        Ok(clients)
    }

    /// Search clients
    pub async fn search(&self, query: ClientQuery) -> RepoResult<Vec<Client>> {
        let cache_key = self.cache_key_builder.query(&[
            &format!("{:?}", query),
        ]);

        if let Some(clients) = self.cache.get::<Vec<Client>>(&cache_key) {
            return Ok(clients);
        }

        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_default();
        let (limit, _offset) = query.build_limit_offset().unwrap_or((50, None));

        let sql = format!(
            r#"
            SELECT
                id, name, email, phone, customer_type,
                address_street, address_city, address_state, address_zip, address_country,
                tax_id, company_name, contact_person, notes, tags,
                total_tasks, active_tasks, completed_tasks, last_task_date,
                created_at, updated_at, created_by, deleted_at, deleted_by,
                synced, last_synced_at
            FROM clients
            {}
            {}
            LIMIT ?
            "#,
            where_clause, order_clause
        );

        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());

        let clients = self
            .db
            .query_as::<Client>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search clients: {}", e)))?;

        self.cache
            .set(&cache_key, clients.clone(), ttl::SHORT);

        Ok(clients)
    }

    /// Count clients matching query
    pub async fn count(&self, query: ClientQuery) -> RepoResult<i64> {
        let (where_clause, params) = query.build_where_clause();

        let sql = format!("SELECT COUNT(*) FROM clients {}", where_clause);

        let count: i64 = self
            .db
            .query_single_value(&sql, rusqlite::params_from_iter(params.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to count clients: {}", e)))?;

        Ok(count)
    }

    /// Update client statistics
    pub async fn update_statistics(&self, client_id: &str) -> RepoResult<()> {
        let _ = self
            .db
            .execute(
                r#"
                UPDATE clients SET
                    total_tasks = (
                        SELECT COUNT(*) FROM tasks
                        WHERE client_id = ? AND deleted_at IS NULL
                    ),
                    active_tasks = (
                        SELECT COUNT(*) FROM tasks
                        WHERE client_id = ? AND status NOT IN ('completed', 'cancelled') AND deleted_at IS NULL
                    ),
                    completed_tasks = (
                        SELECT COUNT(*) FROM tasks
                        WHERE client_id = ? AND status = 'completed' AND deleted_at IS NULL
                    ),
                    last_task_date = (
                        SELECT MAX(completed_at) FROM tasks
                        WHERE client_id = ? AND deleted_at IS NULL
                    ),
                    updated_at = datetime('now')
                WHERE id = ?
                "#,
                params![client_id, client_id, client_id, client_id, client_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update client statistics: {}", e)))?;

        // Invalidate cache for this client
        self.invalidate_client_cache(client_id);

        Ok(())
    }

    /// Invalidate cache for a specific client
    fn invalidate_client_cache(&self, client_id: &str) {
        self.cache.remove(&self.cache_key_builder.id(client_id));
    }

    /// Invalidate all client caches
    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }

    /// Count all clients
    pub async fn count_all(&self) -> RepoResult<i64> {
        let cache_key = self.cache_key_builder.query(&["count_all"]);
        
        if let Some(count) = self.cache.get::<i64>(&cache_key) {
            return Ok(count);
        }
        
        let count = self.db
            .query_single_value::<i64>("SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL", [])
            .map_err(|e| RepoError::Database(format!("Failed to count clients: {}", e)))?;
            
        self.cache.set(&cache_key, count, ttl::MEDIUM);
        Ok(count)
    }

    /// Count clients by customer type
    pub async fn count_by_customer_type(&self, customer_type: &CustomerType) -> RepoResult<i64> {
        let cache_key = self.cache_key_builder.query(&["count_by_type", &customer_type.to_string()]);
        
        if let Some(count) = self.cache.get::<i64>(&cache_key) {
            return Ok(count);
        }
        
        let count = self.db
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM clients WHERE customer_type = ? AND deleted_at IS NULL",
                params![customer_type.to_string()]
            )
            .map_err(|e| RepoError::Database(format!("Failed to count clients by type: {}", e)))?;
            
        self.cache.set(&cache_key, count, ttl::MEDIUM);
        Ok(count)
    }

    /// Search clients with simple string query (for backward compatibility)
    pub async fn search_simple(&self, query: &str, limit: usize, offset: usize) -> RepoResult<Vec<Client>> {
        let cache_key = self.cache_key_builder.query(&["search", query, &limit.to_string(), &offset.to_string()]);
        
        if let Some(clients) = self.cache.get::<Vec<Client>>(&cache_key) {
            return Ok(clients);
        }
        
        let clients = self.db
            .query_as::<Client>(
                r#"
                SELECT * FROM clients 
                WHERE deleted_at IS NULL 
                AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company_name LIKE ?)
                ORDER BY name ASC
                LIMIT ? OFFSET ?
                "#,
                params![
                    format!("%{}%", query),
                    format!("%{}%", query),
                    format!("%{}%", query),
                    format!("%{}%", query),
                    limit as i64,
                    offset as i64
                ]
            )
            .map_err(|e| RepoError::Database(format!("Failed to search clients: {}", e)))?;
            
        self.cache.set(&cache_key, clients.clone(), ttl::SHORT);
        Ok(clients)
    }
}

#[async_trait]
impl Repository<Client, String> for ClientRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Client>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(client) = self.cache.get::<Client>(&cache_key) {
            return Ok(Some(client));
        }

        let client = self
            .db
            .query_single_as::<Client>(
                r#"
                SELECT
                    id, name, email, phone, customer_type,
                    address_street, address_city, address_state, address_zip, address_country,
                    tax_id, company_name, contact_person, notes, tags,
                    total_tasks, active_tasks, completed_tasks, last_task_date,
                    created_at, updated_at, created_by, deleted_at, deleted_by,
                    synced, last_synced_at
                FROM clients
                WHERE id = ? AND deleted_at IS NULL
                "#,
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find client by id: {}", e)))?;

        if let Some(ref client) = client {
            self.cache
                .set(&cache_key, client.clone(), ttl::LONG);
        }

        Ok(client)
    }

    async fn find_all(&self) -> RepoResult<Vec<Client>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(clients) = self.cache.get::<Vec<Client>>(&cache_key) {
            return Ok(clients);
        }

        let clients = self
            .db
            .query_as::<Client>(
                r#"
                SELECT
                    id, name, email, phone, customer_type,
                    address_street, address_city, address_state, address_zip, address_country,
                    tax_id, company_name, contact_person, notes, tags,
                    total_tasks, active_tasks, completed_tasks, last_task_date,
                    created_at, updated_at, created_by, deleted_at, deleted_by,
                    synced, last_synced_at
                FROM clients
                WHERE deleted_at IS NULL
                ORDER BY name ASC
                "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all clients: {}", e)))?;

        self.cache
            .set(&cache_key, clients.clone(), ttl::MEDIUM);

        Ok(clients)
    }

    async fn save(&self, entity: Client) -> RepoResult<Client> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        if exists {
            // Update existing client
            self.db
                .execute(
                    r#"
                    UPDATE clients SET
                        name = ?, email = ?, phone = ?, customer_type = ?,
                        address_street = ?, address_city = ?, address_state = ?, address_zip = ?, address_country = ?,
                        tax_id = ?, company_name = ?, contact_person = ?, notes = ?, tags = ?,
                        updated_at = datetime('now')
                    WHERE id = ?
                    "#,
                    params![
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
                        entity.id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to update client: {}", e)))?;
        } else {
            // Create new client
            self.db
                .execute(
                    r#"
                    INSERT INTO clients (
                        id, name, email, phone, customer_type,
                        address_street, address_city, address_state, address_zip, address_country,
                        tax_id, company_name, contact_person, notes, tags,
                        created_at, updated_at, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
                    "#,
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
                .map_err(|e| RepoError::Database(format!("Failed to create client: {}", e)))?;
        }

        // Invalidate cache
        self.invalidate_client_cache(&entity.id);

        // Return the saved client
        self.find_by_id(entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Client not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let rows_affected = self
            .db
            .execute(
                "UPDATE clients SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete client: {}", e)))?;

        if rows_affected > 0 {
            // Invalidate cache
            self.invalidate_client_cache(&id);
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    async fn setup_test_db() -> Database {
        Database::new_in_memory().await.unwrap()
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = ClientRepository::new(db, cache);

        // Create test client
        let client = Client {
            id: "test-1".to_string(),
            name: "Test Client".to_string(),
            email: Some("test@example.com".to_string()),
            phone: None,
            customer_type: CustomerType::Individual,
            address_street: None,
            address_city: None,
            address_state: None,
            address_zip: None,
            address_country: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
            total_tasks: 0,
            active_tasks: 0,
            completed_tasks: 0,
            last_task_date: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
            created_by: Some("test-user".to_string()),
            deleted_at: None,
            deleted_by: None,
            synced: false,
            last_synced_at: None,
        };

        repo.save(client.clone()).await.unwrap();

        // Find by ID
        let found = repo.find_by_id("test-1".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, "test-1");
    }

    #[tokio::test]
    async fn test_cache_hit() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = ClientRepository::new(Arc::clone(&db), Arc::clone(&cache));

        // Create test client
        let client = Client {
            id: "cache-test".to_string(),
            name: "Cache Test Client".to_string(),
            email: Some("cache@example.com".to_string()),
            phone: None,
            customer_type: CustomerType::Individual,
            address_street: None,
            address_city: None,
            address_state: None,
            address_zip: None,
            address_country: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
            total_tasks: 0,
            active_tasks: 0,
            completed_tasks: 0,
            last_task_date: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
            created_by: Some("test-user".to_string()),
            deleted_at: None,
            deleted_by: None,
            synced: false,
            last_synced_at: None,
        };

        repo.save(client.clone()).await.unwrap();

        // First call - cache miss, hit database
        let _ = repo.find_by_id("cache-test".to_string()).await.unwrap();

        // Second call - cache hit
        let found = repo.find_by_id("cache-test".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Cache Test Client");
    }

    #[tokio::test]
    async fn test_search() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = ClientRepository::new(db, cache);

        // Create test clients
        for i in 0..3 {
            let client = Client {
                id: format!("search-{}", i),
                name: format!("Search Client {}", i),
                email: Some(format!("search{}@example.com", i)),
                phone: None,
                customer_type: CustomerType::Individual,
                address_street: None,
                address_city: None,
                address_state: None,
                address_zip: None,
                address_country: None,
                tax_id: None,
                company_name: None,
                contact_person: None,
                notes: None,
                tags: None,
                total_tasks: 0,
                active_tasks: 0,
                completed_tasks: 0,
                last_task_date: None,
                created_at: chrono::Utc::now().timestamp_millis(),
                updated_at: chrono::Utc::now().timestamp_millis(),
                created_by: Some("test-user".to_string()),
                deleted_at: None,
                deleted_by: None,
                synced: false,
                last_synced_at: None,
            };

            repo.save(client).await.unwrap();
        }

        // Search clients
        let query = ClientQuery {
            search: Some("Search".to_string()),
            ..Default::default()
        };

        let results = repo.search(query).await.unwrap();
        assert!(results.len() >= 3);
    }
}
