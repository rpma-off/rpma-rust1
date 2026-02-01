//! Client Service - Business logic for client management
//!
//! This service handles all CRUD operations for clients with validation,
//! business rules, FTS search, and repository interactions.

use crate::models::client::{
    ClientListResponse, ClientQuery, CreateClientRequest, UpdateClientRequest,
};
use crate::models::Client;
use crate::repositories::{ClientRepository, Repository};
use chrono::{Datelike, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

/// Service for client-related business operations
#[derive(Debug)]
pub struct ClientService {
    client_repo: Arc<ClientRepository>,
}

impl ClientService {
    /// Create a new ClientService instance
    pub fn new(client_repo: Arc<ClientRepository>) -> Self {
        Self { client_repo }
    }

    /// Create a new ClientService instance with database (for backward compatibility)
    #[deprecated(note = "Use new(client_repo) instead")]
    pub fn new_with_db(db: Arc<crate::db::Database>) -> Self {
        use crate::repositories::Cache;
        let cache = Arc::new(Cache::new(1000));
        Self {
            client_repo: Arc::new(ClientRepository::new(db, cache)),
        }
    }

    /// Create a new client
    pub async fn create_client(&self, req: CreateClientRequest, user_id: &str) -> Result<Client, String> {
        // Validate request
        CreateClientRequest::validate(&req)?;

        // Create client instance
        let now = Utc::now().timestamp_millis();
        let client = Client {
            id: Uuid::new_v4().to_string(),
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

        // Save using repository
        self.client_repo.save(client.clone())
            .await
            .map_err(|e| format!("Failed to create client: {}", e))?;

        Ok(client)
    }

/// Get clients with filtering and pagination
    pub async fn get_clients(&self, query: ClientQuery) -> Result<ClientListResponse, String> {
        // Handle different query scenarios using repository methods
        let clients = if let Some(search_term) = &query.search {
            // Use search_simple method
            self.client_repo.search_simple(
                search_term,
                query.limit.unwrap_or(20) as usize,
                ((query.page.unwrap_or(1) - 1) * query.limit.unwrap_or(20)) as usize,
            )
            .await
            .map_err(|e| format!("Failed to search clients: {}", e))?
        } else if let Some(customer_type) = &query.customer_type {
            // Use find_by_customer_type method
            self.client_repo.find_by_customer_type(customer_type.clone())
                .await
                .map_err(|e| format!("Failed to get clients by type: {}", e))?
        } else {
            // Use find_all method
            self.client_repo.find_all()
                .await
                .map_err(|e| format!("Failed to get all clients: {}", e))?
        };

        // Apply pagination manually if needed
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(20);
        let start = ((page - 1) * limit) as usize;
        let end = (start + limit as usize).min(clients.len());
        let paginated_clients = if start < clients.len() {
            clients[start..end].to_vec()
        } else {
            Vec::new()
        };

        // Get total count
        let total = if let Some(_search_term) = &query.search {
            // For search, we need to get total count differently
            // This is a limitation of the current repository structure
            // In a real scenario, we might add a count_search method
            clients.len() as i64
        } else if let Some(customer_type) = &query.customer_type {
            // Use repository to count by customer type
            self.client_repo.count_by_customer_type(customer_type)
                .await
                .map_err(|e| format!("Failed to count clients by type: {}", e))? as i64
        } else {
            // Use repository to count all
            self.client_repo.count_all()
                .await
                .map_err(|e| format!("Failed to count all clients: {}", e))? as i64
        };

        let total_pages = ((total as f64) / (limit as f64)).ceil() as i32;

        let stats = self.get_client_stats().await.ok();
        let statistics = stats.map(|s| crate::models::client::ClientStatistics {
            total_clients: s.total_clients as i64,
            individual_clients: s.individual_clients as i64,
            business_clients: s.business_clients as i64,
            clients_with_tasks: s.clients_with_tasks as i64,
            new_clients_this_month: s.new_clients_this_month as i64,
        });

        Ok(ClientListResponse {
            data: paginated_clients,
            pagination: crate::models::task::PaginationInfo {
                page,
                limit,
                total,
                total_pages,
            },
            statistics,
        })
    }

    /// Get a single client by ID
    pub async fn get_client(&self, id: &str) -> Result<Option<Client>, String> {
        self.client_repo.find_by_id(id.to_string())
            .await
            .map_err(|e| format!("Failed to get client: {}", e))
    }

    /// Update a client
    pub async fn update_client(&self, req: UpdateClientRequest, user_id: &str) -> Result<Client, String> {
        // Get existing client
        let mut client = self
            .get_client(&req.id)
            .await?
            .ok_or_else(|| format!("Client with id {} not found", req.id))?;

        // Check ownership
        if client.created_by.as_ref() != Some(&user_id.to_string()) {
            return Err("You can only update clients you created".to_string());
        }

        // Apply updates
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

        if let Some(_phone) = &req.phone {
            client.phone = req.phone.clone();
        }

        if let Some(customer_type) = &req.customer_type {
            client.customer_type = customer_type.clone();
        }

        if req.address_street.is_some() {
            client.address_street = req.address_street.clone();
        }
        if req.address_city.is_some() {
            client.address_city = req.address_city.clone();
        }
        if req.address_state.is_some() {
            client.address_state = req.address_state.clone();
        }
        if req.address_zip.is_some() {
            client.address_zip = req.address_zip.clone();
        }
        if req.address_country.is_some() {
            client.address_country = req.address_country.clone();
        }

        if let Some(_tax_id) = &req.tax_id {
            client.tax_id = req.tax_id.clone();
        }

        if let Some(_company_name) = &req.company_name {
            client.company_name = req.company_name.clone();
        }

        if let Some(_contact_person) = &req.contact_person {
            client.contact_person = req.contact_person.clone();
        }

        if let Some(_notes) = &req.notes {
            client.notes = req.notes.clone();
        }

        if req.tags.is_some() {
            client.tags = req.tags.clone();
        }

        // Update timestamp
        client.updated_at = Utc::now().timestamp_millis();

        // Update using repository
        self.client_repo.save(client.clone())
            .await
            .map_err(|e| format!("Failed to update client: {}", e))?;

        Ok(client)
    }

    /// Delete a client (soft delete)
    pub async fn delete_client(&self, id: &str, user_id: &str) -> Result<(), String> {
        // Check if client exists and get it for ownership check
        let client = self
            .get_client(id)
            .await?
            .ok_or_else(|| format!("Client with id {} not found", id))?;

        // Check ownership
        if client.created_by.as_ref() != Some(&user_id.to_string()) {
            return Err("You can only delete clients you created".to_string());
        }

        // Delete using repository
        self.client_repo.delete_by_id(id.to_string())
            .await
            .map_err(|e| format!("Failed to delete client: {}", e))?;

        Ok(())
    }

    /// Search clients using FTS
    pub async fn search_clients(
        &self,
        query: &str,
        page: i32,
        limit: i32,
    ) -> Result<Vec<Client>, String> {
        let offset = (page - 1) * limit;
        self.client_repo.search_simple(query, limit as usize, offset as usize)
            .await
            .map_err(|e| format!("Failed to search clients: {}", e))
    }

    /// Get task summary for a specific client
    pub async fn get_client_task_summary(&self, client_id: &str) -> Result<ClientStat, String> {
        // Get client and their task counts
        let client = self.client_repo.find_by_id(client_id.to_string())
            .await
            .map_err(|e| format!("Failed to get client: {}", e))?
            .ok_or_else(|| format!("Client with id {} not found", client_id))?;

        Ok(ClientStat {
            id: client.id,
            name: client.name,
            total_tasks: client.total_tasks,
        })
    }

    /// Get client statistics
    pub async fn get_client_stats(&self) -> Result<ClientStats, String> {
        // Get all clients first
        let all_clients = self.client_repo.find_all()
            .await
            .map_err(|e| format!("Failed to get all clients: {}", e))?;

        // Calculate statistics
        let total_clients = all_clients.len() as i32;
        let individual_clients = all_clients.iter()
            .filter(|c| matches!(c.customer_type, crate::models::CustomerType::Individual))
            .count() as i32;
        let business_clients = all_clients.iter()
            .filter(|c| matches!(c.customer_type, crate::models::CustomerType::Business))
            .count() as i32;
        let clients_with_tasks = all_clients.iter()
            .filter(|c| c.total_tasks > 0)
            .count() as i32;

        // Get new clients this month
        let now = Utc::now();
        let start_of_month = now.with_day(0)
            .unwrap_or(now)
            .timestamp_millis();
        let new_clients_this_month = all_clients.iter()
            .filter(|c| c.created_at >= start_of_month)
            .count() as i32;

        // Get top clients by task count
        let mut top_clients: Vec<ClientStat> = all_clients.iter()
            .filter(|c| c.total_tasks > 0)
            .map(|c| ClientStat {
                id: c.id.clone(),
                name: c.name.clone(),
                total_tasks: c.total_tasks,
            })
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

    /// Create a new client (async version)
    pub async fn create_client_async(
        &self,
        req: CreateClientRequest,
        user_id: &str,
    ) -> Result<Client, String> {
        self.create_client(req, user_id).await
    }

    /// Get clients with filtering and pagination (async version)
    pub async fn get_clients_async(
        &self,
        query: ClientQuery,
    ) -> Result<ClientListResponse, String> {
        self.get_clients(query).await
    }

    /// Get a single client by ID (async version)
    pub async fn get_client_async(&self, id: &str) -> Result<Option<Client>, String> {
        self.get_client(id).await
    }

    /// Update a client (async version)
    pub async fn update_client_async(
        &self,
        req: UpdateClientRequest,
        user_id: &str,
    ) -> Result<Client, String> {
        self.update_client(req, user_id).await
    }

    /// Delete a client (async version)
    pub async fn delete_client_async(&self, id: &str, user_id: &str) -> Result<(), String> {
        self.delete_client(id, user_id).await
    }

    /// Search clients using FTS (async version)
    pub async fn search_clients_async(
        &self,
        query: &str,
        page: i32,
        limit: i32,
    ) -> Result<Vec<Client>, String> {
        self.search_clients(query, page, limit).await
    }

    /// Get client statistics (async version)
    pub async fn get_client_stats_async(&self) -> Result<ClientStats, String> {
        self.get_client_stats().await
    }
}

/// Client statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientStats {
    pub total_clients: i32,
    pub individual_clients: i32,
    pub business_clients: i32,
    pub clients_with_tasks: i32,
    pub new_clients_this_month: i32,
    pub top_clients: Vec<ClientStat>,
}

/// Individual client stat for top clients
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

/// Simple email validation
fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.contains('.') && email.len() >= 5
}
