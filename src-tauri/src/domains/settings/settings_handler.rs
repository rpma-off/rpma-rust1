//! IPC handlers for global App Settings.
//!
//! Each handler resolves the request context via `resolve_context!`, then
//! delegates all business logic — including RBAC enforcement — to
//! [`SettingsService`].  Handlers must remain thin adapters (ADR-018).

use tracing::instrument;

use super::application::SettingsService;
use super::models::*;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;

/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_app_settings(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let settings = service.get_app_settings(&ctx)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_general_settings(
    state: AppState<'_>,
    settings: GeneralSettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let updated = service.update_general_settings(&ctx, settings)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_security_settings(
    state: AppState<'_>,
    settings: SecuritySettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let updated = service.update_security_settings(&ctx, settings)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_notification_settings(
    state: AppState<'_>,
    settings: NotificationSettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let updated = service.update_notification_settings(&ctx, settings)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}

// ── System Config Commands ──────────────────────────────────────────────────

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_business_rules(
    state: AppState<'_>,
    rules: Vec<serde_json::Value>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let updated = service.update_business_rules(&ctx, rules)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_security_policies(
    state: AppState<'_>,
    policies: Vec<serde_json::Value>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let updated = service.update_security_policies(&ctx, policies)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_integrations(
    state: AppState<'_>,
    integrations: Vec<serde_json::Value>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let updated = service.update_integrations(&ctx, integrations)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_performance_configs(
    state: AppState<'_>,
    configs: Vec<serde_json::Value>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let updated = service.update_performance_configs(&ctx, configs)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_business_hours(
    state: AppState<'_>,
    hours: serde_json::Value,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = SettingsService::new(state.db.clone());
    let updated = service.update_business_hours(&ctx, hours)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}
