//! IPC handlers for User-specific Settings.
//!
//! Each handler resolves the request context via `resolve_context!`, then
//! delegates all business logic — including RBAC enforcement — to
//! [`SettingsService`].  Handlers must remain thin adapters (ADR-018).

use tracing::instrument;

use super::application::SettingsService;
use super::models::*;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;

/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_user_settings(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = SettingsService::new(state.db.clone());
    let settings = service.get_user_settings(&ctx)?;
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
    let service = SettingsService::new(state.db.clone());
    let settings = service.update_user_profile(&ctx, profile)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_preferences(
    state: AppState<'_>,
    preferences: UserPreferences,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = SettingsService::new(state.db.clone());
    let settings = service.update_user_preferences(&ctx, preferences)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_security(
    state: AppState<'_>,
    security: UserSecuritySettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = SettingsService::new(state.db.clone());
    let settings = service.update_user_security(&ctx, security)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_performance(
    state: AppState<'_>,
    performance: UserPerformanceSettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = SettingsService::new(state.db.clone());
    let settings = service.update_user_performance(&ctx, performance)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_accessibility(
    state: AppState<'_>,
    accessibility: UserAccessibilitySettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = SettingsService::new(state.db.clone());
    let settings = service.update_user_accessibility(&ctx, accessibility)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_user_notifications(
    state: AppState<'_>,
    notifications: UserNotificationSettings,
    correlation_id: Option<String>,
) -> Result<ApiResponse<UserSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = SettingsService::new(state.db.clone());
    let settings = service.update_user_notifications(&ctx, notifications)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
pub async fn get_data_consent(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<DataConsent>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = SettingsService::new(state.db.clone());
    let consent = service.get_data_consent(&ctx)?;
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
