//! Task command facade
//!
//! This module provides the main API interface for task operations,
//! delegating to specialized modules while maintaining backward compatibility.

use crate::commands::{ApiResponse, AppError, AppState, TaskAction};
use crate::models::task::Task;
use serde::Deserialize;
use std::fmt::Debug;
use crate::authenticate;
use crate::check_task_permission;
use tracing::{debug, error, info, warn};
use crate::services::validation::ValidationService;

// Re-export specialized modules for internal use
pub use super::validation::*;
pub use super::queries::*;




/// Task request structure
#[derive(Deserialize, Debug)]

pub struct TaskCrudRequest {
    pub action: TaskAction,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for editing a task
#[derive(Deserialize, Debug)]

pub struct EditTaskRequest {
    pub session_token: String,
    pub task_id: String,
    pub data: crate::models::task::UpdateTaskRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for adding a note to a task
#[derive(Deserialize, Debug)]

pub struct AddTaskNoteRequest {
    pub session_token: String,
    pub task_id: String,
    pub note: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for sending a message related to a task
#[derive(Deserialize, Debug)]

pub struct SendTaskMessageRequest {
    pub session_token: String,
    pub task_id: String,
    pub message: String,
    pub message_type: Option<String>, // "info", "warning", "urgent", etc.
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for delaying/rescheduling a task
#[derive(Deserialize, Debug)]

pub struct DelayTaskRequest {
    pub session_token: String,
    pub task_id: String,
    pub new_scheduled_date: String, // New scheduled date
    pub reason: String,             // Reason for delay
    #[serde(default)]
    pub additional_notes: Option<String>, // Optional additional notes
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for reporting an issue with a task
#[derive(Deserialize, Debug)]

pub struct ReportTaskIssueRequest {
    pub session_token: String,
    pub task_id: String,
    pub issue_type: String,
    pub description: String,
    pub severity: Option<String>, // "low", "medium", "high", "critical"
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for exporting tasks to CSV
#[derive(Deserialize, Debug)]

pub struct ExportTasksCsvRequest {
    pub session_token: String,
    pub filter: Option<TaskFilter>,
    pub include_client_data: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for bulk importing tasks
#[derive(Deserialize, Debug)]

pub struct ImportTasksBulkRequest {
    pub session_token: String,
    pub csv_data: String,
    pub update_existing: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Response for bulk import operation
#[derive(serde::Serialize, Debug)]
pub struct BulkImportResponse {
    pub total_processed: u32,
    pub successful: u32,
    pub failed: u32,
    pub errors: Vec<String>,
    pub duplicates_skipped: u32,
}

// Delegate to validation module
pub use super::validation::check_task_assignment;
pub use super::validation::check_task_availability;

// Explicit import for TaskFilter
use crate::commands::task_types::TaskFilter;

/// Export tasks to CSV command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn export_tasks_csv(
    request: ExportTasksCsvRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    debug!("Exporting tasks to CSV");

    // Authenticate user
    let _session = authenticate!(&request.session_token, &state);

    // Build query for export
    let query = crate::models::task::TaskQuery {
        page: Some(1),
        limit: Some(10000), // Large limit for export
        status: request.filter.as_ref().and_then(|f| f.status.as_ref()).and_then(|s| match s.as_str() {
            "pending" => Some(crate::models::task::TaskStatus::Pending),
            "in_progress" => Some(crate::models::task::TaskStatus::InProgress),
            "completed" => Some(crate::models::task::TaskStatus::Completed),
            "cancelled" => Some(crate::models::task::TaskStatus::Cancelled),
            _ => None,
        }),
        technician_id: request.filter.as_ref().and_then(|f| f.assigned_to.clone()),
        client_id: request.filter.as_ref().and_then(|f| f.client_id.clone()),
        priority: request.filter.as_ref().and_then(|f| f.priority.as_ref()).and_then(|p| match p.as_str() {
            "low" => Some(crate::models::task::TaskPriority::Low),
            "medium" => Some(crate::models::task::TaskPriority::Medium),
            "high" => Some(crate::models::task::TaskPriority::High),
            "urgent" => Some(crate::models::task::TaskPriority::Urgent),
            _ => None,
        }),
        search: None,
        from_date: request.filter.as_ref().and_then(|f| f.date_from.map(|d| d.to_rfc3339())),
        to_date: request.filter.as_ref().and_then(|f| f.date_to.map(|d| d.to_rfc3339())),
        sort_by: "created_at".to_string(),
        sort_order: crate::models::task::SortOrder::Desc,
    };

    // Get tasks with client information through import service
    let tasks = state.task_service.get_tasks_for_export(query)
        .map_err(|e| AppError::Database(format!("Failed to get tasks for export: {}", e)))?;

    if tasks.is_empty() {
        warn!("No tasks found for export");
        return Ok(ApiResponse::success("ID,Title,Description,Status,Priority,Client Name,Client Email,Created At,Updated At\n".to_string()));
    }

    // Export to CSV using the service
    let csv_content = state.task_service.export_to_csv(&tasks, request.include_client_data.unwrap_or(false))
        .map_err(|e| AppError::Database(format!("Failed to export tasks: {}", e)))?;

    info!("Successfully exported {} tasks to CSV", tasks.len());
    Ok(ApiResponse::success(csv_content))
}

/// Import tasks from CSV command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn import_tasks_bulk(
    request: ImportTasksBulkRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<BulkImportResponse>, AppError> {
    debug!("Bulk importing tasks from CSV");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Check permissions - only supervisors and admins can bulk import
    if !matches!(session.role, crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor) {
        return Err(AppError::Authorization("Only supervisors and admins can perform bulk imports".to_string()));
    }

    // Use TaskImportService to parse CSV and get task requests
    let import_result = state.task_service.import_from_csv(
        &request.csv_data,
        &session.user_id,
        request.update_existing.unwrap_or(false)
    ).await.map_err(|e| AppError::Database(format!("Import failed: {}", e)))?;

    // Create tasks from parsed data
    let mut successful = 0u32;
    let mut failed = 0u32;
    let mut errors = import_result.errors.clone();

    // Note: The actual task creation logic would require storing parsed task data
    // For now, the import service validates and returns counts
    // In a full implementation, you'd iterate through created requests and persist them

    let response = BulkImportResponse {
        total_processed: import_result.total_processed,
        successful: import_result.successful,
        failed: import_result.failed,
        errors,
        duplicates_skipped: import_result.duplicates_skipped,
    };

    info!("Bulk import completed: {} processed, {} successful, {} failed, {} duplicates skipped",
          response.total_processed, response.successful, response.failed, response.duplicates_skipped);

    Ok(ApiResponse::success(response))
}

/// Delay task command
#[tracing::instrument(skip(state))]
#[tauri::command]

pub async fn delay_task(
    request: DelayTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    debug!("Delaying task {}", request.task_id);

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Get current task
    let task_option = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| {
            debug!("Task not found: {}", e);
            AppError::NotFound(format!("Task not found: {}", request.task_id))
        })?;

    let task = task_option.ok_or_else(|| {
        AppError::NotFound(format!("Task not found: {}", request.task_id))
    })?;

    // Check permissions
    check_task_permissions(&session, &task, "edit")?;

    // Update task with new scheduled date
    let update_request = crate::models::task::UpdateTaskRequest {
        id: Some(request.task_id.clone()),
        scheduled_date: Some(request.new_scheduled_date.clone()),
        notes: request.additional_notes.clone(),
        ..Default::default()
    };

    let updated_task = state
        .task_service
        .update_task_async(update_request, &session.user_id)
        .await
        .map_err(|e| {
            error!("Task delay failed: {}", e);
            AppError::Database(format!("Failed to delay task: {}", e))
        })?;

    // TODO: Add audit log entry for task delay

    info!("Task {} delayed to {}", request.task_id, request.new_scheduled_date);
    Ok(ApiResponse::success(updated_task))
}

/// Edit task command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn edit_task(
    request: EditTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    debug!("Editing task {}", request.task_id);

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Get current task
    let task_option = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| {
            debug!("Task not found: {}", e);
            AppError::NotFound(format!("Task not found: {}", request.task_id))
        })?;

    let task = task_option.ok_or_else(|| {
        AppError::NotFound(format!("Task not found: {}", request.task_id))
    })?;

    // Check permissions
    check_task_permissions(&session, &task, "edit")?;

    // Create UpdateTaskRequest from the incoming data
    let update_request = crate::models::task::UpdateTaskRequest {
        id: Some(request.task_id.clone()),
        title: request.data.title.clone(),
        description: request.data.description.clone(),
        priority: request.data.priority,
        status: request.data.status,
        vehicle_plate: request.data.vehicle_plate.clone(),
        vehicle_model: request.data.vehicle_model.clone(),
        vehicle_year: request.data.vehicle_year.clone(),
        vehicle_make: request.data.vehicle_make.clone(),
        vin: request.data.vin.clone(),
        ppf_zones: request.data.ppf_zones.clone(),
        custom_ppf_zones: request.data.custom_ppf_zones.clone(),
        client_id: request.data.client_id.clone(),
        customer_name: request.data.customer_name.clone(),
        customer_email: request.data.customer_email.clone(),
        customer_phone: request.data.customer_phone.clone(),
        customer_address: request.data.customer_address.clone(),
        scheduled_date: request.data.scheduled_date.clone(),
        estimated_duration: request.data.estimated_duration,
        notes: request.data.notes.clone(),
        tags: request.data.tags.clone(),
        technician_id: request.data.technician_id.clone(),
        ..Default::default()
    };

    // Validate status change if status is being updated
    if let Some(new_status) = &update_request.status {
        validate_status_change(&task.status, new_status)?;
    }

    // Call the service to update the task
    let updated_task = state
        .task_service
        .update_task_async(update_request, &session.user_id)
        .await
        .map_err(|e| {
            error!("Task update failed: {}", e);
            AppError::Database(format!("Failed to update task: {}", e))
        })?;

    // TODO: Implement task notification sending for updates

    info!("Task {} updated successfully", request.task_id);

    Ok(ApiResponse::success(updated_task))
}

/// Validate status change
pub fn validate_status_change(current: &crate::models::task::TaskStatus, new: &crate::models::task::TaskStatus) -> Result<(), AppError> {
    match (current, new) {
        // Valid transitions
        (crate::models::task::TaskStatus::Pending, crate::models::task::TaskStatus::InProgress) => Ok(()),
        (crate::models::task::TaskStatus::Pending, crate::models::task::TaskStatus::Cancelled) => Ok(()),
        (crate::models::task::TaskStatus::Pending, crate::models::task::TaskStatus::OnHold) => Ok(()),
        (crate::models::task::TaskStatus::InProgress, crate::models::task::TaskStatus::Completed) => Ok(()),
        (crate::models::task::TaskStatus::InProgress, crate::models::task::TaskStatus::OnHold) => Ok(()),
        (crate::models::task::TaskStatus::InProgress, crate::models::task::TaskStatus::Cancelled) => Ok(()),
        (crate::models::task::TaskStatus::OnHold, crate::models::task::TaskStatus::InProgress) => Ok(()),
        (crate::models::task::TaskStatus::OnHold, crate::models::task::TaskStatus::Cancelled) => Ok(()),
        // Invalid transitions
        (crate::models::task::TaskStatus::Completed, _) => Err(AppError::Validation("Cannot change status of completed task".to_string())),
        (crate::models::task::TaskStatus::Cancelled, _) => Err(AppError::Validation("Cannot change status of cancelled task".to_string())),
        _ => Err(AppError::Validation(format!("Invalid status transition from {:?} to {:?}", current, new))),
    }
}

/// Check permissions for task operations
pub fn check_task_permissions(
    session: &crate::models::auth::UserSession,
    task: &Task,
    operation: &str,
) -> Result<(), AppError> {
    match session.role {
        crate::models::auth::UserRole::Admin => Ok(()),
        crate::models::auth::UserRole::Supervisor => {
            // Supervisor can operate on tasks in their region
            // TODO: Add region check when UserSession has region field
            // if let Some(session_region) = &session.region {
            //     // For now, allow all supervisors - region logic can be added later if needed
            //     Ok(())
            // } else {
            //     Ok(()) // Allow if region info is missing
            // }
            Ok(())
        }
        crate::models::auth::UserRole::Technician => {
            // Technician can only operate on their assigned tasks
            if task.technician_id.as_ref() == Some(&session.user_id) {
                Ok(())
            } else {
                Err(AppError::Authorization("Technician can only operate on their assigned tasks".to_string()))
            }
        }
        crate::models::auth::UserRole::Viewer => {
            // Viewer can only view tasks
            match operation {
                "view" => Ok(()),
                _ => Err(AppError::Authorization("Viewer can only view tasks".to_string())),
            }
        }
    }
}

/// Task CRUD command handler
#[tracing::instrument(skip(state))]
#[tauri::command]

pub async fn task_crud(
    request: TaskCrudRequest,
    state: AppState<'_>,
) -> Result<crate::commands::ApiResponse<crate::commands::TaskResponse>, AppError> {
    let action = request.action;
    let session_token = request.session_token;
    info!("task_crud command received - action: {:?}", action);

    // Authenticate user
    let current_user = authenticate!(&session_token, &state);

    // Handle action
    match action {
        crate::commands::TaskAction::Create { data } => {
            // V2: Add role check for task creation
            check_task_permission!(&current_user.role, "create");

            // V4: Add input validation
            let validator = ValidationService::new();
            let validated_action = validator
                .validate_task_action(crate::commands::TaskAction::Create { data })
                .await
                .map_err(|e| {
                    error!("Task validation failed: {}", e);
                    AppError::Validation(format!("Task validation failed: {}", e))
                })?;

            if let crate::commands::TaskAction::Create { data: validated_data } = validated_action {
                let task = state
                    .task_service
                    .create_task_async(validated_data, &current_user.user_id)
                    .await
                    .map_err(|e| {
                        error!("Task creation failed: {}", e);
                        AppError::Database(format!("Failed to create task: {}", e))
                    })?;
                Ok(crate::commands::ApiResponse::success(crate::commands::TaskResponse::Created(task)))
            } else {
                Err(AppError::Validation("Invalid task action after validation".to_string()))
            }
        }
        crate::commands::TaskAction::Get { id } => {
            let task = state
                .task_service
                .get_task_async(&id)
                .await
                .map_err(|e| {
                    error!("Task retrieval failed: {}", e);
                    AppError::Database(format!("Failed to get task: {}", e))
                })?;
            match task {
                Some(task) => Ok(crate::commands::ApiResponse::success(crate::commands::TaskResponse::Found(task))),
                None => Ok(crate::commands::ApiResponse::success(crate::commands::TaskResponse::NotFound)),
            }
        }
        crate::commands::TaskAction::Update { id, data } => {
            // Add role check for task update
            check_task_permission!(&current_user.role, "update");

            // Add input validation for update
            let validator = ValidationService::new();
            let validated_action = validator
                .validate_task_action(crate::commands::TaskAction::Update { id: id.clone(), data: data.clone() })
                .await
                .map_err(|e| {
                    error!("Task validation failed: {}", e);
                    AppError::Validation(format!("Task validation failed: {}", e))
                })?;

            if let crate::commands::TaskAction::Update { id: _, data: validated_data } = validated_action {
                let task = state
                    .task_service
                    .update_task_async(validated_data, &current_user.user_id)
                    .await
                    .map_err(|e| {
                        error!("Task update failed: {}", e);
                        AppError::Database(format!("Failed to update task: {}", e))
                    })?;
                Ok(crate::commands::ApiResponse::success(crate::commands::TaskResponse::Updated(task)))
            } else {
                Err(AppError::Validation("Invalid task action after validation".to_string()))
            }
        }
        crate::commands::TaskAction::Delete { id } => {
            // V3: Add role check for task deletion
            check_task_permission!(&current_user.role, "delete");

            state
                .task_service
                .delete_task_async(&id, &current_user.user_id)
                .await
                .map_err(|e| {
                    error!("Task deletion failed: {}", e);
                    AppError::Database(format!("Failed to delete task: {}", e))
                })?;
            Ok(crate::commands::ApiResponse::success(crate::commands::TaskResponse::Deleted))
        }
        crate::commands::TaskAction::List { filters } => {
            // Use the proper task listing implementation
            let request = crate::commands::task::queries::GetTasksWithClientsRequest {
                session_token: session_token.clone(),
                page: None,
                limit: None,
                filter: Some(crate::commands::task_types::TaskFilter {
                    assigned_to: filters.technician_id,
                    client_id: filters.client_id,
                    status: filters.status.map(|s| s.to_string()),
                    priority: filters.priority.map(|p| p.to_string()),
                    region: None, // Will be set by role-based filtering
                    include_completed: Some(false),
                    date_from: None, // TODO: Add date filtering support
                    date_to: None, // TODO: Add date filtering support
                }),
                correlation_id: None,
            };

            // Call the actual implementation
            let result = get_tasks_with_clients(request, state).await?;
            // Convert the result to TaskResponse::List
            match result.data {
                Some(task_list_response) => {
                    Ok(crate::commands::ApiResponse::success(crate::commands::TaskResponse::List(task_list_response)))
                }
                None => {
                    Ok(crate::commands::ApiResponse::error(crate::commands::AppError::NotFound("No tasks found".to_string())))
                }
            }
        }
        crate::commands::TaskAction::GetStatistics => {
            // Call the actual statistics implementation
            let stats_request = crate::commands::task::queries::GetTaskStatisticsRequest {
                session_token: session_token.clone(),
                filter: None, // Get all statistics for the user's role
                correlation_id: None,
            };

            let stats_response = get_task_statistics(stats_request, state).await?;
            match stats_response.data {
                Some(stats) => {
                    // Convert from service TaskStatistics to response TaskStatistics
                    let response_stats = crate::commands::task_types::TaskStatistics {
                        total: stats.total_tasks,
                        completed: stats.completed_tasks,
                        pending: stats.pending_tasks,
                        in_progress: stats.in_progress_tasks,
                        overdue: stats.overdue_tasks,
                    };
                    Ok(crate::commands::ApiResponse::success(crate::commands::TaskResponse::Statistics(response_stats)))
                },
                None => Ok(crate::commands::ApiResponse::error(crate::commands::AppError::NotFound("Statistics not available".to_string()))),
            }
        }
    }
}



