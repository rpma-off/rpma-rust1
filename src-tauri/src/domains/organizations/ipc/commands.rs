//! Organization IPC commands

use tracing::{debug, info, instrument};

use crate::commands::{ApiResponse, AppError, AppState, init_correlation_context};
use crate::domains::organizations::application::OrganizationService;
use crate::domains::organizations::domain::models::{
    Organization, OrganizationSettings, OnboardingData, OnboardingStatus,
    UpdateOrganizationRequest, UpdateOrganizationSettingsRequest,
};
use crate::shared::contracts::auth::UserRole;
use crate::resolve_context;

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
    debug!("Getting onboarding status");
    let correlation_id = init_correlation_context(&correlation_id, None);

    let service = OrganizationService::new(state.db.clone());
    let status = service.get_onboarding_status()?;

    Ok(ApiResponse::success(status).with_correlation_id(Some(correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn complete_onboarding(
    data: OnboardingData,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Organization>, AppError> {
    debug!("Completing onboarding");
    let correlation_id = init_correlation_context(&correlation_id, None);

    let service = OrganizationService::new(state.db.clone());
    let organization = service.complete_onboarding(&data)?;

    info!("Onboarding completed successfully");
    Ok(ApiResponse::success(organization).with_correlation_id(Some(correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_organization(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Organization>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    debug!("Getting organization");

    let service = OrganizationService::new(state.db.clone());
    let organization = service.get_organization_or_default()?;

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
    let user = ctx.auth.to_user_session();
    info!("Updating organization");

    let service = OrganizationService::new(state.db.clone());
    let organization = service.update_organization(&user, &data)?;

    Ok(ApiResponse::success(organization).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn upload_logo(
    request: UploadLogoRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Organization>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);
    let user = ctx.auth.to_user_session();
    info!("Uploading logo");

    let service = OrganizationService::new(state.db.clone());
    let organization = service.upload_logo(&user, request.file_path, request.base64_data)?;

    Ok(ApiResponse::success(organization).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_organization_settings(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<OrganizationSettings>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    debug!("Getting organization settings");

    let service = OrganizationService::new(state.db.clone());
    let settings = service.get_settings()?;

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
    let user = ctx.auth.to_user_session();
    info!("Updating organization settings");

    let service = OrganizationService::new(state.db.clone());
    let settings = service.update_settings(&user, &data)?;

    Ok(ApiResponse::success(settings).with_correlation_id(Some(ctx.correlation_id)))
}
