//! Task command facade
//!
//! Thin IPC adapter layer (ADR-005). Each handler authenticates, initialises
//! correlation context, delegates to the application-layer
//! [`TaskCommandService`](crate::domains::tasks::application::services::task_command_service::TaskCommandService),
//! and maps the result into an [`ApiResponse`].
//!
//! Request/response DTO structs live in the sibling `types` module.

use crate::check_task_permission;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::application::services::task_command_service::TaskCommandService;
use crate::domains::tasks::application::services::task_policy_service;
use crate::domains::tasks::domain::models::task::{
    CreateTaskRequest, Task, TaskListResponse, UpdateTaskRequest,
};
use crate::domains::tasks::ipc::task::queries::{
    get_task_statistics, get_tasks_with_clients, GetTaskStatisticsRequest,
    GetTasksWithClientsRequest,
};
use crate::domains::tasks::ipc::task_types::TaskFilter;
use crate::resolve_context;
use tracing::{debug, info};

// Re-export all request/response types so callers see no change.
pub use super::types::{
    AddTaskNoteRequest, BulkImportResponse, DelayTaskRequest, EditTaskRequest,
    ExportTasksCsvRequest, ImportTasksBulkRequest, ReportTaskIssueRequest, SendTaskMessageRequest,
    TaskCrudRequest,
};

/// Construct a per-request [`TaskCommandService`] from shared application state.
fn cmd_service(state: &AppState<'_>) -> TaskCommandService {
    TaskCommandService::new(
        state.task_service.clone(),
        state.task_import_service.clone(),
        state.message_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::notification::NotificationSender>,
        state.calendar_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::task_scheduler::TaskScheduler>,
        state.event_bus.clone(),
    )
}

/// Add a timestamped note to a task.
/// ADR-018: Thin IPC layer
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn add_task_note(
    request: AddTaskNoteRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);

    let result = cmd_service(&state)
        .add_note(&ctx, &request.task_id, &request.note)
        .await?;

    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Send a task-scoped message through the notifications/message domain service.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn send_task_message(
    request: SendTaskMessageRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);

    let result = cmd_service(&state)
        .send_message(
            &ctx,
            &request.task_id,
            &request.message,
            request.message_type.as_deref(),
        )
        .await?;

    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Report a task issue and append it to task notes.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn report_task_issue(
    request: ReportTaskIssueRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);

    let result = cmd_service(&state)
        .report_issue(
            &ctx,
            &request.task_id,
            &request.issue_type,
            &request.description,
            request.severity.as_deref(),
        )
        .await?;

    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Export tasks to CSV command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn export_tasks_csv(
    request: ExportTasksCsvRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    debug!("Exporting tasks to CSV");

    let ctx = resolve_context!(&state, &request.correlation_id);

    let csv_content = cmd_service(&state).export_csv(
        request.filter.as_ref(),
        request.include_client_data.unwrap_or(false),
    )?;

    Ok(ApiResponse::success(csv_content).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Import tasks from CSV command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn import_tasks_bulk(
    request: ImportTasksBulkRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<BulkImportResponse>, AppError> {
    debug!("Bulk importing tasks from CSV");

    let ctx = resolve_context!(&state, &request.correlation_id);

    let response = cmd_service(&state)
        .import_bulk(
            &ctx,
            &request.csv_data,
            request.update_existing.unwrap_or(false),
        )
        .await?;

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Delay task command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn delay_task(
    request: DelayTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    debug!("Delaying task {}", request.task_id);

    let ctx = resolve_context!(&state, &request.correlation_id);

    let updated_task = cmd_service(&state)
        .delay_task(
            &ctx,
            &request.task_id,
            request.new_scheduled_date.as_str(),
            request.additional_notes,
        )
        .await?;

    Ok(ApiResponse::success(updated_task).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Edit task command
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn edit_task(
    request: EditTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    debug!("Editing task {}", request.task_id);

    let ctx = resolve_context!(&state, &request.correlation_id);

    let updated_task = cmd_service(&state)
        .edit_task(&ctx, &request.task_id, &request.data)
        .await?;

    Ok(ApiResponse::success(updated_task).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Validate status change - thin delegate to policy service.
pub fn validate_status_change(
    current: &crate::domains::tasks::domain::models::task::TaskStatus,
    new: &crate::domains::tasks::domain::models::task::TaskStatus,
) -> Result<(), AppError> {
    task_policy_service::validate_status_change(current, new)
}

/// Check permissions for task operations - thin delegate to policy service.
pub fn check_task_permissions(
    auth: &crate::shared::context::AuthContext,
    task: &Task,
    operation: &str,
) -> Result<(), AppError> {
    task_policy_service::check_task_permissions(auth, task, operation)
}

/// Validate that a Technician is not attempting to change restricted fields.
pub fn enforce_technician_field_restrictions(
    req: &crate::domains::tasks::domain::models::task::UpdateTaskRequest,
) -> Result<(), AppError> {
    task_policy_service::enforce_technician_field_restrictions(req)
}

async fn handle_crud_create(
    data: crate::domains::tasks::domain::models::task::CreateTaskRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<crate::commands::ApiResponse<crate::commands::TaskResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    check_task_permission!(&ctx.auth.role, "create");
    let task = cmd_service(&state).create_task(&ctx, data).await?;
    Ok(
        ApiResponse::success(crate::commands::TaskResponse::Created(task))
            .with_correlation_id(Some(ctx.correlation_id.clone())),
    )
}

async fn handle_crud_get(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<crate::commands::ApiResponse<crate::commands::TaskResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    match cmd_service(&state).get_task(&id).await? {
        Some(task) => Ok(
            ApiResponse::success(crate::commands::TaskResponse::Found(task))
                .with_correlation_id(Some(ctx.correlation_id.clone())),
        ),
        None => Ok(
            ApiResponse::success(crate::commands::TaskResponse::NotFound)
                .with_correlation_id(Some(ctx.correlation_id.clone())),
        ),
    }
}

async fn handle_crud_update(
    id: String,
    data: crate::domains::tasks::domain::models::task::UpdateTaskRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<crate::commands::ApiResponse<crate::commands::TaskResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    check_task_permission!(&ctx.auth.role, "update");
    let task = cmd_service(&state).update_task_crud(&ctx, &id, data).await?;
    Ok(
        ApiResponse::success(crate::commands::TaskResponse::Updated(task))
            .with_correlation_id(Some(ctx.correlation_id.clone())),
    )
}

async fn handle_crud_delete(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<crate::commands::ApiResponse<crate::commands::TaskResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    check_task_permission!(&ctx.auth.role, "delete");
    cmd_service(&state).delete_task(&ctx, &id).await?;
    Ok(ApiResponse::success(crate::commands::TaskResponse::Deleted)
        .with_correlation_id(Some(ctx.correlation_id.clone())))
}

async fn handle_crud_list(
    filters: crate::domains::tasks::domain::models::task::TaskQuery,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<crate::commands::ApiResponse<crate::commands::TaskResponse>, AppError> {
    let request = crate::domains::tasks::ipc::task::queries::GetTasksWithClientsRequest {
        page: None,
        limit: None,
        filter: Some(crate::domains::tasks::ipc::task_types::TaskFilter {
            assigned_to: filters.technician_id,
            client_id: filters.client_id,
            status: filters.status.map(|s| s.to_string()),
            priority: filters.priority.map(|p| p.to_string()),
            region: None,
            include_completed: Some(false),
            date_from: None,
            date_to: None,
        }),
        correlation_id: correlation_id.clone(),
    };

    let result = get_tasks_with_clients(request, state).await?;
    let response_correlation_id = result.correlation_id.clone();
    match result.data {
        Some(task_list_response) => Ok(ApiResponse::success(
            crate::commands::TaskResponse::List(task_list_response),
        )
        .with_correlation_id(response_correlation_id)),
        None => Ok(
            ApiResponse::error(AppError::NotFound("No tasks found".to_string()))
                .with_correlation_id(response_correlation_id),
        ),
    }
}

async fn handle_crud_statistics(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<crate::commands::ApiResponse<crate::commands::TaskResponse>, AppError> {
    let stats_request =
        crate::domains::tasks::ipc::task::queries::GetTaskStatisticsRequest {
            filter: None,
            correlation_id: correlation_id.clone(),
        };

    let stats_response = get_task_statistics(stats_request, state).await?;
    let response_correlation_id = stats_response.correlation_id.clone();
    match stats_response.data {
        Some(stats) => {
            let response_stats = crate::domains::tasks::ipc::task_types::TaskStatistics {
                total: stats.total_tasks,
                completed: stats.completed_tasks,
                pending: stats.pending_tasks,
                in_progress: stats.in_progress_tasks,
                overdue: stats.overdue_tasks,
            };
            Ok(
                ApiResponse::success(crate::commands::TaskResponse::Statistics(
                    response_stats,
                ))
                .with_correlation_id(response_correlation_id),
            )
        }
        None => Ok(ApiResponse::error(AppError::NotFound(
            "Statistics not available".to_string(),
        ))
        .with_correlation_id(response_correlation_id)),
    }
}

// ── Individual thin handlers (ADR-018) ────────────────────────────────────────

/// Create a new task.
/// ADR-018: resolve_context → delegate to service → return.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn task_create(
    data: CreateTaskRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    check_task_permission!(&ctx.auth.role, "create");
    let task = cmd_service(&state).create_task(&ctx, data).await?;
    Ok(ApiResponse::success(task).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Get a single task by ID.
/// ADR-018: resolve_context → delegate to service → return.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn task_get(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<Task>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let task = cmd_service(&state).get_task(&id).await?;
    Ok(ApiResponse::success(task).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Update an existing task.
/// ADR-018: resolve_context → delegate to service → return.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn task_update(
    id: String,
    data: UpdateTaskRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    check_task_permission!(&ctx.auth.role, "update");
    let task = cmd_service(&state).update_task_crud(&ctx, &id, data).await?;
    Ok(ApiResponse::success(task).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Delete a task by ID.
/// ADR-018: resolve_context → delegate to service → return.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn task_delete(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    check_task_permission!(&ctx.auth.role, "delete");
    cmd_service(&state).delete_task(&ctx, &id).await?;
    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// List tasks with optional filters and pagination.
/// ADR-018: resolve_context → delegate to service → return.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn task_list(
    filter: Option<TaskFilter>,
    page: Option<u32>,
    limit: Option<u32>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<TaskListResponse>, AppError> {
    let request = GetTasksWithClientsRequest {
        filter,
        page,
        limit,
        correlation_id,
    };
    get_tasks_with_clients(request, state).await
}

/// Get aggregated task statistics.
/// ADR-018: resolve_context → delegate to service → return.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn task_statistics(
    filter: Option<TaskFilter>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::domains::tasks::infrastructure::task_statistics::TaskStatistics>, AppError>
{
    let request = GetTaskStatisticsRequest {
        filter,
        correlation_id,
    };
    get_task_statistics(request, state).await
}

// ── Deprecated unified handler ────────────────────────────────────────────────

/// **Deprecated** — use the individual `task_create`, `task_get`, `task_update`,
/// `task_delete`, `task_list`, `task_statistics` commands instead.
///
/// Kept as a shim so existing frontend code continues to work during migration.
#[deprecated(note = "Use individual task_create/task_get/task_update/task_delete/task_list/task_statistics commands")]
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn task_crud(
    request: TaskCrudRequest,
    state: AppState<'_>,
) -> Result<crate::commands::ApiResponse<crate::commands::TaskResponse>, AppError> {
    let action = request.action;
    let correlation_id = request.correlation_id.clone();
    info!(
        correlation_id = %correlation_id.as_deref().unwrap_or("none"),
        "task_crud command received (deprecated) - action: {:?}",
        action
    );

    match action {
        crate::commands::TaskAction::Create { data } => {
            handle_crud_create(data, correlation_id, state).await
        }
        crate::commands::TaskAction::Get { id } => {
            handle_crud_get(id, correlation_id, state).await
        }
        crate::commands::TaskAction::Update { id, data } => {
            handle_crud_update(id, data, correlation_id, state).await
        }
        crate::commands::TaskAction::Delete { id } => {
            handle_crud_delete(id, correlation_id, state).await
        }
        crate::commands::TaskAction::List { filters } => {
            handle_crud_list(filters, correlation_id, state).await
        }
        crate::commands::TaskAction::GetStatistics => {
            handle_crud_statistics(correlation_id, state).await
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::AppError;
    use crate::domains::tasks::domain::models::task::{
        Task, TaskPriority, TaskStatus, UpdateTaskRequest,
    };
    use crate::shared::context::AuthContext;
    use crate::shared::contracts::auth::{UserRole, UserSession};

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
            expires_at: "2099-01-01T00:00:00Z".to_string(),
            last_activity: "2025-01-01T00:00:00Z".to_string(),
            created_at: "2025-01-01T00:00:00Z".to_string(),
        }
    }

    fn make_auth(user_id: &str, role: UserRole) -> AuthContext {
        AuthContext::from(&make_session(user_id, role))
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ check_task_permissions tests ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

    #[test]
    fn test_admin_can_edit_any_task() {
        let auth = make_auth("admin-1", UserRole::Admin);
        let task = make_task(Some("tech-1"), TaskStatus::InProgress);
        assert!(check_task_permissions(&auth, &task, "edit").is_ok());
    }

    #[test]
    fn test_supervisor_can_edit_any_task() {
        let auth = make_auth("sup-1", UserRole::Supervisor);
        let task = make_task(Some("tech-1"), TaskStatus::InProgress);
        assert!(check_task_permissions(&auth, &task, "edit").is_ok());
    }

    #[test]
    fn test_technician_can_edit_own_assigned_task() {
        let auth = make_auth("tech-1", UserRole::Technician);
        let task = make_task(Some("tech-1"), TaskStatus::InProgress);
        assert!(check_task_permissions(&auth, &task, "edit").is_ok());
    }

    #[test]
    fn test_technician_cannot_edit_unassigned_task() {
        let auth = make_auth("tech-1", UserRole::Technician);
        let task = make_task(Some("tech-other"), TaskStatus::InProgress);
        let result = check_task_permissions(&auth, &task, "edit");
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
        let auth = make_auth("viewer-1", UserRole::Viewer);
        let task = make_task(None, TaskStatus::Pending);
        let result = check_task_permissions(&auth, &task, "edit");
        assert!(result.is_err());
    }

    #[test]
    fn test_viewer_can_view_task() {
        let auth = make_auth("viewer-1", UserRole::Viewer);
        let task = make_task(None, TaskStatus::Pending);
        assert!(check_task_permissions(&auth, &task, "view").is_ok());
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ enforce_technician_field_restrictions tests ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ validate_status_change tests ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

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
