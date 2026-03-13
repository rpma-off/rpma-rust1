//! Flattened IPC handlers for global App Settings.
//!
//! Each handler authenticates the caller via `resolve_context!`, then
//! delegates all business logic to [`SettingsFacade`].

use tracing::{info, instrument};

use crate::commands::{ApiResponse, AppError, AppState};
use crate::shared::contracts::auth::UserRole;
use crate::resolve_context;
use super::models::*;
use super::facade::SettingsFacade;

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_app_settings(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AppSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let facade = SettingsFacade::new(state.db.clone());
    let settings = facade.get_app_settings()?;
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
    let facade = SettingsFacade::new(state.db.clone());
    let updated = facade.update_general_settings(settings, &ctx.auth.user_id)?;
    info!("General settings updated");
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
    let facade = SettingsFacade::new(state.db.clone());
    let updated = facade.update_security_settings(settings, &ctx.auth.user_id)?;
    info!("Security settings updated");
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
    let facade = SettingsFacade::new(state.db.clone());
    let updated = facade.update_notification_settings(settings, &ctx.auth.user_id)?;
    info!("Notification settings updated");
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
    let facade = SettingsFacade::new(state.db.clone());
    let updated = facade.update_business_rules(rules, &ctx.auth.user_id)?;
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
    let facade = SettingsFacade::new(state.db.clone());
    let updated = facade.update_security_policies(policies, &ctx.auth.user_id)?;
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
    let facade = SettingsFacade::new(state.db.clone());
    let updated = facade.update_integrations(integrations, &ctx.auth.user_id)?;
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
    let facade = SettingsFacade::new(state.db.clone());
    let updated = facade.update_performance_configs(configs, &ctx.auth.user_id)?;
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
    let facade = SettingsFacade::new(state.db.clone());
    let updated = facade.update_business_hours(hours, &ctx.auth.user_id)?;
    Ok(ApiResponse::success(updated).with_correlation_id(Some(ctx.correlation_id)))
}
