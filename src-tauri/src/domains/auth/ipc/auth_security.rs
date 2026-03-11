//! Security monitoring commands for admin interface

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::auth::application::{
    AcknowledgeSecurityAlertRequest, CleanupSecurityEventsRequest, GetSecurityAlertsRequest,
    GetSecurityEventsRequest, GetSecurityMetricsRequest, ResolveSecurityAlertRequest,
    SecurityAlertResponse, SecurityEventResponse, SecurityMetricsResponse,
};
use crate::shared::contracts::auth::UserRole;
use crate::resolve_context;
use tracing::{error, info, instrument};

/// Get security metrics
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn get_security_metrics(
    request: GetSecurityMetricsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<SecurityMetricsResponse>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);

    // Get real security metrics from the security monitor service
    let auth_service = state.auth_service.clone();
    let metrics = auth_service.security_monitor().get_metrics();

    let response = SecurityMetricsResponse {
        total_events_today: metrics.total_events_today,
        critical_alerts_today: metrics.critical_alerts_today,
        active_brute_force_attempts: metrics.active_brute_force_attempts,
        blocked_ips: metrics.blocked_ips,
        failed_auth_attempts_last_hour: metrics.failed_auth_attempts_last_hour,
        suspicious_activities_detected: metrics.suspicious_activities_detected,
    };

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get recent security events
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn get_security_events(
    request: GetSecurityEventsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SecurityEventResponse>>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);

    let limit = request.limit.unwrap_or(50).min(200); // Max 200 events

    // Get real security events from the security monitor service
    let auth_service = state.auth_service.clone();
    let events = auth_service.security_monitor().get_recent_events(limit);

    let response: Vec<SecurityEventResponse> = events
        .into_iter()
        .map(|event| SecurityEventResponse {
            id: event.id,
            event_type: format!("{:?}", event.event_type).to_lowercase(),
            severity: format!("{:?}", event.severity).to_lowercase(),
            timestamp: event.timestamp.to_rfc3339(),
            user_id: event.user_id,
            ip_address: event.ip_address,
            details: serde_json::to_value(event.details).unwrap_or(serde_json::json!({})),
            source: event.source,
            mitigated: event.mitigated,
        })
        .collect();

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get active security alerts
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn get_security_alerts(
    request: GetSecurityAlertsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SecurityAlertResponse>>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);

    // Get real security alerts from the security monitor service
    let auth_service = state.auth_service.clone();
    let alerts = auth_service.security_monitor().get_active_alerts();

    let response: Vec<SecurityAlertResponse> = alerts
        .into_iter()
        .map(|alert| SecurityAlertResponse {
            id: alert.id,
            event_id: alert.event_id,
            title: alert.title,
            description: alert.description,
            severity: format!("{:?}", alert.severity).to_lowercase(),
            timestamp: alert.timestamp.to_rfc3339(),
            acknowledged: alert.acknowledged,
            acknowledged_by: alert.acknowledged_by,
            acknowledged_at: alert.acknowledged_at.map(|dt| dt.to_rfc3339()),
            resolved: alert.resolved,
            resolved_at: alert.resolved_at.map(|dt| dt.to_rfc3339()),
            actions_taken: alert.actions_taken,
        })
        .collect();

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
}

/// Acknowledge a security alert
#[tauri::command]
#[instrument(skip(state, request), fields(alert_id = %request.alert_id))]
pub async fn acknowledge_security_alert(
    request: AcknowledgeSecurityAlertRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);

    // Acknowledge the alert using the security monitor service
    let auth_service = state.auth_service.clone();
    auth_service
        .security_monitor()
        .acknowledge_alert(&request.alert_id, ctx.user_id())
        .map_err(|e| {
            error!(error = %e, alert_id = %request.alert_id, "Failed to acknowledge security alert");
            AppError::Internal("Failed to acknowledge alert".to_string())
        })?;

    info!(alert_id = %request.alert_id, user_id = %ctx.auth.user_id, "Security alert acknowledged");
    Ok(
        ApiResponse::success("Alert acknowledged successfully".to_string())
            .with_correlation_id(Some(ctx.correlation_id)),
    )
}

/// Resolve a security alert
#[tauri::command]
#[instrument(skip(state, request), fields(alert_id = %request.alert_id))]
pub async fn resolve_security_alert(
    request: ResolveSecurityAlertRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);

    // Resolve the alert using the security monitor service
    let auth_service = state.auth_service.clone();
    auth_service
        .security_monitor()
        .resolve_alert(&request.alert_id, request.actions_taken)
        .map_err(|e| {
            error!(error = %e, alert_id = %request.alert_id, "Failed to resolve security alert");
            AppError::Internal("Failed to resolve alert".to_string())
        })?;

    info!(alert_id = %request.alert_id, "Security alert resolved");
    Ok(
        ApiResponse::success("Alert resolved successfully".to_string())
            .with_correlation_id(Some(ctx.correlation_id)),
    )
}

/// Clean up old security events (admin only)
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn cleanup_security_events(
    request: CleanupSecurityEventsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);

    // Clean up old events using the security monitor service
    let auth_service = state.auth_service.clone();
    auth_service
        .security_monitor()
        .cleanup_old_events()
        .map_err(|e| {
            error!(error = %e, "Failed to cleanup security events");
            AppError::Internal("Failed to cleanup security events".to_string())
        })?;

    info!("Security events cleaned up");
    Ok(
        ApiResponse::success("Security events cleaned up successfully".to_string())
            .with_correlation_id(Some(ctx.correlation_id)),
    )
}

/// Get active sessions for the current user
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_active_sessions(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::shared::contracts::auth::UserSession>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    // Get active sessions for the current user
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

    // Get the session to verify ownership
    if let Some(session) = state.session_service.validate_session(&session_id).await? {
        // Check if the session belongs to the current user or if user is admin
        if session.user_id != ctx.auth.user_id && ctx.auth.role != UserRole::Admin {
            return Err(AppError::Authorization(
                "You can only revoke your own sessions".to_string(),
            ));
        }

        // Revoke the session
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

    // Revoke all other sessions
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

    // Validate timeout range
    if timeout_minutes == 0 {
        return Err(AppError::Validation(
            "Timeout must be greater than 0 minutes".to_string(),
        ));
    }

    // Update the session timeout
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
