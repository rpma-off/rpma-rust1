use crate::check_task_permission;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::application::services::task_policy_service;
use crate::domains::tasks::domain::models::status::{StatusDistribution, StatusTransitionRequest};
use crate::domains::tasks::domain::models::task::Task;
use crate::resolve_context;
use crate::shared::services::event_bus::{event_factory, EventPublisher};
use tracing::warn;

/// Transition a task to a new status with validation.
///
/// RBAC: Admin and Supervisor may transition any task; Technician may only
/// transition tasks they are assigned to; Viewer is not permitted.
/// ADR-018: Thin IPC layer
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn task_transition_status(
    request: StatusTransitionRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);

    // Viewers cannot change task status (status transitions are "update" operations).
    if let Err(err) = (|| -> Result<(), AppError> {
        check_task_permission!(&ctx.auth.role, "update");
        Ok(())
    })() {
        warn!(
            action = "DENY_TASK_STATUS_TRANSITION",
            user_role = ?ctx.auth.role,
            task_id = %request.task_id,
            correlation_id = %ctx.correlation_id,
            "Unauthorized task status transition attempt"
        );
        return Err(err);
    }

    let old_status = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?
        .status;

    // For Technicians, verify they are assigned to this task.
    if ctx.auth.role == crate::shared::contracts::auth::UserRole::Technician {
        let task = state
            .task_service
            .get_task_async(&request.task_id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?
            .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

        task_policy_service::check_task_permissions(&ctx.auth, &task, "edit")?;
    }

    let task = state.task_service.transition_status(
        &request.task_id,
        &request.new_status,
        request.reason.as_deref(),
        &ctx.auth.user_id,
    )?;

    let status_event = event_factory::task_status_changed_with_ctx(
        task.id.clone(),
        old_status.to_string(),
        task.status.to_string(),
        ctx.auth.user_id.clone(),
        ctx.correlation_id.clone(),
        request.reason.clone(),
    );
    if let Err(e) = state.event_bus.publish(status_event) {
        warn!(
            task_id = %task.id,
            correlation_id = %ctx.correlation_id,
            "Failed to publish TaskStatusChanged event from task_transition_status: {}",
            e
        );
    }

    Ok(ApiResponse::success(task).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Get status distribution for all tasks.
///
/// RBAC: all authenticated roles may read the distribution.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn task_get_status_distribution(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<StatusDistribution>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let distribution = state.task_service.get_status_distribution()?;

    Ok(ApiResponse::success(distribution).with_correlation_id(Some(ctx.correlation_id.clone())))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::contracts::auth::{UserRole, UserSession};

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

    #[test]
    fn check_task_permission_macro_blocks_viewer() {
        fn viewer_transition() -> Result<(), AppError> {
            let session = make_session("u1", UserRole::Viewer);
            check_task_permission!(&session.role, "update");
            Ok(())
        }
        let result = viewer_transition();
        assert!(
            matches!(result, Err(AppError::Authorization(_))),
            "Viewer should not be allowed to transition tasks"
        );
    }

    #[test]
    fn check_task_permission_macro_allows_technician() {
        fn technician_transition() -> Result<(), AppError> {
            let session = make_session("u1", UserRole::Technician);
            check_task_permission!(&session.role, "update");
            Ok(())
        }
        assert!(
            technician_transition().is_ok(),
            "Technician should pass the permission macro (assignment check is separate)"
        );
    }

    #[test]
    fn check_task_permission_macro_allows_admin() {
        fn admin_transition() -> Result<(), AppError> {
            let session = make_session("u1", UserRole::Admin);
            check_task_permission!(&session.role, "update");
            Ok(())
        }
        assert!(admin_transition().is_ok());
    }

    #[test]
    fn check_task_permission_macro_allows_supervisor() {
        fn supervisor_transition() -> Result<(), AppError> {
            let session = make_session("u1", UserRole::Supervisor);
            check_task_permission!(&session.role, "update");
            Ok(())
        }
        assert!(supervisor_transition().is_ok());
    }
}
