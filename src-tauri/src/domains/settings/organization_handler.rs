//! Organization IPC commands.
//!
//! Each handler authenticates the caller via `resolve_context!`, then
//! delegates all business logic to [`SettingsFacade`].

use tracing::{info, instrument};

use crate::commands::{ApiResponse, AppError, AppState, init_correlation_context};
use crate::shared::contracts::auth::UserRole;
use crate::resolve_context;
use super::models::*;
use super::facade::SettingsFacade;

#[derive(Debug, serde::Deserialize)]
pub struct UploadLogoRequest {
    pub file_path: Option<String>,
    pub base64_data: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_onboarding_status(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<OnboardingStatus>, AppError> {
    let correlation_id = init_correlation_context(&correlation_id, None);
    let facade = SettingsFacade::new(state.db.clone());
    let status = facade.get_onboarding_status()?;
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
    let facade = SettingsFacade::new(state.db.clone());
    let organization = facade.complete_onboarding(&data)?;
    info!("Onboarding completed successfully for organization: {}", organization.name);
    Ok(ApiResponse::success(organization).with_correlation_id(Some(correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_organization(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Organization>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    let facade = SettingsFacade::new(state.db.clone());
    let organization = facade
        .get_organization()?
        .ok_or_else(|| {
            AppError::NotFound("Organization not found. Please complete onboarding.".to_string())
        })?;
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
    info!("Updating organization");
    let facade = SettingsFacade::new(state.db.clone());
    let organization = facade.update_organization(&data)?;
    Ok(ApiResponse::success(organization).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn upload_logo(
    request: UploadLogoRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Organization>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);
    info!("Uploading logo");
    let facade = SettingsFacade::new(state.db.clone());
    let update_request = UpdateOrganizationRequest {
        logo_url: request.file_path,
        logo_data: request.base64_data,
        ..Default::default()
    };
    let organization = facade.update_organization(&update_request)?;
    Ok(ApiResponse::success(organization).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_organization_settings(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<OrganizationSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    let facade = SettingsFacade::new(state.db.clone());
    let settings = facade.get_organization_settings()?;
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
    info!("Updating organization settings");
    let facade = SettingsFacade::new(state.db.clone());
    let settings = facade.update_organization_settings(&data)?;
    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}

