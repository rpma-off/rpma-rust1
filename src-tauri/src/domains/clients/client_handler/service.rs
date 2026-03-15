//! Client service — business operations and ClientResolver implementation.

use super::{
    Client, ClientListResponse, ClientQuery, ClientRepoQuery, ClientStatistics,
    CreateClientRequest, CustomerType, IClientRepository, UpdateClientRequest,
};
use crate::db::Database;
use crate::shared::repositories::base::Repository;
use crate::shared::repositories::cache::Cache;
use crate::shared::services::cross_domain::PaginationInfo;
use chrono::{Datelike, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

// Re-import for sub-module use
use super::repository::ClientRepository;

// ── ClientStats / ClientStat ──────────────────────────────────────────────────

/// Client statistics returned by the service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientStats {
    pub total_clients: i32,
    pub individual_clients: i32,
    pub business_clients: i32,
    pub clients_with_tasks: i32,
    pub new_clients_this_month: i32,
    pub top_clients: Vec<ClientStat>,
}

/// Individual client stat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientStat {
    pub id: String,
    pub name: String,
    pub total_tasks: i32,
}

impl crate::db::FromSqlRow for ClientStat {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(ClientStat {
            id: row.get(0)?,
            name: row.get(1)?,
            total_tasks: row.get(2)?,
        })
    }
}

// ── ClientService ─────────────────────────────────────────────────────────────

/// Service for client business operations
#[derive(Debug)]
pub struct ClientService {
    pub(super) client_repo: Arc<ClientRepository>,
}

impl ClientService {
    pub fn new(client_repo: Arc<ClientRepository>) -> Self {
        Self { client_repo }
    }

    /// Create a ClientService from a raw Database handle (creates a default in-memory cache).
    #[deprecated(note = "prefer new(repo) with a shared repository")]
    pub fn new_with_db(db: Arc<Database>) -> Self {
        let cache = Arc::new(Cache::new(256));
        let repo = Arc::new(ClientRepository::new(db, cache));
        Self { client_repo: repo }
    }

    /// Get a per-client statistics summary (id, name, total_tasks).
    pub async fn get_client_task_summary(&self, client_id: &str) -> Result<ClientStat, String> {
        let client = self
            .get_client(client_id)
            .await?
            .ok_or_else(|| format!("Client {} not found", client_id))?;
        Ok(ClientStat {
            id: client.id,
            name: client.name,
            total_tasks: client.total_tasks,
        })
    }

    pub async fn create_client(
        &self,
        req: CreateClientRequest,
        user_id: &str,
    ) -> Result<Client, String> {
        use crate::logging::{LogDomain, ServiceLogger};
        use serde_json::json;
        let logger = ServiceLogger::new(LogDomain::Client);
        logger.info(
            "Creating new client",
            Some({
                let mut ctx = HashMap::new();
                ctx.insert("customer_type".to_string(), json!(req.customer_type.to_string()));
                ctx
            }),
        );
        CreateClientRequest::validate(&req)?;
        if let Some(ref email) = req.email {
            if self
                .client_repo
                .find_by_email(email)
                .await
                .map_err(|e| format!("Failed to check email duplicates: {}", e))?
                .is_some()
            {
                return Err("A client with this email address already exists".to_string());
            }
        }
        let now = Utc::now().timestamp_millis();
        let client = Client {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            name: req.name.clone(),
            email: req.email.clone(),
            phone: req.phone.clone(),
            customer_type: req.customer_type.clone(),
            address_street: req.address_street.clone(),
            address_city: req.address_city.clone(),
            address_state: req.address_state.clone(),
            address_zip: req.address_zip.clone(),
            address_country: req.address_country.clone(),
            tax_id: req.tax_id.clone(),
            company_name: req.company_name.clone(),
            contact_person: req.contact_person.clone(),
            notes: req.notes.clone(),
            tags: req.tags.clone(),
            total_tasks: 0,
            active_tasks: 0,
            completed_tasks: 0,
            last_task_date: None,
            created_at: now,
            updated_at: now,
            created_by: Some(user_id.to_string()),
            deleted_at: None,
            deleted_by: None,
            synced: false,
            last_synced_at: None,
        };
        let result = IClientRepository::save(self.client_repo.as_ref(), client.clone())
            .await
            .map_err(|e| format!("Failed to create client: {}", e));
        match &result {
            Ok(_) => logger.info("Client created successfully", Some({ let mut ctx = HashMap::new(); ctx.insert("client_id".to_string(), json!(client.id)); ctx })),
            Err(e) => logger.error("Failed to create client", Some(&std::io::Error::new(std::io::ErrorKind::Other, e.clone())), None),
        }
        result.map(|_| client)
    }

    pub async fn get_clients(&self, query: ClientQuery) -> Result<ClientListResponse, String> {
        let page = query.page.unwrap_or(1).max(1);
        let limit = query.limit.unwrap_or(20).min(200).max(1);
        let offset = (page - 1) * limit;
        let sort_order = query.sort_order.map(|o| o.to_string());
        let repo_query = ClientRepoQuery {
            search: query.search.clone(),
            customer_type: query.customer_type.clone(),
            email: None,
            phone: None,
            city: None,
            tags: None,
            limit: Some(limit as i64),
            offset: Some(offset as i64),
            sort_by: query.sort_by.clone(),
            sort_order,
        };
        let clients = self
            .client_repo
            .search(repo_query.clone())
            .await
            .map_err(|e| format!("Failed to list clients: {}", e))?;
        let count_query = ClientRepoQuery {
            limit: None,
            offset: None,
            ..repo_query
        };
        let total = self
            .client_repo
            .count(count_query)
            .await
            .map_err(|e| format!("Failed to count clients: {}", e))?;
        let total_pages = ((total as f64) / (limit as f64)).ceil() as i32;
        let stats = self.get_client_stats().await.ok();
        let statistics = stats.map(|s| ClientStatistics {
            total_clients: s.total_clients as i64,
            individual_clients: s.individual_clients as i64,
            business_clients: s.business_clients as i64,
            clients_with_tasks: s.clients_with_tasks as i64,
            new_clients_this_month: s.new_clients_this_month as i64,
        });
        Ok(ClientListResponse {
            data: clients,
            pagination: PaginationInfo { page, limit, total, total_pages },
            statistics,
        })
    }

    pub async fn get_client(&self, id: &str) -> Result<Option<Client>, String> {
        IClientRepository::find_by_id(self.client_repo.as_ref(), id.to_string())
            .await
            .map_err(|e| format!("Failed to get client: {}", e))
    }

    pub async fn update_client(
        &self,
        req: UpdateClientRequest,
        user_id: &str,
    ) -> Result<Client, String> {
        use super::is_valid_email;
        use super::is_valid_phone;

        let mut client = self
            .get_client(&req.id)
            .await?
            .ok_or_else(|| format!("Client with id {} not found", req.id))?;
        if client.created_by.as_ref() != Some(&user_id.to_string()) {
            return Err("You can only update clients you created".to_string());
        }
        if let Some(name) = &req.name {
            if name.trim().is_empty() {
                return Err("Name cannot be empty".to_string());
            }
            if name.len() > 100 {
                return Err("Name must be 100 characters or less".to_string());
            }
            client.name = name.clone();
        }
        if let Some(email) = &req.email {
            if !is_valid_email(email) {
                return Err("Invalid email format".to_string());
            }
            client.email = req.email.clone();
        }
        if let Some(phone) = &req.phone {
            if !is_valid_phone(phone) {
                return Err("Invalid phone number format".to_string());
            }
            client.phone = req.phone.clone();
        }
        if let Some(customer_type) = &req.customer_type {
            client.customer_type = customer_type.clone();
        }
        if req.address_street.is_some() { client.address_street = req.address_street.clone(); }
        if req.address_city.is_some() { client.address_city = req.address_city.clone(); }
        if req.address_state.is_some() { client.address_state = req.address_state.clone(); }
        if req.address_zip.is_some() { client.address_zip = req.address_zip.clone(); }
        if req.address_country.is_some() { client.address_country = req.address_country.clone(); }
        if req.tax_id.is_some() { client.tax_id = req.tax_id.clone(); }
        if req.company_name.is_some() { client.company_name = req.company_name.clone(); }
        if req.contact_person.is_some() { client.contact_person = req.contact_person.clone(); }
        if req.notes.is_some() { client.notes = req.notes.clone(); }
        if req.tags.is_some() { client.tags = req.tags.clone(); }
        client.updated_at = Utc::now().timestamp_millis();
        IClientRepository::save(self.client_repo.as_ref(), client.clone())
            .await
            .map_err(|e| format!("Failed to update client: {}", e))?;
        Ok(client)
    }

    pub async fn delete_client(&self, id: &str, user_id: &str) -> Result<(), String> {
        use crate::logging::{LogDomain, ServiceLogger};
        use serde_json::json;
        let logger = ServiceLogger::new(LogDomain::Client);
        let client = self.get_client(id).await?.ok_or_else(|| {
            logger.warn("Client not found for deletion", None);
            format!("Client with id {} not found", id)
        })?;
        if client.created_by.as_ref() != Some(&user_id.to_string()) {
            logger.warn("Unauthorized client deletion attempt", Some({ let mut ctx = HashMap::new(); ctx.insert("client_id".to_string(), json!(id)); ctx }));
            return Err("You can only delete clients you created".to_string());
        }
        let result = IClientRepository::delete_by_id(self.client_repo.as_ref(), id.to_string())
            .await
            .map(|_| ())
            .map_err(|e| format!("Failed to delete client: {}", e));
        match &result {
            Ok(_) => logger.info("Client deleted successfully", None),
            Err(e) => logger.error("Failed to delete client", Some(&std::io::Error::new(std::io::ErrorKind::Other, e.clone())), None),
        }
        result
    }

    pub async fn search_clients(
        &self,
        query: &str,
        page: i32,
        limit: i32,
    ) -> Result<Vec<Client>, String> {
        let offset = (page - 1) * limit;
        self.client_repo
            .search_simple(query, limit as usize, offset as usize)
            .await
            .map_err(|e| format!("Failed to search clients: {}", e))
    }

    pub async fn get_client_stats(&self) -> Result<ClientStats, String> {
        let all_clients = IClientRepository::find_all(self.client_repo.as_ref())
            .await
            .map_err(|e| format!("Failed to get all clients: {}", e))?;
        let total_clients = all_clients.len() as i32;
        let individual_clients = all_clients
            .iter()
            .filter(|c| matches!(c.customer_type, CustomerType::Individual))
            .count() as i32;
        let business_clients = all_clients
            .iter()
            .filter(|c| matches!(c.customer_type, CustomerType::Business))
            .count() as i32;
        let clients_with_tasks = all_clients.iter().filter(|c| c.total_tasks > 0).count() as i32;
        let now = Utc::now();
        let start_of_month = now.with_day(1).unwrap_or(now).timestamp_millis();
        let new_clients_this_month = all_clients
            .iter()
            .filter(|c| c.created_at >= start_of_month)
            .count() as i32;
        let mut top_clients: Vec<ClientStat> = all_clients
            .iter()
            .filter(|c| c.total_tasks > 0)
            .map(|c| ClientStat { id: c.id.clone(), name: c.name.clone(), total_tasks: c.total_tasks })
            .collect();
        top_clients.sort_by(|a, b| b.total_tasks.cmp(&a.total_tasks));
        top_clients.truncate(5);
        Ok(ClientStats {
            total_clients,
            individual_clients,
            business_clients,
            clients_with_tasks,
            new_clients_this_month,
            top_clients,
        })
    }

    // ── Async aliases ─────────────────────────────────────────────────────────
    // These are thin forwarders kept for backward compatibility with
    // `task_client_service.rs` and existing test helpers.
    // New call-sites should call the base methods directly.
    pub async fn create_client_async(&self, req: CreateClientRequest, user_id: &str) -> Result<Client, String> { self.create_client(req, user_id).await }
    pub async fn get_clients_async(&self, query: ClientQuery) -> Result<ClientListResponse, String> { self.get_clients(query).await }
    pub async fn get_client_async(&self, id: &str) -> Result<Option<Client>, String> { self.get_client(id).await }
    pub async fn update_client_async(&self, req: UpdateClientRequest, user_id: &str) -> Result<Client, String> { self.update_client(req, user_id).await }
    pub async fn delete_client_async(&self, id: &str, user_id: &str) -> Result<(), String> { self.delete_client(id, user_id).await }
    pub async fn search_clients_async(&self, query: &str, page: i32, limit: i32) -> Result<Vec<Client>, String> { self.search_clients(query, page, limit).await }
    pub async fn get_client_stats_async(&self) -> Result<ClientStats, String> { self.get_client_stats().await }
}

// ── ClientResolver contract implementation ───────────────────────────────────

#[async_trait::async_trait]
impl crate::shared::contracts::client_ops::ClientResolver for ClientService {
    async fn get_client_contact(
        &self,
        id: &str,
    ) -> Result<Option<crate::shared::contracts::client_ops::ClientContactInfo>, String> {
        Ok(self.get_client_async(id).await?.map(|c| {
            crate::shared::contracts::client_ops::ClientContactInfo {
                email: c.email,
                address_state: c.address_state,
            }
        }))
    }

    async fn client_exists(&self, id: &str) -> Result<bool, String> {
        Ok(self.get_client_async(id).await?.is_some())
    }
}
