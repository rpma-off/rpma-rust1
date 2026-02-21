//! Security monitoring commands for admin interface

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::audit::application::{
    AcknowledgeSecurityAlertRequest, CleanupSecurityEventsRequest, GetSecurityAlertsRequest,
    GetSecurityEventsRequest, GetSecurityMetricsRequest, ResolveSecurityAlertRequest,
    SecurityAlertResponse, SecurityEventResponse, SecurityMetricsResponse,
};
use crate::models::auth::UserRole;
use tracing::{error, info, instrument};

/// Get security metrics
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn get_security_metrics(
    request: GetSecurityMetricsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<SecurityMetricsResponse>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&_current_user.user_id);

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

    Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
}

/// Get recent security events
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn get_security_events(
    request: GetSecurityEventsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SecurityEventResponse>>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&_current_user.user_id);

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

    Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
}

/// Get active security alerts
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn get_security_alerts(
    request: GetSecurityAlertsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SecurityAlertResponse>>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&_current_user.user_id);

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

    Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
}

/// Acknowledge a security alert
#[tauri::command]
#[instrument(skip(state, request), fields(alert_id = %request.alert_id))]
pub async fn acknowledge_security_alert(
    request: AcknowledgeSecurityAlertRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Check if user is admin
    let current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Acknowledge the alert using the security monitor service
    let auth_service = state.auth_service.clone();
    auth_service
        .security_monitor()
        .acknowledge_alert(&request.alert_id, &current_user.user_id)
        .map_err(|e| {
            error!(error = %e, alert_id = %request.alert_id, "Failed to acknowledge security alert");
            AppError::Internal("Failed to acknowledge alert".to_string())
        })?;

    info!(alert_id = %request.alert_id, user_id = %current_user.user_id, "Security alert acknowledged");
    Ok(
        ApiResponse::success("Alert acknowledged successfully".to_string())
            .with_correlation_id(Some(correlation_id.clone())),
    )
}

/// Resolve a security alert
#[tauri::command]
#[instrument(skip(state, request), fields(alert_id = %request.alert_id))]
pub async fn resolve_security_alert(
    request: ResolveSecurityAlertRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
            .with_correlation_id(Some(correlation_id.clone())),
    )
}

/// Clean up old security events (admin only)
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn cleanup_security_events(
    request: CleanupSecurityEventsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
            .with_correlation_id(Some(correlation_id.clone())),
    )
}

/// Get active sessions for the current user
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn get_active_sessions(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::models::auth::UserSession>>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    // Authenticate the user
    let current_user = crate::shared::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None, // Any authenticated user can view their own sessions
    )
    .await?;
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Get active sessions for the current user
    let sessions = state
        .session_service
        .get_user_active_sessions(&current_user.user_id)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Failed to get active sessions");
            AppError::Internal("Failed to get active sessions".to_string())
        })?;

    Ok(ApiResponse::success(sessions).with_correlation_id(Some(correlation_id.clone())))
}

/// Revoke a specific session
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn revoke_session(
    session_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    // Authenticate the user
    let current_user = crate::shared::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None, // Any authenticated user can revoke their own sessions
    )
    .await?;
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Get the session to verify ownership
    if let Some(session) = state.session_service.validate_session(&session_id).await? {
        // Check if the session belongs to the current user or if user is admin
        if session.user_id != current_user.user_id && current_user.role != UserRole::Admin {
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

        info!(session_id = %session_id, user_id = %current_user.user_id, "Session revoked");
        Ok(
            ApiResponse::success("Session revoked successfully".to_string())
                .with_correlation_id(Some(correlation_id.clone())),
        )
    } else {
        Err(AppError::NotFound("Session not found".to_string()))
    }
}

/// Revoke all sessions except the current one
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn revoke_all_sessions_except_current(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<u32>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    // Authenticate the user
    let current_user = crate::shared::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None, // Any authenticated user can revoke their own sessions
    )
    .await?;
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Get current session ID from token
    let current_session = state
        .session_service
        .validate_session(&session_token)
        .await?
        .ok_or_else(|| AppError::Authentication("Invalid session".to_string()))?;

    // Revoke all other sessions
    let revoked_count = state
        .session_service
        .revoke_all_sessions_except_current(&current_user.user_id, &current_session.id)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Failed to revoke other sessions");
            AppError::Internal("Failed to revoke sessions".to_string())
        })?;

    info!(user_id = %current_user.user_id, revoked_count = revoked_count, "Revoked all other sessions");
    Ok(ApiResponse::success(revoked_count).with_correlation_id(Some(correlation_id.clone())))
}

/// Update session timeout configuration (admin only)
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn update_session_timeout(
    timeout_minutes: u32,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    // Check if user is admin
    let _current_user = crate::shared::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        Some(UserRole::Admin),
    )
    .await
    .map_err(|_| {
        AppError::Authorization("Admin access required to update session timeout".to_string())
    })?;
    crate::commands::update_correlation_context_user(&_current_user.user_id);

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
    .with_correlation_id(Some(correlation_id.clone())))
}

/// Get session timeout configuration
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn get_session_timeout_config(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::auth::SessionTimeoutConfig>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    // Authenticate the user (any authenticated user can view config)
    let _current_user =
        crate::shared::auth_middleware::AuthMiddleware::authenticate(&session_token, &state, None)
            .await?;
    crate::commands::update_correlation_context_user(&_current_user.user_id);

    let config = state.session_service.get_session_timeout_config().await;
    Ok(ApiResponse::success(config).with_correlation_id(Some(correlation_id.clone())))
}
