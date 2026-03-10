//! IPC commands for system configuration arrays (business rules, security
//! policies, integrations, performance configs, business hours).
//!
//! Each command is admin-only and delegates to `SystemConfigService`.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::settings::application::SystemConfigService;
use crate::domains::settings::ipc::settings::core::settings_user_id;

use serde::Deserialize;
use tracing::info;

use crate::authenticate;

// ── helpers ─────────────────────────────────────────────────────────────────

fn make_service(state: &AppState<'_>) -> SystemConfigService {
    SystemConfigService::new(state.settings_service.clone())
}

// ── commands ─────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdateBusinessRulesRequest {
    pub session_token: String,
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
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating business_rules");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(settings_user_id(&user));

    make_service(&state).update_business_rules(&user, request.rules)?;

    Ok(ApiResponse::success("Business rules updated successfully".to_string())
        .with_correlation_id(Some(correlation_id)))
}

// ─────────────────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdateSecurityPoliciesRequest {
    pub session_token: String,
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
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating security_policies");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(settings_user_id(&user));

    make_service(&state).update_security_policies(&user, request.policies)?;

    Ok(ApiResponse::success("Security policies updated successfully".to_string())
        .with_correlation_id(Some(correlation_id)))
}

// ─────────────────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdateIntegrationsRequest {
    pub session_token: String,
    pub integrations: Vec<serde_json::Value>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Replace the global integrations array.  Admin only.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn update_integrations(
    request: UpdateIntegrationsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating integrations");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(settings_user_id(&user));

    make_service(&state).update_integrations(&user, request.integrations)?;

    Ok(ApiResponse::success("Integrations updated successfully".to_string())
        .with_correlation_id(Some(correlation_id)))
}

// ─────────────────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdatePerformanceConfigsRequest {
    pub session_token: String,
    pub configs: Vec<serde_json::Value>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Replace the global performance_configs array.  Admin only.
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn update_performance_configs(
    request: UpdatePerformanceConfigsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating performance_configs");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(settings_user_id(&user));

    make_service(&state).update_performance_configs(&user, request.configs)?;

    Ok(ApiResponse::success("Performance configs updated successfully".to_string())
        .with_correlation_id(Some(correlation_id)))
}

// ─────────────────────────────────────────────────────────────────────────────

/// TODO: document
#[derive(Deserialize)]
pub struct UpdateBusinessHoursRequest {
    pub session_token: String,
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
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating business_hours");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(settings_user_id(&user));

    make_service(&state).update_business_hours(&user, request.hours)?;

    Ok(ApiResponse::success("Business hours updated successfully".to_string())
        .with_correlation_id(Some(correlation_id)))
}
