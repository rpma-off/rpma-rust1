//! Task query operations
//!
//! This module handles complex task filtering, pagination, and listing operations.

use crate::authenticate;
use crate::commands::task_types::TaskFilter;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::task::{Task, TaskListResponse};
use crate::services::task_statistics::TaskStatistics;
use serde::Deserialize;
use tracing::{debug, info};

/// Request for getting tasks with clients
#[derive(Deserialize, Debug)]
pub struct GetTasksWithClientsRequest {
    pub session_token: String,
    pub filter: Option<TaskFilter>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for getting task statistics
#[derive(Deserialize, Debug)]
pub struct GetTaskStatisticsRequest {
    pub session_token: String,
    pub filter: Option<TaskFilter>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for getting completion rate
#[derive(Deserialize, Debug)]
pub struct GetCompletionRateRequest {
    pub session_token: String,
    pub filter: Option<TaskFilter>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for getting average duration by status
#[derive(Deserialize, Debug)]
pub struct GetAverageDurationByStatusRequest {
    pub session_token: String,
    pub filter: Option<TaskFilter>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for getting priority distribution
#[derive(Deserialize, Debug)]
pub struct GetPriorityDistributionRequest {
    pub session_token: String,
    pub filter: Option<TaskFilter>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for getting user assigned tasks
#[derive(Deserialize, Debug)]
pub struct GetUserAssignedTasksRequest {
    pub session_token: String,
    pub user_id: Option<String>, // If None, uses the authenticated user
    pub filter: Option<TaskFilter>,
    pub include_completed: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Get tasks with client information
pub async fn get_tasks_with_clients(
    request: GetTasksWithClientsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<TaskListResponse>, AppError> {
    // Set correlation context for tracing throughout the call stack
    let correlation_id = crate::set_correlation_context!(&request.correlation_id);
    
    debug!("Getting tasks with client information");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);
    
    // Update correlation context with user_id after authentication
    crate::set_correlation_context!(&Some(correlation_id.clone()), &session.user_id);

    // Build filter based on user role
    let mut filter = request.filter.unwrap_or_default();

    // Delegate role-based filtering to the service layer
    state
        .task_service
        .apply_role_based_filters(&mut filter, &session);

    // Set pagination defaults
    let page = request.page.unwrap_or(1).max(1);
    let limit = request.limit.unwrap_or(50).min(200); // Max 200 per page
    let _offset = (page - 1) * limit;

    // Construct TaskQuery from filter and pagination
    let query = crate::models::task::TaskQuery {
        page: Some(page as i32),
        limit: Some(limit as i32),
        status: filter.status.as_ref().and_then(|s| match s.as_str() {
            "pending" => Some(crate::models::task::TaskStatus::Pending),
            "in_progress" => Some(crate::models::task::TaskStatus::InProgress),
            "completed" => Some(crate::models::task::TaskStatus::Completed),
            "cancelled" => Some(crate::models::task::TaskStatus::Cancelled),
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
        from_date: filter.date_from.map(|d| d.to_rfc3339()),
        to_date: filter.date_to.map(|d| d.to_rfc3339()),
        sort_by: "created_at".to_string(),
        sort_order: crate::models::task::SortOrder::Desc,
    };

    // Delegate client data merging to the service layer
    let (tasks, pagination) = state
        .task_service
        .get_tasks_with_client_details(query)
        .map_err(|e| {
            debug!("Failed to get tasks with client details: {}", e);
            AppError::Database(format!("Failed to retrieve tasks: {}", e))
        })?;

    let data_len = tasks.len();

    let response = TaskListResponse {
        data: tasks,
        pagination,
        statistics: None,
    };

    info!("Retrieved {} tasks with clients (page {})", data_len, page);

    Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id)))
}

/// Get user assigned tasks
#[tracing::instrument(skip(state))]
pub async fn get_user_assigned_tasks(
    request: GetUserAssignedTasksRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<Task>>, AppError> {
    debug!("Getting user assigned tasks");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Determine which user's tasks to get
    let target_user_id = request.user_id.unwrap_or_else(|| session.user_id.clone());

    // Check permissions - users can only see their own tasks unless they have appropriate role
    if target_user_id != session.user_id
        && !matches!(
            session.role,
            crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
        )
    {
        return Err(AppError::Authorization(
            "Not authorized to view other users' tasks".to_string(),
        ));
    }

    // Build filter
    let mut filter = request.filter.unwrap_or_default();
    filter.assigned_to = Some(target_user_id.clone());
    filter.include_completed = Some(request.include_completed.unwrap_or(false));

    // Get tasks
    let status_filter = filter.status.as_ref().and_then(|s| match s.as_str() {
        "pending" => Some(crate::models::task::TaskStatus::Pending),
        "in_progress" => Some(crate::models::task::TaskStatus::InProgress),
        "completed" => Some(crate::models::task::TaskStatus::Completed),
        "cancelled" => Some(crate::models::task::TaskStatus::Cancelled),
        _ => None,
    });

    let tasks = state
        .task_service
        .get_user_assigned_tasks(
            &target_user_id,
            status_filter,
            filter.date_from.map(|d| d.to_rfc3339()).as_deref(),
            filter.date_to.map(|d| d.to_rfc3339()).as_deref(),
        )
        .map_err(|e| {
            debug!("Failed to get user assigned tasks: {}", e);
            AppError::Database(format!("Failed to retrieve user tasks: {}", e))
        })?;

    info!(
        "Retrieved {} tasks for user {}",
        tasks.len(),
        target_user_id
    );

    let correlation_id = request.correlation_id.clone();
    Ok(ApiResponse::success(tasks).with_correlation_id(correlation_id))
}

/// Get task statistics
#[tracing::instrument(skip(state))]
pub async fn get_task_statistics(
    request: GetTaskStatisticsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<TaskStatistics>, AppError> {
    debug!("Getting task statistics");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Apply role-based filtering to statistics
    let mut filter = request.filter.unwrap_or_default();

    match session.role {
        crate::models::auth::UserRole::Admin => {
            // Admin can see all statistics
        }
        crate::models::auth::UserRole::Supervisor => {
            // Supervisor can see statistics for their region/department
            // TODO: Add region-based filtering when user.region field is available
            // if let Some(region) = &user.region {
            //     filter.region = Some(region.clone());
            // }
        }
        crate::models::auth::UserRole::Technician => {
            // Technician can only see their own statistics
            filter.assigned_to = Some(session.user_id.clone());
        }
        crate::models::auth::UserRole::Viewer => {
            // Viewer has limited access to statistics
            filter.assigned_to = Some(session.user_id.clone());
        }
    }

    // Get statistics from service
    let stats = state.task_service.get_task_statistics().map_err(|e| {
        debug!("Failed to get task statistics: {}", e);
        AppError::Database(format!("Failed to retrieve statistics: {}", e))
    })?;

    info!("Retrieved task statistics for filter: {:?}", filter);

    let correlation_id = request.correlation_id.clone();
    Ok(ApiResponse::success(stats).with_correlation_id(correlation_id))
}

/// Get completion rate
#[tracing::instrument(skip(state))]
pub async fn get_completion_rate(
    request: GetCompletionRateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<f64>, AppError> {
    debug!("Getting task completion rate");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Apply role-based filtering
    let mut filter = request.filter.unwrap_or_default();

    match session.role {
        crate::models::auth::UserRole::Admin => {}
        crate::models::auth::UserRole::Supervisor => {
            // TODO: Add region filtering when UserSession has region field
            // if let Some(region) = &session.region {
            //     filter.region = Some(region.clone());
            // }
        }
        crate::models::auth::UserRole::Technician => {
            filter.assigned_to = Some(session.user_id.clone());
        }
        crate::models::auth::UserRole::Viewer => {
            filter.assigned_to = Some(session.user_id.clone());
        }
    }

    // Calculate completion rate
    let stats = state.task_service.get_task_statistics().map_err(|e| {
        debug!("Failed to get completion rate data: {}", e);
        AppError::Database(format!("Failed to calculate completion rate: {}", e))
    })?;

    let completion_rate = if stats.total_tasks > 0 {
        (stats.completed_tasks as f64 / stats.total_tasks as f64) * 100.0
    } else {
        0.0
    };

    info!("Calculated completion rate: {:.2}%", completion_rate);

    let correlation_id = request.correlation_id.clone();
    Ok(ApiResponse::success(completion_rate).with_correlation_id(correlation_id))
}

/// Get average duration by status
#[tracing::instrument(skip(state))]
pub async fn get_average_duration_by_status(
    request: GetAverageDurationByStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<std::collections::HashMap<String, f64>>, AppError> {
    debug!("Getting average duration by status");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Apply role-based filtering
    let mut filter = request.filter.unwrap_or_default();

    match session.role {
        crate::models::auth::UserRole::Admin => {}
        crate::models::auth::UserRole::Supervisor => {
            // TODO: Add region filtering when UserSession has region field
            // if let Some(region) = &session.region {
            //     filter.region = Some(region.clone());
            // }
        }
        crate::models::auth::UserRole::Technician => {
            filter.assigned_to = Some(session.user_id.clone());
        }
        crate::models::auth::UserRole::Viewer => {
            filter.assigned_to = Some(session.user_id.clone());
        }
    }

    // Get average durations by status
    let avg_durations_vec = state
        .task_service
        .get_average_duration_by_status()
        .map_err(|e| {
            debug!("Failed to get average durations: {}", e);
            AppError::Database(format!("Failed to calculate average durations: {}", e))
        })?;

    // Convert Vec to HashMap
    let avg_durations: std::collections::HashMap<String, f64> =
        avg_durations_vec.into_iter().collect();

    info!(
        "Retrieved average durations for {} statuses",
        avg_durations.len()
    );

    let correlation_id = request.correlation_id.clone();
    Ok(ApiResponse::success(avg_durations).with_correlation_id(correlation_id))
}

/// Get priority distribution
#[tracing::instrument(skip(state))]
pub async fn get_priority_distribution(
    request: GetPriorityDistributionRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<std::collections::HashMap<String, u64>>, AppError> {
    debug!("Getting task priority distribution");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Apply role-based filtering
    let mut filter = request.filter.unwrap_or_default();

    match session.role {
        crate::models::auth::UserRole::Admin => {}
        crate::models::auth::UserRole::Supervisor => {
            // TODO: Add region filtering when UserSession has region field
            // if let Some(region) = &session.region {
            //     filter.region = Some(region.clone());
            // }
        }
        crate::models::auth::UserRole::Technician => {
            filter.assigned_to = Some(session.user_id.clone());
        }
        crate::models::auth::UserRole::Viewer => {
            filter.assigned_to = Some(session.user_id.clone());
        }
    }

    // Get priority distribution
    let priority_dist_vec = state
        .task_service
        .get_priority_distribution()
        .map_err(|e| {
            debug!("Failed to get priority distribution: {}", e);
            AppError::Database(format!("Failed to get priority distribution: {}", e))
        })?;

    // Convert Vec to HashMap and i64 to u64
    let priority_dist: std::collections::HashMap<String, u64> = priority_dist_vec
        .into_iter()
        .map(|(k, v)| (k, v as u64))
        .collect();

    info!(
        "Retrieved priority distribution with {} categories",
        priority_dist.len()
    );

    let correlation_id = request.correlation_id.clone();
    Ok(ApiResponse::success(priority_dist).with_correlation_id(correlation_id))
}
