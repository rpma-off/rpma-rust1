//! Tauri IPC commands for the Documents bounded context.
//!
//! Exposes photo storage and retrieval operations to the frontend.

use crate::commands::{ApiResponse, AppState};
use crate::domains::documents::domain::models::photo::Photo;
use crate::domains::documents::domain::models::report_export::InterventionReportResult;
use crate::domains::documents::infrastructure::photo::{
    GetPhotosRequest, GetPhotosResponse, PhotoMetadataUpdate, StorePhotoRequest, StorePhotoResponse,
};
use crate::domains::documents::{
    DocumentsCommand, DocumentsFacade, DocumentsResponse, DocumentsServices,
};
use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::contracts::auth::UserRole;
use tracing::{info, instrument};

fn services(state: &AppState<'_>) -> DocumentsServices {
    DocumentsServices {
        db: state.db.clone(),
        intervention_service: state.intervention_service.clone(),
        client_service: state.client_service.clone(),
        app_data_dir: state.app_data_dir.clone(),
    }
}

/// Store a new photo for an intervention step.
#[tauri::command]
#[instrument(skip(state, session_token, image_data))]
pub async fn document_store_photo(
    state: AppState<'_>,
    session_token: String,
    request: StorePhotoRequest,
    image_data: Vec<u8>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<StorePhotoResponse>, crate::commands::AppError> {
    let ctx = AuthMiddleware::authenticate_command(
        &session_token,
        &state,
        Some(UserRole::Technician),
        &correlation_id,
    )
    .await?;

    let facade = DocumentsFacade::new(state.photo_service.clone());
    match facade
        .execute(
            DocumentsCommand::StorePhoto {
                request,
                image_data,
            },
            &ctx.session,
            &services(&state),
        )
        .await?
    {
        DocumentsResponse::StorePhoto(response) => {
            info!(photo_id = %response.photo.id, "Photo stored");
            Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(crate::commands::AppError::Internal(
            "Unexpected documents facade response".to_string(),
        )),
    }
}

/// Retrieve a list of photos with optional filters.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn document_get_photos(
    state: AppState<'_>,
    session_token: String,
    request: GetPhotosRequest,
    correlation_id: Option<String>,
) -> Result<ApiResponse<GetPhotosResponse>, crate::commands::AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;

    let facade = DocumentsFacade::new(state.photo_service.clone());
    match facade
        .execute(
            DocumentsCommand::GetPhotos { request },
            &ctx.session,
            &services(&state),
        )
        .await?
    {
        DocumentsResponse::Photos(response) => {
            Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(crate::commands::AppError::Internal(
            "Unexpected documents facade response".to_string(),
        )),
    }
}

/// Get a single photo by its ID.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn document_get_photo(
    state: AppState<'_>,
    session_token: String,
    photo_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<Photo>>, crate::commands::AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;

    let facade = DocumentsFacade::new(state.photo_service.clone());
    match facade
        .execute(
            DocumentsCommand::GetPhoto { photo_id },
            &ctx.session,
            &services(&state),
        )
        .await?
    {
        DocumentsResponse::OptionalPhoto(photo) => {
            Ok(ApiResponse::success(photo).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(crate::commands::AppError::Internal(
            "Unexpected documents facade response".to_string(),
        )),
    }
}

/// Delete a photo by its ID.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn document_delete_photo(
    state: AppState<'_>,
    session_token: String,
    photo_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, crate::commands::AppError> {
    let ctx = AuthMiddleware::authenticate_command(
        &session_token,
        &state,
        Some(UserRole::Technician),
        &correlation_id,
    )
    .await?;

    let facade = DocumentsFacade::new(state.photo_service.clone());
    match facade
        .execute(
            DocumentsCommand::DeletePhoto { photo_id },
            &ctx.session,
            &services(&state),
        )
        .await?
    {
        DocumentsResponse::Unit => {
            Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(crate::commands::AppError::Internal(
            "Unexpected documents facade response".to_string(),
        )),
    }
}

/// Read binary photo data by photo ID.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn document_get_photo_data(
    state: AppState<'_>,
    session_token: String,
    photo_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Vec<u8>>, crate::commands::AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;

    let facade = DocumentsFacade::new(state.photo_service.clone());
    match facade
        .execute(
            DocumentsCommand::GetPhotoData { photo_id },
            &ctx.session,
            &services(&state),
        )
        .await?
    {
        DocumentsResponse::PhotoData(data) => {
            Ok(ApiResponse::success(data).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(crate::commands::AppError::Internal(
            "Unexpected documents facade response".to_string(),
        )),
    }
}

/// Update photo metadata.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn document_update_photo_metadata(
    state: AppState<'_>,
    session_token: String,
    photo_id: String,
    updates: PhotoMetadataUpdate,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Photo>, crate::commands::AppError> {
    let ctx = AuthMiddleware::authenticate_command(
        &session_token,
        &state,
        Some(UserRole::Technician),
        &correlation_id,
    )
    .await?;

    let facade = DocumentsFacade::new(state.photo_service.clone());
    match facade
        .execute(
            DocumentsCommand::UpdatePhotoMetadata { photo_id, updates },
            &ctx.session,
            &services(&state),
        )
        .await?
    {
        DocumentsResponse::Photo(photo) => {
            Ok(ApiResponse::success(photo).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(crate::commands::AppError::Internal(
            "Unexpected documents facade response".to_string(),
        )),
    }
}

/// Export an intervention report to a generated PDF in app-managed storage.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn export_intervention_report(
    state: AppState<'_>,
    session_token: String,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<InterventionReportResult>, crate::commands::AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;

    let facade = DocumentsFacade::new(state.photo_service.clone());
    match facade
        .execute(
            DocumentsCommand::ExportInterventionReport { intervention_id },
            &ctx.session,
            &services(&state),
        )
        .await?
    {
        DocumentsResponse::Report(result) => {
            Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(crate::commands::AppError::Internal(
            "Unexpected documents facade response".to_string(),
        )),
    }
}

/// Save an intervention report directly to a user-selected path.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn save_intervention_report(
    state: AppState<'_>,
    session_token: String,
    intervention_id: String,
    file_path: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<String>, crate::commands::AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;

    let facade = DocumentsFacade::new(state.photo_service.clone());
    match facade
        .execute(
            DocumentsCommand::SaveInterventionReport {
                intervention_id,
                file_path,
            },
            &ctx.session,
            &services(&state),
        )
        .await?
    {
        DocumentsResponse::SavedPath(path) => {
            Ok(ApiResponse::success(path).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(crate::commands::AppError::Internal(
            "Unexpected documents facade response".to_string(),
        )),
    }
}
