//! Organization IPC commands.
//!
//! Each handler resolves the request context via `resolve_context!`, then
//! delegates all business logic — including RBAC enforcement — to
//! [`SettingsService`].  Handlers must remain thin adapters (ADR-018).

use tracing::instrument;

use super::models::*;
use crate::commands::{init_correlation_context, ApiResponse, AppError, AppState};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;

#[derive(Debug, serde::Deserialize)]
pub struct UploadLogoRequest {
    pub file_path: Option<String>,
    pub base64_data: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_onboarding_status(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<OnboardingStatus>, AppError> {
    let correlation_id = init_correlation_context(&correlation_id, None);
    let status = state.settings_service.get_onboarding_status()?;
    Ok(ApiResponse::success(status).with_correlation_id(Some(correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn complete_onboarding(
    data: OnboardingData,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Organization>, AppError> {
    let correlation_id = init_correlation_context(&correlation_id, None);
    let organization = state.settings_service.complete_onboarding(&data)?;
    Ok(ApiResponse::success(organization).with_correlation_id(Some(correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_organization(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Organization>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    let organization = state.settings_service.get_organization(&ctx)?;
    Ok(ApiResponse::success(organization).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_organization(
    data: UpdateOrganizationRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Organization>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let organization = state.settings_service.update_organization(&ctx, &data)?;
    Ok(ApiResponse::success(organization).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn upload_logo(
    request: UploadLogoRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Organization>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);
    let organization = state
        .settings_service
        .update_logo(&ctx, request.file_path, request.base64_data)?;
    Ok(ApiResponse::success(organization).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_organization_settings(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<OrganizationSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    let settings = state.settings_service.get_organization_settings(&ctx)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_organization_settings(
    data: UpdateOrganizationSettingsRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<OrganizationSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let settings = state.settings_service.update_organization_settings(&ctx, &data)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}
