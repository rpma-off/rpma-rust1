//! Task command facade
//!
//! This module provides the main API interface for task operations,
//! delegating to specialized modules while maintaining backward compatibility.

use crate::authenticate;
use crate::check_task_permission;
use crate::commands::{ApiResponse, AppError, AppState, TaskAction};
use crate::domains::tasks::domain::models::task::Task;
use crate::shared::services::validation::ValidationService;
use serde::Deserialize;
use std::fmt::Debug;
use tracing::{debug, error, info, warn};

// Re-export specialized modules for internal use
pub use super::queries::*;
pub use super::validation::validate_task_assignment_change;
pub use super::validation::*;

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
    pub data: crate::domains::tasks::domain::models::task::UpdateTaskRequest,
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

fn append_note(existing_notes: Option<&str>, entry: &str) -> String {
    match existing_notes {
        Some(existing) if !existing.trim().is_empty() => {
            format!("{}\n{}", existing.trim_end(), entry)
        }
        _ => entry.to_string(),
    }
}

/// Add a timestamped note to a task.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn add_task_note(
    request: AddTaskNoteRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let note = request.note.trim();
    if note.is_empty() {
        return Err(AppError::Validation("Note cannot be empty".to_string()));
    }

    let task = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    check_task_permissions(&current_user, &task, "edit")?;

    let note_entry = format!(
        "[{}][note][{}] {}",
        chrono::Utc::now().to_rfc3339(),
        current_user.user_id,
        note
    );
    let updated_notes = append_note(task.notes.as_deref(), &note_entry);

    let update_request = crate::domains::tasks::domain::models::task::UpdateTaskRequest {
        id: Some(task.id.clone()),
        notes: Some(updated_notes),
        ..Default::default()
    };

    state
        .task_service
        .update_task_async(update_request, &current_user.user_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to add task note: {}", e)))?;

    Ok(
        ApiResponse::success(format!("Note added to task {}", request.task_id))
            .with_correlation_id(Some(correlation_id.clone())),
    )
}

/// Send a task-scoped message through the notifications/message domain service.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn send_task_message(
    request: SendTaskMessageRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let body = request.message.trim();
    if body.is_empty() {
        return Err(AppError::Validation("Message cannot be empty".to_string()));
    }

    let task = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    check_task_permissions(&current_user, &task, "edit")?;

    let message_type = request
        .message_type
        .clone()
        .unwrap_or_else(|| "in_app".to_string())
        .to_lowercase();

    if !matches!(message_type.as_str(), "email" | "sms" | "in_app") {
        return Err(AppError::Validation(format!(
            "Unsupported message_type: {}",
            message_type
        )));
    }

    let recipient_email = if message_type == "email" {
        task.customer_email.clone()
    } else {
        None
    };
    if message_type == "email" && recipient_email.is_none() {
        return Err(AppError::Validation(
            "Task has no customer email for email message".to_string(),
        ));
    }

    let recipient_phone = if message_type == "sms" {
        task.customer_phone.clone()
    } else {
        None
    };
    if message_type == "sms" && recipient_phone.is_none() {
        return Err(AppError::Validation(
            "Task has no customer phone for SMS message".to_string(),
        ));
    }

    let send_request = crate::domains::notifications::domain::models::message::SendMessageRequest {
        message_type,
        recipient_id: task.client_id.clone().or(task.technician_id.clone()),
        recipient_email,
        recipient_phone,
        subject: Some(format!("Task {} update", task.task_number)),
        body: body.to_string(),
        template_id: None,
        task_id: Some(task.id.clone()),
        client_id: task.client_id.clone(),
        priority: Some("normal".to_string()),
        scheduled_at: None,
        correlation_id: request.correlation_id.clone(),
    };

    let sent_message = state.message_service.send_message(&send_request).await?;

    Ok(
        ApiResponse::success(format!("Message queued: {}", sent_message.id))
            .with_correlation_id(Some(correlation_id.clone())),
    )
}

/// Report a task issue and append it to task notes.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn report_task_issue(
    request: ReportTaskIssueRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let issue_type = request.issue_type.trim();
    let description = request.description.trim();
    if issue_type.is_empty() || description.is_empty() {
        return Err(AppError::Validation(
            "issue_type and description are required".to_string(),
        ));
    }

    let severity = request
        .severity
        .clone()
        .unwrap_or_else(|| "medium".to_string())
        .to_lowercase();
    if !matches!(severity.as_str(), "low" | "medium" | "high" | "critical") {
        return Err(AppError::Validation(format!(
            "Unsupported severity: {}",
            severity
        )));
    }

    let task = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    check_task_permissions(&current_user, &task, "edit")?;

    let issue_entry = format!(
        "[{}][issue:{}][severity:{}][{}] {}",
        chrono::Utc::now().to_rfc3339(),
        issue_type,
        severity,
        current_user.user_id,
        description
    );
    let updated_notes = append_note(task.notes.as_deref(), &issue_entry);

    let update_request = crate::domains::tasks::domain::models::task::UpdateTaskRequest {
        id: Some(task.id.clone()),
        notes: Some(updated_notes),
        ..Default::default()
    };

    state
        .task_service
        .update_task_async(update_request, &current_user.user_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to report task issue: {}", e)))?;

    if matches!(severity.as_str(), "high" | "critical") {
        let escalation = crate::domains::notifications::domain::models::message::SendMessageRequest {
            message_type: "in_app".to_string(),
            recipient_id: task.technician_id.clone(),
            recipient_email: None,
            recipient_phone: None,
            subject: Some(format!("Task {} issue escalation", task.task_number)),
            body: format!("{} (severity: {})", description, severity),
            template_id: None,
            task_id: Some(task.id.clone()),
            client_id: task.client_id.clone(),
            priority: Some("high".to_string()),
            scheduled_at: None,
            correlation_id: request.correlation_id.clone(),
        };

        if let Err(err) = state.message_service.send_message(&escalation).await {
            warn!(
                error = %err,
                task_id = %task.id,
                "Issue escalation message could not be sent"
            );
        }
    }

    Ok(
        ApiResponse::success(format!("Issue reported for task {}", request.task_id))
            .with_correlation_id(Some(correlation_id.clone())),
    )
}

// Delegate to validation module
pub use super::validation::check_task_assignment;
pub use super::validation::check_task_availability;

// Explicit import for TaskFilter
use crate::domains::tasks::ipc::task_types::TaskFilter;

/// Export tasks to CSV command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn export_tasks_csv(
    request: ExportTasksCsvRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    debug!("Exporting tasks to CSV");

    // Initialize correlation context
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Authenticate user
    let _session = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&_session.user_id);

    // Build query for export
    let query = crate::domains::tasks::domain::models::task::TaskQuery {
        page: Some(1),
        limit: Some(10000), // Large limit for export
        status: request
            .filter
            .as_ref()
            .and_then(|f| f.status.as_ref())
            .and_then(|s| match s.as_str() {
                "pending" => Some(crate::domains::tasks::domain::models::task::TaskStatus::Pending),
                "in_progress" => Some(crate::domains::tasks::domain::models::task::TaskStatus::InProgress),
                "completed" => Some(crate::domains::tasks::domain::models::task::TaskStatus::Completed),
                "cancelled" => Some(crate::domains::tasks::domain::models::task::TaskStatus::Cancelled),
                _ => None,
            }),
        technician_id: request.filter.as_ref().and_then(|f| f.assigned_to.clone()),
        client_id: request.filter.as_ref().and_then(|f| f.client_id.clone()),
        priority: request
            .filter
            .as_ref()
            .and_then(|f| f.priority.as_ref())
            .and_then(|p| match p.as_str() {
                "low" => Some(crate::domains::tasks::domain::models::task::TaskPriority::Low),
                "medium" => Some(crate::domains::tasks::domain::models::task::TaskPriority::Medium),
                "high" => Some(crate::domains::tasks::domain::models::task::TaskPriority::High),
                "urgent" => Some(crate::domains::tasks::domain::models::task::TaskPriority::Urgent),
                _ => None,
            }),
        search: None,
        from_date: request
            .filter
            .as_ref()
            .and_then(|f| f.date_from.map(|d| d.to_rfc3339())),
        to_date: request
            .filter
            .as_ref()
            .and_then(|f| f.date_to.map(|d| d.to_rfc3339())),
        sort_by: "created_at".to_string(),
        sort_order: crate::domains::tasks::domain::models::task::SortOrder::Desc,
    };

    // Get tasks with client information through import service
    let tasks = state
        .task_service
        .get_tasks_for_export(query)
        .map_err(|e| AppError::Database(format!("Failed to get tasks for export: {}", e)))?;

    if tasks.is_empty() {
        warn!("No tasks found for export");
        return Ok(ApiResponse::success(
            "ID,Title,Description,Status,Priority,Client Name,Client Email,Created At,Updated At\n"
                .to_string(),
        )
        .with_correlation_id(Some(correlation_id.clone())));
    }

    // Export to CSV using the service
    let csv_content = state
        .task_service
        .export_to_csv(&tasks, request.include_client_data.unwrap_or(false))
        .map_err(|e| AppError::Database(format!("Failed to export tasks: {}", e)))?;

    info!("Successfully exported {} tasks to CSV", tasks.len());
    Ok(ApiResponse::success(csv_content).with_correlation_id(Some(correlation_id.clone())))
}

/// Import tasks from CSV command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn import_tasks_bulk(
    request: ImportTasksBulkRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<BulkImportResponse>, AppError> {
    debug!("Bulk importing tasks from CSV");

    // Initialize correlation context
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);

    // Check permissions - only supervisors and admins can bulk import
    if !matches!(
        session.role,
        crate::domains::auth::domain::models::auth::UserRole::Admin | crate::domains::auth::domain::models::auth::UserRole::Supervisor
    ) {
        return Err(AppError::Authorization(
            "Only supervisors and admins can perform bulk imports".to_string(),
        ));
    }

    // Use TaskImportService to parse CSV and get task requests
    let import_result = state
        .task_service
        .import_from_csv(
            &request.csv_data,
            &session.user_id,
            request.update_existing.unwrap_or(false),
        )
        .await
        .map_err(|e| AppError::Database(format!("Import failed: {}", e)))?;

    // Create tasks from parsed data
    let errors = import_result.errors.clone();

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

    info!(
        "Bulk import completed: {} processed, {} successful, {} failed, {} duplicates skipped",
        response.total_processed, response.successful, response.failed, response.duplicates_skipped
    );

    Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
}

/// Delay task command
#[tracing::instrument(skip(state))]
#[tauri::command]

pub async fn delay_task(
    request: DelayTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    debug!("Delaying task {}", request.task_id);

    // Initialize correlation context
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);

    // Get current task
    let task_option = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| {
            debug!("Task not found: {}", e);
            AppError::NotFound(format!("Task not found: {}", request.task_id))
        })?;

    let task = task_option
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    // Check permissions
    check_task_permissions(&session, &task, "edit")?;

    // Use CalendarService.schedule_task to update both task and calendar_events atomically
    let calendar_service = crate::domains::calendar::infrastructure::calendar::CalendarService::new(state.db.clone());
    calendar_service
        .schedule_task(
            request.task_id.clone(),
            request.new_scheduled_date.clone(),
            None,
            None,
            &session.user_id,
        )
        .await
        .map_err(|e| {
            error!("Task delay failed: {}", e);
            AppError::Database(format!("Failed to delay task: {}", e))
        })?;

    // Update notes if provided
    if request.additional_notes.is_some() {
        let update_request = crate::domains::tasks::domain::models::task::UpdateTaskRequest {
            id: Some(request.task_id.clone()),
            notes: request.additional_notes.clone(),
            ..Default::default()
        };
        state
            .task_service
            .update_task_async(update_request, &session.user_id)
            .await
            .map_err(|e| {
                error!("Task notes update failed: {}", e);
                AppError::Database(format!("Failed to update task notes: {}", e))
            })?;
    }

    // Re-fetch the updated task
    let updated_task = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| {
            error!("Failed to re-fetch task: {}", e);
            AppError::Database(format!("Failed to re-fetch task: {}", e))
        })?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    info!(
        "Task {} delayed to {}",
        request.task_id, request.new_scheduled_date
    );
    Ok(ApiResponse::success(updated_task).with_correlation_id(Some(correlation_id.clone())))
}

/// Edit task command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn edit_task(
    request: EditTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    debug!("Editing task {}", request.task_id);

    // Initialize correlation context
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&session.user_id);

    // Get current task
    let task_option = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| {
            debug!("Task not found: {}", e);
            AppError::NotFound(format!("Task not found: {}", request.task_id))
        })?;

    let task = task_option
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    // Check permissions
    check_task_permissions(&session, &task, "edit")?;

    // Enforce field restrictions for Technician role
    if session.role == crate::domains::auth::domain::models::auth::UserRole::Technician {
        enforce_technician_field_restrictions(&request.data)?;
    }

    // Create UpdateTaskRequest from the incoming data
    let update_request = crate::domains::tasks::domain::models::task::UpdateTaskRequest {
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

    Ok(ApiResponse::success(updated_task).with_correlation_id(Some(correlation_id.clone())))
}

/// Validate status change
pub fn validate_status_change(
    current: &crate::domains::tasks::domain::models::task::TaskStatus,
    new: &crate::domains::tasks::domain::models::task::TaskStatus,
) -> Result<(), AppError> {
    crate::domains::tasks::infrastructure::task_validation::validate_status_transition(current, new)
        .map_err(AppError::TaskInvalidTransition)
}

/// Check permissions for task operations
pub fn check_task_permissions(
    session: &crate::domains::auth::domain::models::auth::UserSession,
    task: &Task,
    operation: &str,
) -> Result<(), AppError> {
    match session.role {
        crate::domains::auth::domain::models::auth::UserRole::Admin => Ok(()),
        crate::domains::auth::domain::models::auth::UserRole::Supervisor => Ok(()),
        crate::domains::auth::domain::models::auth::UserRole::Technician => {
            // Technician can only operate on their assigned tasks
            if task.technician_id.as_ref() == Some(&session.user_id) {
                Ok(())
            } else {
                Err(AppError::Authorization(
                    "Technician can only operate on their assigned tasks".to_string(),
                ))
            }
        }
        crate::domains::auth::domain::models::auth::UserRole::Viewer => {
            // Viewer can only view tasks
            match operation {
                "view" => Ok(()),
                _ => Err(AppError::Authorization(
                    "Viewer can only view tasks".to_string(),
                )),
            }
        }
    }
}

/// Fields that a Technician is allowed to modify on their assigned tasks.
const TECHNICIAN_ALLOWED_FIELDS: &[&str] = &[
    "status",
    "notes",
    "checklist_completed",
    "lot_film",
    "actual_duration",
];

/// Validate that a Technician is not attempting to change restricted fields.
///
/// Returns an error listing any forbidden fields that the request tries to modify.
pub fn enforce_technician_field_restrictions(
    req: &crate::domains::tasks::domain::models::task::UpdateTaskRequest,
) -> Result<(), AppError> {
    let mut forbidden: Vec<&str> = Vec::new();

    if req.title.is_some() {
        forbidden.push("title");
    }
    if req.description.is_some() {
        forbidden.push("description");
    }
    if req.priority.is_some() {
        forbidden.push("priority");
    }
    if req.vehicle_plate.is_some() {
        forbidden.push("vehicle_plate");
    }
    if req.vehicle_model.is_some() {
        forbidden.push("vehicle_model");
    }
    if req.vehicle_year.is_some() {
        forbidden.push("vehicle_year");
    }
    if req.vehicle_make.is_some() {
        forbidden.push("vehicle_make");
    }
    if req.vin.is_some() {
        forbidden.push("vin");
    }
    if req.ppf_zones.is_some() {
        forbidden.push("ppf_zones");
    }
    if req.custom_ppf_zones.is_some() {
        forbidden.push("custom_ppf_zones");
    }
    if req.client_id.is_some() {
        forbidden.push("client_id");
    }
    if req.customer_name.is_some() {
        forbidden.push("customer_name");
    }
    if req.customer_email.is_some() {
        forbidden.push("customer_email");
    }
    if req.customer_phone.is_some() {
        forbidden.push("customer_phone");
    }
    if req.customer_address.is_some() {
        forbidden.push("customer_address");
    }
    if req.scheduled_date.is_some() {
        forbidden.push("scheduled_date");
    }
    if req.estimated_duration.is_some() {
        forbidden.push("estimated_duration");
    }
    if req.technician_id.is_some() {
        forbidden.push("technician_id");
    }
    if req.template_id.is_some() {
        forbidden.push("template_id");
    }
    if req.workflow_id.is_some() {
        forbidden.push("workflow_id");
    }

    if forbidden.is_empty() {
        Ok(())
    } else {
        Err(AppError::Authorization(format!(
            "Technician cannot modify fields: {}. Allowed: {}",
            forbidden.join(", "),
            TECHNICIAN_ALLOWED_FIELDS.join(", ")
        )))
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
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("task_crud command received - action: {:?}", action);

    // Authenticate user
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

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

            if let crate::commands::TaskAction::Create {
                data: validated_data,
            } = validated_action
            {
                let task = state
                    .task_service
                    .create_task_async(validated_data, &current_user.user_id)
                    .await
                    .map_err(|e| {
                        error!("Task creation failed: {}", e);
                        AppError::Database(format!("Failed to create task: {}", e))
                    })?;
                Ok(
                    crate::commands::ApiResponse::success(crate::commands::TaskResponse::Created(
                        task,
                    ))
                    .with_correlation_id(Some(correlation_id.clone())),
                )
            } else {
                Err(AppError::Validation(
                    "Invalid task action after validation".to_string(),
                ))
            }
        }
        crate::commands::TaskAction::Get { id } => {
            let task = state.task_service.get_task_async(&id).await.map_err(|e| {
                error!("Task retrieval failed: {}", e);
                AppError::Database(format!("Failed to get task: {}", e))
            })?;
            match task {
                Some(task) => Ok(crate::commands::ApiResponse::success(
                    crate::commands::TaskResponse::Found(task),
                )
                .with_correlation_id(Some(correlation_id.clone()))),
                None => Ok(crate::commands::ApiResponse::success(
                    crate::commands::TaskResponse::NotFound,
                )
                .with_correlation_id(Some(correlation_id.clone()))),
            }
        }
        crate::commands::TaskAction::Update { id, data } => {
            // Add role check for task update
            check_task_permission!(&current_user.role, "update");

            // Add input validation for update
            let validator = ValidationService::new();
            let validated_action = validator
                .validate_task_action(crate::commands::TaskAction::Update {
                    id: id.clone(),
                    data: data.clone(),
                })
                .await
                .map_err(|e| {
                    error!("Task validation failed: {}", e);
                    AppError::Validation(format!("Task validation failed: {}", e))
                })?;

            if let crate::commands::TaskAction::Update {
                id: _,
                data: validated_data,
            } = validated_action
            {
                let task = state
                    .task_service
                    .update_task_async(validated_data, &current_user.user_id)
                    .await
                    .map_err(|e| {
                        error!("Task update failed: {}", e);
                        AppError::Database(format!("Failed to update task: {}", e))
                    })?;
                Ok(
                    crate::commands::ApiResponse::success(crate::commands::TaskResponse::Updated(
                        task,
                    ))
                    .with_correlation_id(Some(correlation_id.clone())),
                )
            } else {
                Err(AppError::Validation(
                    "Invalid task action after validation".to_string(),
                ))
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
            Ok(
                crate::commands::ApiResponse::success(crate::commands::TaskResponse::Deleted)
                    .with_correlation_id(Some(correlation_id.clone())),
            )
        }
        crate::commands::TaskAction::List { filters } => {
            // Use the proper task listing implementation
            let request = crate::domains::tasks::ipc::task::queries::GetTasksWithClientsRequest {
                session_token: session_token.clone(),
                page: None,
                limit: None,
                filter: Some(crate::domains::tasks::ipc::task_types::TaskFilter {
                    assigned_to: filters.technician_id,
                    client_id: filters.client_id,
                    status: filters.status.map(|s| s.to_string()),
                    priority: filters.priority.map(|p| p.to_string()),
                    region: None, // Will be set by role-based filtering
                    include_completed: Some(false),
                    date_from: None, // TODO: Add date filtering support
                    date_to: None,   // TODO: Add date filtering support
                }),
                correlation_id: Some(correlation_id.clone()),
            };

            // Call the actual implementation
            let result = get_tasks_with_clients(request, state).await?;
            // Convert the result to TaskResponse::List
            match result.data {
                Some(task_list_response) => Ok(crate::commands::ApiResponse::success(
                    crate::commands::TaskResponse::List(task_list_response),
                )
                .with_correlation_id(Some(correlation_id.clone()))),
                None => Ok(crate::commands::ApiResponse::error(
                    crate::commands::AppError::NotFound("No tasks found".to_string()),
                )
                .with_correlation_id(Some(correlation_id.clone()))),
            }
        }
        crate::commands::TaskAction::GetStatistics => {
            // Call the actual statistics implementation
            let stats_request =
                crate::domains::tasks::ipc::task::queries::GetTaskStatisticsRequest {
                    session_token: session_token.clone(),
                    filter: None, // Get all statistics for the user's role
                    correlation_id: Some(correlation_id.clone()),
                };

            let stats_response = get_task_statistics(stats_request, state).await?;
            match stats_response.data {
                Some(stats) => {
                    // Convert from service TaskStatistics to response TaskStatistics
                    let response_stats = crate::domains::tasks::ipc::task_types::TaskStatistics {
                        total: stats.total_tasks,
                        completed: stats.completed_tasks,
                        pending: stats.pending_tasks,
                        in_progress: stats.in_progress_tasks,
                        overdue: stats.overdue_tasks,
                    };
                    Ok(crate::commands::ApiResponse::success(
                        crate::commands::TaskResponse::Statistics(response_stats),
                    )
                    .with_correlation_id(Some(correlation_id.clone())))
                }
                None => Ok(crate::commands::ApiResponse::error(
                    crate::commands::AppError::NotFound("Statistics not available".to_string()),
                )
                .with_correlation_id(Some(correlation_id.clone()))),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::AppError;
    use crate::domains::auth::domain::models::auth::{UserRole, UserSession};
    use crate::domains::tasks::domain::models::task::{Task, TaskPriority, TaskStatus, UpdateTaskRequest};

    fn make_task(technician_id: Option<&str>, status: TaskStatus) -> Task {
        Task {
            id: "task-1".to_string(),
            task_number: "20250101-001".to_string(),
            title: "Test".to_string(),
            description: None,
            vehicle_plate: Some("ABC123".to_string()),
            vehicle_model: Some("Model X".to_string()),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: None,
            custom_ppf_zones: None,
            status,
            priority: TaskPriority::Medium,
            technician_id: technician_id.map(|s| s.to_string()),
            assigned_at: None,
            assigned_by: None,
            scheduled_date: None,
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            template_id: None,
            workflow_id: None,
            workflow_status: None,
            current_workflow_step_id: None,
            started_at: None,
            completed_at: None,
            completed_steps: None,
            client_id: None,
            customer_name: None,
            customer_email: None,
            customer_phone: None,
            customer_address: None,
            external_id: None,
            lot_film: None,
            checklist_completed: false,
            notes: None,
            tags: None,
            estimated_duration: None,
            actual_duration: None,
            created_at: 0,
            updated_at: 0,
            creator_id: None,
            created_by: None,
            updated_by: None,
            deleted_at: None,
            deleted_by: None,
            synced: false,
            last_synced_at: None,
        }
    }

    fn make_session(user_id: &str, role: UserRole) -> UserSession {
        UserSession {
            id: "session-1".to_string(),
            user_id: user_id.to_string(),
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            role,
            token: "tok".to_string(),
            refresh_token: None,
            expires_at: "2099-01-01T00:00:00Z".to_string(),
            last_activity: "2025-01-01T00:00:00Z".to_string(),
            created_at: "2025-01-01T00:00:00Z".to_string(),
            device_info: None,
            ip_address: None,
            user_agent: None,
            location: None,
            two_factor_verified: false,
            session_timeout_minutes: None,
        }
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ check_task_permissions tests Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    #[test]
    fn test_admin_can_edit_any_task() {
        let session = make_session("admin-1", UserRole::Admin);
        let task = make_task(Some("tech-1"), TaskStatus::InProgress);
        assert!(check_task_permissions(&session, &task, "edit").is_ok());
    }

    #[test]
    fn test_supervisor_can_edit_any_task() {
        let session = make_session("sup-1", UserRole::Supervisor);
        let task = make_task(Some("tech-1"), TaskStatus::InProgress);
        assert!(check_task_permissions(&session, &task, "edit").is_ok());
    }

    #[test]
    fn test_technician_can_edit_own_assigned_task() {
        let session = make_session("tech-1", UserRole::Technician);
        let task = make_task(Some("tech-1"), TaskStatus::InProgress);
        assert!(check_task_permissions(&session, &task, "edit").is_ok());
    }

    #[test]
    fn test_technician_cannot_edit_unassigned_task() {
        let session = make_session("tech-1", UserRole::Technician);
        let task = make_task(Some("tech-other"), TaskStatus::InProgress);
        let result = check_task_permissions(&session, &task, "edit");
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::Authorization(msg) => {
                assert!(msg.contains("assigned"));
            }
            _ => panic!("Expected Authorization error"),
        }
    }

    #[test]
    fn test_viewer_cannot_edit_task() {
        let session = make_session("viewer-1", UserRole::Viewer);
        let task = make_task(None, TaskStatus::Pending);
        let result = check_task_permissions(&session, &task, "edit");
        assert!(result.is_err());
    }

    #[test]
    fn test_viewer_can_view_task() {
        let session = make_session("viewer-1", UserRole::Viewer);
        let task = make_task(None, TaskStatus::Pending);
        assert!(check_task_permissions(&session, &task, "view").is_ok());
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ enforce_technician_field_restrictions tests Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    #[test]
    fn test_technician_allowed_fields_pass() {
        let req = UpdateTaskRequest {
            notes: Some("Updated note".to_string()),
            status: Some(TaskStatus::InProgress),
            checklist_completed: Some(true),
            lot_film: Some("LOT-123".to_string()),
            ..Default::default()
        };
        assert!(enforce_technician_field_restrictions(&req).is_ok());
    }

    #[test]
    fn test_technician_forbidden_title_change() {
        let req = UpdateTaskRequest {
            title: Some("New Title".to_string()),
            ..Default::default()
        };
        let result = enforce_technician_field_restrictions(&req);
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::Authorization(msg) => {
                assert!(msg.contains("title"));
                assert!(msg.contains("Technician cannot modify"));
            }
            _ => panic!("Expected Authorization error"),
        }
    }

    #[test]
    fn test_technician_forbidden_technician_id_change() {
        let req = UpdateTaskRequest {
            technician_id: Some("other-tech".to_string()),
            ..Default::default()
        };
        let result = enforce_technician_field_restrictions(&req);
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::Authorization(msg) => {
                assert!(msg.contains("technician_id"));
            }
            _ => panic!("Expected Authorization error"),
        }
    }

    #[test]
    fn test_technician_forbidden_multiple_fields() {
        let req = UpdateTaskRequest {
            title: Some("New Title".to_string()),
            priority: Some(TaskPriority::High),
            vehicle_plate: Some("NEW-PLATE".to_string()),
            ..Default::default()
        };
        let result = enforce_technician_field_restrictions(&req);
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::Authorization(msg) => {
                assert!(msg.contains("title"));
                assert!(msg.contains("priority"));
                assert!(msg.contains("vehicle_plate"));
            }
            _ => panic!("Expected Authorization error"),
        }
    }

    #[test]
    fn test_technician_empty_request_passes() {
        let req = UpdateTaskRequest::default();
        assert!(enforce_technician_field_restrictions(&req).is_ok());
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ validate_status_change tests Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    #[test]
    fn test_validate_status_change_valid() {
        assert!(validate_status_change(&TaskStatus::Draft, &TaskStatus::Pending).is_ok());
    }

    #[test]
    fn test_validate_status_change_invalid_returns_task_invalid_transition() {
        let result = validate_status_change(&TaskStatus::Completed, &TaskStatus::Draft);
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::TaskInvalidTransition(_) => {}
            other => panic!("Expected TaskInvalidTransition, got: {:?}", other),
        }
    }
}
