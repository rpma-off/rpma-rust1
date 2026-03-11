//! IPC commands for system configuration arrays (business rules, security
//! policies, integrations, performance configs, business hours).
//!
//! Each command is admin-only and delegates to `SystemConfigService`.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::settings::application::SystemConfigService;
use crate::resolve_context;

use serde::Deserialize;
use tracing::info;

// ── helpers ─────────────────────────────────────────────────────────────────

fn make_service(state: &AppState<'_>) -> SystemConfigService {
    SystemConfigService::new(state.settings_service.clone())
}

// ── commands ─────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdateBusinessRulesRequest {
    pub rules: Vec<serde_json::Value>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Replace the global business_rules array.  Admin only.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn update_business_rules(
    request: UpdateBusinessRulesRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(
        &state,
        &request.correlation_id,
        crate::shared::contracts::auth::UserRole::Admin
    );
    info!("Updating business_rules");

    make_service(&state).update_business_rules(&ctx, request.rules)?;

    Ok(ApiResponse::success("Business rules updated successfully".to_string())
        .with_correlation_id(Some(ctx.correlation_id.clone())))
}

// ─────────────────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdateSecurityPoliciesRequest {
    pub policies: Vec<serde_json::Value>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Replace the global security_policies array.  Admin only.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn update_security_policies(
    request: UpdateSecurityPoliciesRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(
        &state,
        &request.correlation_id,
        crate::shared::contracts::auth::UserRole::Admin
    );
    info!("Updating security_policies");

    make_service(&state).update_security_policies(&ctx, request.policies)?;

    Ok(ApiResponse::success("Security policies updated successfully".to_string())
        .with_correlation_id(Some(ctx.correlation_id.clone())))
}

// ─────────────────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdateIntegrationsRequest {
    pub integrations: Vec<serde_json::Value>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Replace the global integrations array.  Admin only.
///
/// **NOTE**: No sync backend exists. Integration configs are stored locally
/// but have no runtime effect. Retained for future use.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn update_integrations(
    request: UpdateIntegrationsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(
        &state,
        &request.correlation_id,
        crate::shared::contracts::auth::UserRole::Admin
    );
    info!("Updating integrations");

    make_service(&state).update_integrations(&ctx, request.integrations)?;

    Ok(ApiResponse::success("Integrations updated successfully".to_string())
        .with_correlation_id(Some(ctx.correlation_id.clone())))
}

// ─────────────────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdatePerformanceConfigsRequest {
    pub configs: Vec<serde_json::Value>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Replace the global performance_configs array.  Admin only.
///
/// **NOTE**: No sync backend exists. Performance configs are stored locally
/// but have no runtime effect. Retained for future use.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn update_performance_configs(
    request: UpdatePerformanceConfigsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(
        &state,
        &request.correlation_id,
        crate::shared::contracts::auth::UserRole::Admin
    );
    info!("Updating performance_configs");

    make_service(&state).update_performance_configs(&ctx, request.configs)?;

    Ok(ApiResponse::success("Performance configs updated successfully".to_string())
        .with_correlation_id(Some(ctx.correlation_id.clone())))
}

// ─────────────────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdateBusinessHoursRequest {
    pub hours: serde_json::Value,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Replace the global business_hours object.  Admin only.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn update_business_hours(
    request: UpdateBusinessHoursRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(
        &state,
        &request.correlation_id,
        crate::shared::contracts::auth::UserRole::Admin
    );
    info!("Updating business_hours");

    make_service(&state).update_business_hours(&ctx, request.hours)?;

    Ok(ApiResponse::success("Business hours updated successfully".to_string())
        .with_correlation_id(Some(ctx.correlation_id.clone())))
}
