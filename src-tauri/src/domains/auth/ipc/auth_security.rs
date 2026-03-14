//! Session management commands

use crate::commands::{ApiResponse, AppError, AppState};
use crate::shared::contracts::auth::UserRole;
use crate::resolve_context;
use tracing::{error, info, instrument};

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
#[tauri::command]
#[instrument(skip(state))]
pub async fn revoke_session(
    session_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    if let Some(session) = state.session_service.validate_session(&session_id).await? {
        if session.user_id != ctx.auth.user_id && ctx.auth.role != UserRole::Admin {
            return Err(AppError::Authorization(
                "You can only revoke your own sessions".to_string(),
            ));
        }

        state
            .session_service
            .revoke_session(&session_id)
            .await
            .map_err(|e| {
                error!(error = %e, session_id = %session_id, "Failed to revoke session");
                AppError::Internal("Failed to revoke session".to_string())
            })?;

        if session_id == ctx.auth.session_id {
            state.session_store.clear();
        }

        info!(session_id = %session_id, user_id = %ctx.auth.user_id, "Session revoked");
        Ok(
            ApiResponse::success("Session revoked successfully".to_string())
                .with_correlation_id(Some(ctx.correlation_id)),
        )
    } else {
        Err(AppError::NotFound("Session not found".to_string()))
    }
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
#[tauri::command]
#[instrument(skip(state))]
pub async fn update_session_timeout(
    timeout_minutes: u32,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);

    if timeout_minutes == 0 {
        return Err(AppError::Validation(
            "Timeout must be greater than 0 minutes".to_string(),
        ));
    }

    state
        .session_service
        .update_session_timeout(timeout_minutes)
        .await
        .map_err(|e| {
            error!(error = %e, timeout_minutes = timeout_minutes, "Failed to update session timeout");
            AppError::Internal("Failed to update session timeout".to_string())
        })?;

    info!(timeout_minutes = timeout_minutes, "Session timeout updated");
    Ok(ApiResponse::success(format!(
        "Session timeout updated to {} minutes",
        timeout_minutes
    ))
    .with_correlation_id(Some(ctx.correlation_id)))
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
