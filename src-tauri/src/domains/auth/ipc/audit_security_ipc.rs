//! Security audit IPC commands
//!
//! ADR-018: Thin IPC layer — all queries delegated to AuditService (application layer)
//! which in turn uses AuditRepository (infrastructure layer).

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::auth::application::audit_service::AuditService;
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;
use tracing::instrument;

#[allow(unused_imports)]
pub use crate::domains::auth::application::audit_service::{
    AuditActivityFilter, PaginatedUserActivity, SecurityAlert, SecurityEventRecord, SecurityMetrics,
    UserActivityRecord,
};


fn audit_service(state: &AppState<'_>) -> AuditService {
    AuditService::new(state.db.clone())
}

/// Return paginated activity logs across all users with optional filters.
/// ADR-018: Admin-only endpoint — thin delegate to AuditService.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_all_user_activity(
    filter: Option<AuditActivityFilter>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<PaginatedUserActivity>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);

    let activity = audit_service(&state)
        .get_all_activity(filter.unwrap_or(AuditActivityFilter {
            user_id: None,
            event_type: None,
            resource_type: None,
            start_date: None,
            end_date: None,
            limit: None,
            offset: None,
        }))
        .map_err(|e| AppError::Database(e))?;

    Ok(ApiResponse::success(activity).with_correlation_id(Some(ctx.correlation_id)))
}

/// Return available audit event types for filtering.
/// ADR-018: Admin-only endpoint.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_audit_event_types(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<String>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);

    let event_types = audit_service(&state).get_audit_event_types();

    Ok(ApiResponse::success(event_types).with_correlation_id(Some(ctx.correlation_id)))
}

/// Return today's security KPIs.
/// ADR-018: Admin-only endpoint — thin delegate to AuditService.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_security_metrics(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SecurityMetrics>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);

    let metrics = audit_service(&state)
        .security_metrics()
        .map_err(|e| AppError::Database(e))?;

    Ok(ApiResponse::success(metrics).with_correlation_id(Some(ctx.correlation_id)))
}

/// Return a paginated list of recent audit events.
/// ADR-018: Admin-only endpoint — thin delegate to AuditService.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_security_events(
    limit: Option<i64>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SecurityEventRecord>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);

    let page_limit = limit.unwrap_or(50).min(200);
    let events = audit_service(&state)
        .list_events(page_limit)
        .map_err(|e| AppError::Database(e))?;

    Ok(ApiResponse::success(events).with_correlation_id(Some(ctx.correlation_id)))
}

/// Return recent security-specific audit events as alerts.
/// ADR-018: Admin-only endpoint — thin delegate to AuditService.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_security_alerts(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SecurityAlert>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);

    let alerts = audit_service(&state)
        .list_alerts()
        .map_err(|e| AppError::Database(e))?;

    Ok(ApiResponse::success(alerts).with_correlation_id(Some(ctx.correlation_id)))
}

/// Acknowledge a security alert (no-op: alert state is derived from audit events).
/// ADR-018: Admin-only endpoint.
#[tauri::command]
#[instrument(skip(state))]
pub async fn acknowledge_security_alert(
    alert_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    tracing::debug!(alert_id = %alert_id, "Security alert acknowledge requested (no-op)");
    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
}
