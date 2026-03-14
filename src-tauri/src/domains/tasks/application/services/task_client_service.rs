//! Application-layer service for task-client integration operations (ADR-018).
//!
//! Encapsulates filter building, client data enrichment, relationship
//! validation, and permission checks that were previously inline in
//! `ipc/task/client_integration.rs`.

use std::sync::Arc;
use tracing::{debug, info};

use crate::commands::AppError;
use crate::domains::clients::client_handler::ClientService;
use crate::domains::tasks::application::services::task_policy_service;
use crate::domains::tasks::domain::models::task::{TaskQuery, TaskStatus, TaskPriority, SortOrder};
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::ipc::task::client_integration::TaskWithClientDetails;
use crate::domains::tasks::ipc::task_types::TaskFilter;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;

/// Orchestrates task-client integration queries and relationship operations.
pub struct TaskClientService {
    task_service: Arc<TaskService>,
    client_service: Arc<ClientService>,
}

impl TaskClientService {
    pub fn new(task_service: Arc<TaskService>, client_service: Arc<ClientService>) -> Self {
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
            page: Some(((offset / limit) + 1) as i32),
            limit: Some(limit as i32),
            status: filter.status.as_ref().and_then(|s| match s.as_str() {
                "pending" => Some(TaskStatus::Pending),
                "in_progress" => Some(TaskStatus::InProgress),
                "completed" => Some(TaskStatus::Completed),
                _ => None,
            }),
            technician_id: filter.assigned_to.clone(),
            client_id: filter.client_id.clone(),
            priority: filter.priority.as_ref().and_then(|p| match p.as_str() {
                "low" => Some(TaskPriority::Low),
                "medium" => Some(TaskPriority::Medium),
                "high" => Some(TaskPriority::High),
                "urgent" => Some(TaskPriority::Urgent),
                _ => None,
            }),
            search: None,
            from_date: filter.date_from.map(|dt| dt.to_rfc3339()),
            to_date: filter.date_to.map(|dt| dt.to_rfc3339()),
            sort_by: "created_at".to_string(),
            sort_order: SortOrder::Desc,
        };

        let tasks_with_clients = self
            .task_service
            .get_tasks_with_clients(query)
            .map_err(|e| {
                debug!("Failed to get tasks with client details: {}", e);
                AppError::db_sanitized("get_tasks_with_clients", &e)
            })?;

        let mut enhanced_tasks = Vec::new();

        let empty_id = String::new();
        for task_with_client in &tasks_with_clients.data {
            let client_details = if include_client_details {
                let client_id = task_with_client
                    .task
                    .client_id
                    .as_ref()
                    .unwrap_or(&empty_id);
                if client_id.is_empty() {
                    None
                } else {
                    self.client_service
                        .get_client_async(client_id)
                        .await
                        .ok()
                        .flatten()
                }
            } else {
                None
            };

            let relationship_status = task_policy_service::relationship_status_from_task_status(
                &task_with_client.task.status,
            );

            enhanced_tasks.push(TaskWithClientDetails {
                task: task_with_client.task.clone(),
                client_name: task_with_client
                    .client_info
                    .as_ref()
                    .map(|c| c.name.clone())
                    .unwrap_or_default(),
                client_contact: client_details.as_ref().and_then(|c| c.email.clone()),
                client_region: client_details.as_ref().and_then(|c| c.address_state.clone()),
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

        let _client = self
            .client_service
            .get_client_async(client_id)
            .await
            .map_err(|e| {
                debug!("Client not found: {}", e);
                AppError::NotFound(format!("Client not found: {}", client_id))
            })?;

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
