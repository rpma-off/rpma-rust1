//! Flattened IPC handlers for User-specific Settings.
//!
//! Each handler authenticates the caller via `resolve_context!`, then
//! delegates all business logic to [`SettingsFacade`].

use tracing::instrument;

use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;
use super::models::*;
use super::facade::SettingsFacade;

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_user_settings(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = SettingsFacade::new(state.db.clone());
    let settings = facade.get_user_settings(&ctx.auth.user_id)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_profile(
    state: AppState<'_>,
    profile: UserProfileSettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = SettingsFacade::new(state.db.clone());
    let mut current = facade.get_user_settings(&ctx.auth.user_id)?;
    current.profile = profile;
    facade.save_user_settings(&ctx.auth.user_id, &current)?;
    Ok(ApiResponse::success(current).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_preferences(
    state: AppState<'_>,
    preferences: UserPreferences,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = SettingsFacade::new(state.db.clone());
    let mut current = facade.get_user_settings(&ctx.auth.user_id)?;
    current.preferences = preferences;
    facade.save_user_settings(&ctx.auth.user_id, &current)?;
    Ok(ApiResponse::success(current).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_security(
    state: AppState<'_>,
    security: UserSecuritySettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = SettingsFacade::new(state.db.clone());
    let mut current = facade.get_user_settings(&ctx.auth.user_id)?;
    current.security = security;
    facade.save_user_settings(&ctx.auth.user_id, &current)?;
    Ok(ApiResponse::success(current).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_performance(
    state: AppState<'_>,
    performance: UserPerformanceSettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = SettingsFacade::new(state.db.clone());
    let mut current = facade.get_user_settings(&ctx.auth.user_id)?;
    current.performance = performance;
    facade.save_user_settings(&ctx.auth.user_id, &current)?;
    Ok(ApiResponse::success(current).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_accessibility(
    state: AppState<'_>,
    accessibility: UserAccessibilitySettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = SettingsFacade::new(state.db.clone());
    let mut current = facade.get_user_settings(&ctx.auth.user_id)?;
    current.accessibility = accessibility;
    facade.save_user_settings(&ctx.auth.user_id, &current)?;
    Ok(ApiResponse::success(current).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_notifications(
    state: AppState<'_>,
    notifications: UserNotificationSettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = SettingsFacade::new(state.db.clone());
    let mut current = facade.get_user_settings(&ctx.auth.user_id)?;
    current.notifications = notifications;
    facade.save_user_settings(&ctx.auth.user_id, &current)?;
    Ok(ApiResponse::success(current).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
pub async fn get_data_consent(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<DataConsent>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = SettingsFacade::new(state.db.clone());
    let consent = facade.get_data_consent(&ctx.auth.user_id)?;
    Ok(ApiResponse::success(consent).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
pub async fn change_user_password(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, AppError> {
    let _ctx = resolve_context!(&state, &correlation_id);
    // Placeholder - password change goes through AuthService
    Ok(ApiResponse::success(()))
}

#[tauri::command]
pub async fn export_user_data(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<String>, AppError> {
    let _ctx = resolve_context!(&state, &correlation_id);
    // Placeholder
    Ok(ApiResponse::success("Data export initiated".to_string()))
}

#[tauri::command]
pub async fn delete_user_account(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, AppError> {
    let _ctx = resolve_context!(&state, &correlation_id);
    // Placeholder
    Ok(ApiResponse::success(()))
}

#[tauri::command]
pub async fn update_data_consent(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, AppError> {
    let _ctx = resolve_context!(&state, &correlation_id);
    // Placeholder
    Ok(ApiResponse::success(()))
}

#[tauri::command]
pub async fn upload_user_avatar(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<String>, AppError> {
    let _ctx = resolve_context!(&state, &correlation_id);
    // Placeholder
    Ok(ApiResponse::success("Avatar uploaded".to_string()))
}

