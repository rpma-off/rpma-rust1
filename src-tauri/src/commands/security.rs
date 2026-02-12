//! Security monitoring commands for admin interface

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::auth::UserRole;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct SecurityMetricsResponse {
    pub total_events_today: u64,
    pub critical_alerts_today: u64,
    pub active_brute_force_attempts: u64,
    pub blocked_ips: u64,
    pub failed_auth_attempts_last_hour: u64,
    pub suspicious_activities_detected: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SecurityEventResponse {
    pub id: String,
    pub event_type: String,
    pub severity: String,
    pub timestamp: String,
    pub user_id: Option<String>,
    pub ip_address: Option<String>,
    pub details: serde_json::Value,
    pub source: String,
    pub mitigated: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SecurityAlertResponse {
    pub id: String,
    pub event_id: String,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub timestamp: String,
    pub acknowledged: bool,
    pub acknowledged_by: Option<String>,
    pub acknowledged_at: Option<String>,
    pub resolved: bool,
    pub resolved_at: Option<String>,
    pub actions_taken: Vec<String>,
}

#[derive(Deserialize, Debug)]
pub struct GetSecurityMetricsRequest {
    pub session_token: String,
}

/// Get security metrics
#[tauri::command]
pub async fn get_security_metrics(
    request: GetSecurityMetricsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<SecurityMetricsResponse>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );

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

    Ok(ApiResponse::success(response))
}

#[derive(Deserialize, Debug)]
pub struct GetSecurityEventsRequest {
    pub session_token: String,
    pub limit: Option<usize>,
}

/// Get recent security events
#[tauri::command]
pub async fn get_security_events(
    request: GetSecurityEventsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SecurityEventResponse>>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );

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

    Ok(ApiResponse::success(response))
}

#[derive(Deserialize, Debug)]
pub struct GetSecurityAlertsRequest {
    pub session_token: String,
}

/// Get active security alerts
#[tauri::command]
pub async fn get_security_alerts(
    request: GetSecurityAlertsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SecurityAlertResponse>>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );

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

    Ok(ApiResponse::success(response))
}

#[derive(Deserialize, Debug)]
pub struct AcknowledgeSecurityAlertRequest {
    pub session_token: String,
    pub alert_id: String,
}

/// Acknowledge a security alert
#[tauri::command]
pub async fn acknowledge_security_alert(
    request: AcknowledgeSecurityAlertRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    // Check if user is admin
    let current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );

    // Acknowledge the alert using the security monitor service
    let auth_service = state.auth_service.clone();
    auth_service
        .security_monitor()
        .acknowledge_alert(&request.alert_id, &current_user.user_id)
        .map_err(|e| AppError::Internal(format!("Failed to acknowledge alert: {}", e)))?;

    Ok(ApiResponse::success(
        "Alert acknowledged successfully".to_string(),
    ))
}

#[derive(Deserialize, Debug)]
pub struct ResolveSecurityAlertRequest {
    pub session_token: String,
    pub alert_id: String,
    pub actions_taken: Vec<String>,
}

/// Resolve a security alert
#[tauri::command]
pub async fn resolve_security_alert(
    request: ResolveSecurityAlertRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );

    // Resolve the alert using the security monitor service
    let auth_service = state.auth_service.clone();
    auth_service
        .security_monitor()
        .resolve_alert(&request.alert_id, request.actions_taken)
        .map_err(|e| AppError::Internal(format!("Failed to resolve alert: {}", e)))?;

    Ok(ApiResponse::success(
        "Alert resolved successfully".to_string(),
    ))
}

#[derive(Deserialize, Debug)]
pub struct CleanupSecurityEventsRequest {
    pub session_token: String,
}

/// Clean up old security events (admin only)
#[tauri::command]
pub async fn cleanup_security_events(
    request: CleanupSecurityEventsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(
        &request.session_token,
        &state,
        crate::models::auth::UserRole::Admin
    );

    // Clean up old events using the security monitor service
    let auth_service = state.auth_service.clone();
    auth_service
        .security_monitor()
        .cleanup_old_events()
        .map_err(|e| AppError::Internal(format!("Failed to cleanup security events: {}", e)))?;

    Ok(ApiResponse::success(
        "Security events cleaned up successfully".to_string(),
    ))
}

/// Get active sessions for the current user
#[tauri::command]
pub async fn get_active_sessions(
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::models::auth::UserSession>>, AppError> {
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None, // Any authenticated user can view their own sessions
    )
    .await?;

    // Get active sessions for the current user
    let sessions = state
        .session_service
        .get_user_active_sessions(&current_user.user_id)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to get active sessions: {}", e)))?;

    Ok(ApiResponse::success(sessions))
}

/// Revoke a specific session
#[tauri::command]
pub async fn revoke_session(
    session_id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None, // Any authenticated user can revoke their own sessions
    )
    .await?;

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
            .map_err(|e| AppError::Internal(format!("Failed to revoke session: {}", e)))?;

        Ok(ApiResponse::success(
            "Session revoked successfully".to_string(),
        ))
    } else {
        Err(AppError::NotFound("Session not found".to_string()))
    }
}

/// Revoke all sessions except the current one
#[tauri::command]
pub async fn revoke_all_sessions_except_current(
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<u32>, AppError> {
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None, // Any authenticated user can revoke their own sessions
    )
    .await?;

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
        .map_err(|e| AppError::Internal(format!("Failed to revoke sessions: {}", e)))?;

    Ok(ApiResponse::success(revoked_count))
}

/// Update session timeout configuration (admin only)
#[tauri::command]
pub async fn update_session_timeout(
    timeout_minutes: u32,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    // Check if user is admin
    let _current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        Some(UserRole::Admin),
    )
    .await
    .map_err(|_| {
        AppError::Authorization("Admin access required to update session timeout".to_string())
    })?;

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
        .map_err(|e| AppError::Internal(format!("Failed to update session timeout: {}", e)))?;

    Ok(ApiResponse::success(format!(
        "Session timeout updated to {} minutes",
        timeout_minutes
    )))
}

/// Get session timeout configuration
#[tauri::command]
pub async fn get_session_timeout_config(
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::auth::SessionTimeoutConfig>, AppError> {
    // Authenticate the user (any authenticated user can view config)
    let _current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None,
    )
    .await?;

    let config = state.session_service.get_session_timeout_config().await;
    Ok(ApiResponse::success(config))
}
