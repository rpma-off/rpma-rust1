//! Application-layer service for task-client integration operations (ADR-018).
//!
//! Encapsulates filter building, client data enrichment, relationship
//! validation, and permission checks that were previously inline in
//! `ipc/task/client_integration.rs`.

use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, info};

use crate::commands::AppError;
use crate::domains::tasks::application::services::task_policy_service;
use crate::domains::tasks::application::TaskFilter;
use crate::domains::tasks::application::TaskWithClientDetails;
use crate::domains::tasks::domain::models::task::{TaskPriority, TaskQuery, TaskStatus};
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;
use crate::shared::contracts::client_ops::{ClientContactInfo, ClientResolver};

/// Orchestrates task-client integration queries and relationship operations.
pub struct TaskClientService {
    task_service: Arc<TaskService>,
    client_service: Arc<dyn ClientResolver>,
}

impl TaskClientService {
    pub fn new(task_service: Arc<TaskService>, client_service: Arc<dyn ClientResolver>) -> Self {
        Self {
            task_service,
            client_service,
        }
    }

    /// Get tasks enriched with client details, applying role-based filtering.
    pub async fn get_tasks_with_client_details(
        &self,
        filter: Option<TaskFilter>,
        include_client_details: bool,
        page: Option<u32>,
        limit: Option<u32>,
        ctx: &RequestContext,
    ) -> Result<Vec<TaskWithClientDetails>, AppError> {
        let mut filter = filter.unwrap_or_default();
        filter.apply_role_scope(&ctx.auth.role, &ctx.auth.user_id);

        let page = page.unwrap_or(1).max(1);
        let limit = limit.unwrap_or(50).min(200);
        let offset = (page - 1) * limit;

        let query = TaskQuery {
            pagination: crate::shared::repositories::base::PaginationParams {
                page: Some(((offset / limit) + 1) as i32),
                page_size: Some(limit as i32),
                sort_by: Some("created_at".to_string()),
                sort_order: Some("desc".to_string()),
            },
            status: filter
                .status
                .as_ref()
                .and_then(|s| s.parse::<TaskStatus>().ok()),
            technician_id: filter.assigned_to.clone(),
            client_id: filter.client_id.clone(),
            priority: filter
                .priority
                .as_ref()
                .and_then(|p| p.parse::<TaskPriority>().ok()),
            search: None,
            from_date: filter.date_from.clone(),
            to_date: filter.date_to.clone(),
        };

        let tasks_with_clients = self
            .task_service
            .get_tasks_with_clients(query)
            .map_err(|e| {
                debug!("Failed to get tasks with client details: {}", e);
                AppError::db_sanitized("get_tasks_with_clients", &e)
            })?;

        let mut enhanced_tasks = Vec::with_capacity(tasks_with_clients.data.len());
        let mut client_contact_cache: HashMap<String, Option<ClientContactInfo>> = HashMap::new();

        for task_with_client in tasks_with_clients.data {
            let client_contact_info = if include_client_details {
                let client_id = task_with_client.task.client_id.as_deref().unwrap_or("");
                if client_id.is_empty() {
                    None
                } else {
                    get_cached_client_contact(
                        self.client_service.as_ref(),
                        &mut client_contact_cache,
                        client_id,
                    )
                    .await
                }
            } else {
                None
            };

            let relationship_status = task_policy_service::relationship_status_from_task_status(
                &task_with_client.task.status,
            );

            enhanced_tasks.push(TaskWithClientDetails {
                task: task_with_client.task,
                client_name: task_with_client
                    .client_info
                    .as_ref()
                    .map(|c| c.name.clone())
                    .unwrap_or_default(),
                client_contact: client_contact_info.as_ref().and_then(|c| c.email.clone()),
                client_region: client_contact_info
                    .as_ref()
                    .and_then(|c| c.address_state.clone()),
                client_priority: Some("standard".to_string()),
                relationship_status,
            });
        }

        info!(
            "Retrieved {} tasks with client details",
            enhanced_tasks.len()
        );
        Ok(enhanced_tasks)
    }

    /// Validate that a task is associated with a given client.
    pub async fn validate_task_client_relationship(
        &self,
        task_id: &str,
        client_id: &str,
    ) -> Result<(), AppError> {
        debug!(
            "Validating task-client relationship for task {} and client {}",
            task_id, client_id
        );

        let task = self
            .task_service
            .get_task_async(task_id)
            .await
            .map_err(|e| {
                debug!("Task not found: {}", e);
                AppError::NotFound(format!("Task not found: {}", task_id))
            })?
            .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", task_id)))?;

        if task.client_id.as_ref() != Some(&client_id.to_string()) {
            return Err(AppError::Validation(format!(
                "Task {} is not associated with client {}",
                task_id, client_id
            )));
        }

        let exists = self
            .client_service
            .client_exists(client_id)
            .await
            .map_err(|e| {
                debug!("Client lookup failed: {}", e);
                AppError::NotFound(format!("Client not found: {}", client_id))
            })?;

        if !exists {
            return Err(AppError::NotFound(format!(
                "Client not found: {}",
                client_id
            )));
        }

        Ok(())
    }

    /// Check if a user has permission to view client data.
    pub fn check_client_data_permission(role: &UserRole) -> Result<(), AppError> {
        let can_view = matches!(role, UserRole::Admin | UserRole::Supervisor);
        if !can_view {
            return Err(AppError::Authorization(
                "Not authorized to view client data".to_string(),
            ));
        }
        Ok(())
    }
}

async fn get_cached_client_contact(
    client_service: &dyn ClientResolver,
    cache: &mut HashMap<String, Option<ClientContactInfo>>,
    client_id: &str,
) -> Option<ClientContactInfo> {
    if let Some(cached_contact) = cache.get(client_id) {
        return cached_contact.clone();
    }

    let fetched_contact = client_service.get_client_contact(client_id).await.ok().flatten();
    cache.insert(client_id.to_string(), fetched_contact.clone());
    fetched_contact
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[derive(Default)]
    struct CountingClientResolver {
        lookups: AtomicUsize,
    }

    #[async_trait]
    impl ClientResolver for CountingClientResolver {
        async fn get_client_contact(&self, id: &str) -> Result<Option<ClientContactInfo>, String> {
            self.lookups.fetch_add(1, Ordering::Relaxed);

            Ok(Some(ClientContactInfo {
                email: Some(format!("{id}@example.com")),
                address_state: Some("IDF".to_string()),
            }))
        }

        async fn client_exists(&self, _id: &str) -> Result<bool, String> {
            Ok(true)
        }
    }

    #[tokio::test]
    async fn caches_client_contact_lookups_per_client_id() {
        let client_service = Arc::new(CountingClientResolver::default());
        let mut cache = HashMap::new();

        let first = get_cached_client_contact(client_service.as_ref(), &mut cache, "client-1").await;
        let second =
            get_cached_client_contact(client_service.as_ref(), &mut cache, "client-1").await;

        assert_eq!(first, second);
        assert_eq!(client_service.lookups.load(Ordering::Relaxed), 1);
    }
}
