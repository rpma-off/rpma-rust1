//! Thin documents IPC surface and facade wiring.

use std::sync::Arc;

use tracing::{info, instrument};

use super::report_export as report_export_service;
use crate::commands::{ApiResponse, AppError, AppState};
pub use crate::domains::documents::infrastructure::photo_service::PhotoService;
use crate::domains::documents::models::{InterventionReportResult, Photo};
pub use crate::domains::documents::photo_types::*;
use crate::resolve_context;
use crate::shared::contracts::auth::{UserRole, UserSession};

#[derive(Debug)]
pub struct DocumentsFacade {
    photo_service: Arc<PhotoService>,
}

pub struct DocumentsServices {
    pub db: Arc<crate::db::Database>,
    pub intervention_service: Arc<crate::shared::services::cross_domain::InterventionService>,
    pub client_service: Arc<crate::shared::services::cross_domain::ClientService>,
    pub app_data_dir: std::path::PathBuf,
}

pub enum DocumentsCommand {
    StorePhoto {
        request: StorePhotoRequest,
        image_data: Vec<u8>,
    },
    GetPhotos {
        request: GetPhotosRequest,
    },
    GetPhoto {
        photo_id: String,
    },
    DeletePhoto {
        photo_id: String,
    },
    GetPhotoData {
        photo_id: String,
    },
    UpdatePhotoMetadata {
        photo_id: String,
        updates: PhotoMetadataUpdate,
    },
    ExportInterventionReport {
        intervention_id: String,
    },
    SaveInterventionReport {
        intervention_id: String,
        file_path: String,
    },
}

pub enum DocumentsResponse {
    StorePhoto(StorePhotoResponse),
    Photos(GetPhotosResponse),
    OptionalPhoto(Option<Photo>),
    Unit,
    PhotoData(Vec<u8>),
    Photo(Photo),
    Report(InterventionReportResult),
    SavedPath(String),
}

impl DocumentsFacade {
    pub fn new(photo_service: Arc<PhotoService>) -> Self {
        Self { photo_service }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    pub fn photo_service(&self) -> &Arc<PhotoService> {
        &self.photo_service
    }

    pub fn validate_photo_extension(&self, filename: &str) -> Result<(), AppError> {
        let valid_extensions = ["jpg", "jpeg", "png", "webp", "heic"];
        let extension = filename.rsplit('.').next().unwrap_or("").to_lowercase();
        if !valid_extensions.contains(&extension.as_str()) {
            return Err(AppError::Validation(format!(
                "Invalid photo extension: {}. Valid extensions: {}",
                extension,
                valid_extensions.join(", ")
            )));
        }
        Ok(())
    }

    pub async fn execute(
        &self,
        command: DocumentsCommand,
        user: &UserSession,
        services: &DocumentsServices,
    ) -> Result<DocumentsResponse, AppError> {
        match command {
            DocumentsCommand::StorePhoto {
                request,
                image_data,
            } => {
                let response = self
                    .photo_service
                    .store_photo(request, image_data)
                    .await
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                Ok(DocumentsResponse::StorePhoto(response))
            }
            DocumentsCommand::GetPhotos { request } => {
                let response = self
                    .photo_service
                    .get_photos(request)
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                Ok(DocumentsResponse::Photos(response))
            }
            DocumentsCommand::GetPhoto { photo_id } => {
                let photo = self
                    .photo_service
                    .get_photo(&photo_id)
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                Ok(DocumentsResponse::OptionalPhoto(photo))
            }
            DocumentsCommand::DeletePhoto { photo_id } => {
                self.photo_service
                    .delete_photo(&photo_id)
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                Ok(DocumentsResponse::Unit)
            }
            DocumentsCommand::GetPhotoData { photo_id } => {
                let data = self
                    .photo_service
                    .read_photo_data(&photo_id)
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                Ok(DocumentsResponse::PhotoData(data))
            }
            DocumentsCommand::UpdatePhotoMetadata { photo_id, updates } => {
                let photo = self
                    .photo_service
                    .update_photo_metadata(&photo_id, updates)
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                Ok(DocumentsResponse::Photo(photo))
            }
            DocumentsCommand::ExportInterventionReport { intervention_id } => {
                let intervention_data = report_export_service::get_intervention_with_details(
                    &intervention_id,
                    &services.db,
                    Some(&services.intervention_service),
                    Some(&services.client_service),
                )
                .await?;

                report_export_service::check_intervention_export_permissions(
                    intervention_data.intervention.technician_id.clone(),
                    user,
                )?;

                let result = report_export_service::export_intervention_report(
                    &intervention_data,
                    &services.app_data_dir,
                )
                .await?;

                Ok(DocumentsResponse::Report(result))
            }
            DocumentsCommand::SaveInterventionReport {
                intervention_id,
                file_path,
            } => {
                let intervention_data = report_export_service::get_intervention_with_details(
                    &intervention_id,
                    &services.db,
                    Some(&services.intervention_service),
                    Some(&services.client_service),
                )
                .await?;

                report_export_service::check_intervention_export_permissions(
                    intervention_data.intervention.technician_id.clone(),
                    user,
                )?;

                let saved_path =
                    report_export_service::save_intervention_report(&intervention_data, &file_path)
                        .await?;

                Ok(DocumentsResponse::SavedPath(saved_path))
            }
        }
    }
}

fn get_services(state: &AppState<'_>) -> DocumentsServices {
    DocumentsServices {
        db: state.db.clone(),
        intervention_service: state.intervention_service.clone(),
        client_service: state.client_service.clone(),
        app_data_dir: state.app_config.app_data_dir.clone(),
    }
}

#[tauri::command]
#[instrument(skip(state, image_data))]
pub async fn document_store_photo(
    state: AppState<'_>,
    request: StorePhotoRequest,
    image_data: Vec<u8>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<StorePhotoResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    let user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone());

    match facade
        .execute(
            DocumentsCommand::StorePhoto {
                request,
                image_data,
            },
            &user,
            &get_services(&state),
        )
        .await?
    {
        DocumentsResponse::StorePhoto(res) => {
            info!(photo_id = %res.photo.id, "Photo stored");
            Ok(ApiResponse::success(res).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".into())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn document_get_photos(
    state: AppState<'_>,
    request: GetPhotosRequest,
    correlation_id: Option<String>,
) -> Result<ApiResponse<GetPhotosResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone());

    match facade
        .execute(
            DocumentsCommand::GetPhotos { request },
            &user,
            &get_services(&state),
        )
        .await?
    {
        DocumentsResponse::Photos(res) => {
            Ok(ApiResponse::success(res).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".into())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn document_get_photo(
    state: AppState<'_>,
    photo_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<Photo>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone());

    match facade
        .execute(
            DocumentsCommand::GetPhoto { photo_id },
            &user,
            &get_services(&state),
        )
        .await?
    {
        DocumentsResponse::OptionalPhoto(photo) => {
            Ok(ApiResponse::success(photo).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".into())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn document_delete_photo(
    state: AppState<'_>,
    photo_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    let user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone());

    match facade
        .execute(
            DocumentsCommand::DeletePhoto { photo_id },
            &user,
            &get_services(&state),
        )
        .await?
    {
        DocumentsResponse::Unit => {
            Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".into())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn document_get_photo_data(
    state: AppState<'_>,
    photo_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Vec<u8>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone());

    match facade
        .execute(
            DocumentsCommand::GetPhotoData { photo_id },
            &user,
            &get_services(&state),
        )
        .await?
    {
        DocumentsResponse::PhotoData(data) => {
            Ok(ApiResponse::success(data).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".into())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn document_update_photo_metadata(
    state: AppState<'_>,
    photo_id: String,
    updates: PhotoMetadataUpdate,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Photo>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    let user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone());

    match facade
        .execute(
            DocumentsCommand::UpdatePhotoMetadata { photo_id, updates },
            &user,
            &get_services(&state),
        )
        .await?
    {
        DocumentsResponse::Photo(photo) => {
            Ok(ApiResponse::success(photo).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".into())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn export_intervention_report(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<InterventionReportResult>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone());

    match facade
        .execute(
            DocumentsCommand::ExportInterventionReport { intervention_id },
            &user,
            &get_services(&state),
        )
        .await?
    {
        DocumentsResponse::Report(res) => {
            Ok(ApiResponse::success(res).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".into())),
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn save_intervention_report(
    state: AppState<'_>,
    intervention_id: String,
    file_path: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone());

    match facade
        .execute(
            DocumentsCommand::SaveInterventionReport {
                intervention_id,
                file_path,
            },
            &user,
            &get_services(&state),
        )
        .await?
    {
        DocumentsResponse::SavedPath(path) => {
            Ok(ApiResponse::success(path).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".into())),
    }
}
