//! Session management commands
//!
//! ADR-018: Thin IPC layer — business logic delegated to
//! [`AuthSecurityService`](crate::domains::auth::application::auth_security_service::AuthSecurityService).

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::auth::application::auth_security_service::AuthSecurityService;
use crate::shared::contracts::auth::UserRole;
use crate::resolve_context;
use tracing::{error, info, instrument};

/// Construct a per-request [`AuthSecurityService`] from shared application state.
fn security_service(state: &AppState<'_>) -> AuthSecurityService {
    AuthSecurityService::new(state.session_service.clone())
}

/// Get active sessions for the current user
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_active_sessions(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::shared::contracts::auth::UserSession>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let sessions = state
        .session_service
        .get_user_active_sessions(ctx.user_id())
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %ctx.auth.user_id, "Failed to get active sessions");
            AppError::Internal("Failed to get active sessions".to_string())
        })?;

    Ok(ApiResponse::success(sessions).with_correlation_id(Some(ctx.correlation_id)))
}

/// Revoke a specific session
/// ADR-018: Thin IPC layer — ownership & revocation delegated to AuthSecurityService
#[tauri::command]
#[instrument(skip(state))]
pub async fn revoke_session(
    session_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let is_current_session = security_service(&state)
        .revoke_session(&session_id, &ctx)
        .await?;

    if is_current_session {
        state.session_store.clear();
    }

    Ok(
        ApiResponse::success("Session revoked successfully".to_string())
            .with_correlation_id(Some(ctx.correlation_id)),
    )
}

/// Revoke all sessions except the current one
#[tauri::command]
#[instrument(skip(state))]
pub async fn revoke_all_sessions_except_current(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<u32>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let revoked_count = state
        .session_service
        .revoke_all_sessions_except_current(&ctx.auth.user_id, &ctx.auth.session_id)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %ctx.auth.user_id, "Failed to revoke other sessions");
            AppError::Internal("Failed to revoke sessions".to_string())
        })?;

    info!(user_id = %ctx.auth.user_id, revoked_count = revoked_count, "Revoked all other sessions");
    Ok(ApiResponse::success(revoked_count).with_correlation_id(Some(ctx.correlation_id)))
}

/// Update session timeout configuration (admin only)
/// ADR-018: Thin IPC layer — validation delegated to AuthSecurityService
#[tauri::command]
#[instrument(skip(state))]
pub async fn update_session_timeout(
    timeout_minutes: u32,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);

    let message = security_service(&state)
        .update_timeout(timeout_minutes)
        .await?;

    Ok(ApiResponse::success(message).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get session timeout configuration
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_session_timeout_config(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::shared::contracts::auth::SessionTimeoutConfig>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let config = state.session_service.get_session_timeout_config().await;
    Ok(ApiResponse::success(config).with_correlation_id(Some(ctx.correlation_id)))
}
