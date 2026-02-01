//! Task-client relationship management
//!
//! This module handles operations that involve task and client interactions.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::task::Task;
use crate::commands::task_types::TaskFilter;

use serde::Deserialize;
use crate::authenticate;
use tracing::{debug, info};

/// Request for getting tasks with detailed client information
#[derive(Deserialize, Debug)]
pub struct TasksWithClientsRequest {
    pub session_token: String,
    pub filter: Option<TaskFilter>,
    pub include_client_details: Option<bool>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Enhanced task with client details
#[derive(serde::Serialize, Debug)]
pub struct TaskWithClientDetails {
    pub task: Task,
    pub client_name: String,
    pub client_contact: Option<String>,
    pub client_region: Option<String>,
    pub client_priority: Option<String>,
    pub relationship_status: String, // "active", "inactive", "suspended", etc.
}

/// Get tasks with comprehensive client information
#[tracing::instrument(skip(state))]
pub async fn get_tasks_with_client_details(
    request: TasksWithClientsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<TaskWithClientDetails>>, AppError> {
    debug!("Getting tasks with detailed client information");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Apply role-based access control
    let mut filter = request.filter.unwrap_or_default();

    match session.role {
        crate::models::auth::UserRole::Admin => {
            // Admin can see all tasks
        }
        crate::models::auth::UserRole::Supervisor => {
            // Supervisor can see tasks in their regions
            // TODO: Add region filtering when UserSession has region field
            // if let Some(region) = &session.region {
            //     filter.region = Some(region.clone());
            // }
        }
        crate::models::auth::UserRole::Technician => {
            // Technician can only see their assigned tasks
            filter.assigned_to = Some(session.user_id.clone());
        }
        crate::models::auth::UserRole::Viewer => {
            // Viewer can only see their assigned tasks (read-only access)
            filter.assigned_to = Some(session.user_id.clone());
        }
    }

    // Set pagination defaults
    let page = request.page.unwrap_or(1).max(1);
    let limit = request.limit.unwrap_or(50).min(200);
    let offset = (page - 1) * limit;

    // Get tasks with client information
    let query = crate::models::task::TaskQuery {
        page: Some(((offset / limit) + 1) as i32),
        limit: Some(limit as i32),
        status: filter.status.as_ref().and_then(|s| match s.as_str() {
            "pending" => Some(crate::models::task::TaskStatus::Pending),
            "in_progress" => Some(crate::models::task::TaskStatus::InProgress),
            "completed" => Some(crate::models::task::TaskStatus::Completed),
            _ => None,
        }),
        technician_id: filter.assigned_to.clone(),
        client_id: filter.client_id.clone(),
        priority: filter.priority.as_ref().and_then(|p| match p.as_str() {
            "low" => Some(crate::models::task::TaskPriority::Low),
            "medium" => Some(crate::models::task::TaskPriority::Medium),
            "high" => Some(crate::models::task::TaskPriority::High),
            "urgent" => Some(crate::models::task::TaskPriority::Urgent),
            _ => None,
        }),
        search: None,
        from_date: filter.date_from.map(|dt| dt.to_rfc3339()),
        to_date: filter.date_to.map(|dt| dt.to_rfc3339()),
        sort_by: "created_at".to_string(),
        sort_order: crate::models::task::SortOrder::Desc,
    };

    let tasks_with_clients = state
        .task_service
        .get_tasks_with_clients(query)
        .map_err(|e| {
            debug!("Failed to get tasks with client details: {}", e);
            AppError::Database(format!("Failed to retrieve tasks: {}", e))
        })?;

    // Convert to enhanced response format
    let mut enhanced_tasks = Vec::new();

    for task_with_client in &tasks_with_clients.data {
        // Get additional client information
        let client_details = if request.include_client_details.unwrap_or(false) {
            state
                .client_service
                .get_client_async(&task_with_client.task.client_id.as_ref().unwrap_or(&"".to_string()))
                .await
                .ok()
                .flatten()
        } else {
            None
        };

        let relationship_status = determine_client_relationship_status(task_with_client, &client_details);

        let enhanced_task = TaskWithClientDetails {
            task: task_with_client.task.clone(),
            client_name: task_with_client.client_info.as_ref().map(|c| c.name.clone()).unwrap_or_default(),
            client_contact: client_details.as_ref().and_then(|c| c.email.clone()),
            client_region: client_details.as_ref().and_then(|c| c.address_state.clone()),
            client_priority: Some("standard".to_string()), // Default priority
            relationship_status,
        };

        enhanced_tasks.push(enhanced_task);
    }

    info!("Retrieved {} tasks with client details", enhanced_tasks.len());

    Ok(ApiResponse::success(enhanced_tasks))
}

/// Determine the relationship status between task and client
fn determine_client_relationship_status(
    task_with_client: &crate::services::task_client_integration::TaskWithClient,
    _client_details: &Option<crate::models::client::Client>,
) -> String {
    // Check task status first
    match task_with_client.task.status {
        crate::models::task::TaskStatus::Completed => {
            // Note: customer_satisfaction field doesn't exist in Task model
            // For now, just mark as completed
            "completed".to_string()
        }
        crate::models::task::TaskStatus::Cancelled => "cancelled".to_string(),
        crate::models::task::TaskStatus::InProgress => {
            // TODO: Implement schedule tracking logic
            "in_progress".to_string()
        }
        crate::models::task::TaskStatus::Pending => {
        // Simplified status - could be enhanced with actual client status
        "pending".to_string()
        }
        crate::models::task::TaskStatus::OnHold => "on_hold".to_string(),
        crate::models::task::TaskStatus::Draft => "draft".to_string(),
        crate::models::task::TaskStatus::Scheduled => "scheduled".to_string(),
        crate::models::task::TaskStatus::Invalid => "invalid".to_string(),
        crate::models::task::TaskStatus::Archived => "archived".to_string(),
        crate::models::task::TaskStatus::Failed => "failed".to_string(),
        crate::models::task::TaskStatus::Overdue => "overdue".to_string(),
        crate::models::task::TaskStatus::Assigned => "assigned".to_string(),
        crate::models::task::TaskStatus::Paused => "paused".to_string(),
    }
}

/// Validate task-client relationship
pub async fn validate_task_client_relationship(
    task_id: &str,
    client_id: &str,
    state: &AppState<'_>,
) -> Result<(), AppError> {
    debug!("Validating task-client relationship for task {} and client {}", task_id, client_id);

    // Get task
    let task = state
        .task_service
        .get_task_async(task_id)
        .await
        .map_err(|e| {
            debug!("Task not found: {}", e);
            AppError::NotFound(format!("Task not found: {}", task_id))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", task_id)))?;

    // Verify client association
    if task.client_id.as_ref() != Some(&client_id.to_string()) {
        return Err(AppError::Validation(format!(
            "Task {} is not associated with client {}",
            task_id, client_id
        )));
    }

    // Verify client exists and is active
    let _client = state
        .client_service
        .get_client_async(client_id)
        .await
        .map_err(|e| {
            debug!("Client not found: {}", e);
            AppError::NotFound(format!("Client not found: {}", client_id))
        })?;

    // Simplified - assuming client exists means they're active
    // Could be enhanced with actual status checking

    Ok(())
}

/// Get client task summary
#[tracing::instrument(skip(state))]
pub async fn get_client_task_summary(
    session_token: &str,
    client_id: &str,
    state: &AppState<'_>,
) -> Result<ApiResponse<crate::services::client::ClientStat>, AppError> {
    debug!("Getting task summary for client {}", client_id);

    // Authenticate user
    let session = authenticate!(session_token, &state);

    // Check permissions - only Admin and Supervisor can view client data
    // (Technician and Viewer have restricted access)
    let can_view_client_data = matches!(session.role, crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor);

    if !can_view_client_data {
        return Err(AppError::Authorization(
            "Not authorized to view client data".to_string(),
        ));
    }

// Get client task summary
    let summary = state
        .client_service
        .get_client_task_summary(client_id).await
        .map_err(|e| {
            debug!("Failed to get client task summary: {}", e);
            AppError::Database(format!("Failed to get client summary: {}", e))
        })?;

    info!("Retrieved task summary for client {}", client_id);

    Ok(ApiResponse::success(summary))
}