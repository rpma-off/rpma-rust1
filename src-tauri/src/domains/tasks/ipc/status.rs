use crate::authenticate;
use crate::check_task_permission;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::tasks::domain::models::status::{StatusDistribution, StatusTransitionRequest};
use crate::domains::tasks::domain::models::task::Task;

/// Transition a task to a new status with validation.
///
/// RBAC: Admin and Supervisor may transition any task; Technician may only
/// transition tasks they are assigned to; Viewer is not permitted.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn task_transition_status(
    session_token: String,
    request: StatusTransitionRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Viewers cannot change task status (status transitions are "update" operations).
    check_task_permission!(&current_user.role, "update");

    // For Technicians, verify they are assigned to this task.
    if current_user.role == crate::shared::contracts::auth::UserRole::Technician {
        let task = state
            .task_service
            .get_task_async(&request.task_id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?
            .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

        if task.technician_id.as_ref() != Some(&current_user.user_id) {
            return Err(AppError::Authorization(
                "Technician can only transition their own assigned tasks".to_string(),
            ));
        }
    }

    let task = state
        .task_service
        .transition_status(
            &request.task_id,
            &request.new_status,
            request.reason.as_deref(),
        )?;

    Ok(ApiResponse::success(task).with_correlation_id(Some(correlation_id)))
}

/// Get status distribution for all tasks.
///
/// RBAC: all authenticated roles may read the distribution.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn task_get_status_distribution(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<StatusDistribution>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let distribution = state.task_service.get_status_distribution()?;

    Ok(ApiResponse::success(distribution).with_correlation_id(Some(correlation_id)))
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
