use std::sync::Arc;

use crate::domains::documents::infrastructure::photo::PhotoService;
use crate::domains::documents::infrastructure::photo::{
    GetPhotosRequest, GetPhotosResponse, PhotoMetadataUpdate, StorePhotoRequest, StorePhotoResponse,
};
use crate::domains::documents::application::report_export as report_export_service;
use crate::shared::contracts::auth::UserSession;
use crate::shared::ipc::errors::AppError;

/// Facade for the Documents bounded context.
///
/// Provides document and photo management operations with input validation
/// and error mapping.
#[derive(Debug)]
pub struct DocumentsFacade {
    photo_service: Arc<PhotoService>,
}

/// TODO: document
pub struct DocumentsServices {
    pub db: Arc<crate::db::Database>,
    pub intervention_service: Arc<crate::shared::services::cross_domain::InterventionService>,
    pub client_service: Arc<crate::shared::services::cross_domain::ClientService>,
    pub app_data_dir: std::path::PathBuf,
}

/// TODO: document
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

/// TODO: document
pub enum DocumentsResponse {
    StorePhoto(StorePhotoResponse),
    Photos(GetPhotosResponse),
    OptionalPhoto(Option<crate::domains::documents::domain::models::photo::Photo>),
    Unit,
    PhotoData(Vec<u8>),
    Photo(crate::domains::documents::domain::models::photo::Photo),
    Report(crate::domains::documents::domain::models::report_export::InterventionReportResult),
    SavedPath(String),
}

impl DocumentsFacade {
    /// TODO: document
    pub fn new(photo_service: Arc<PhotoService>) -> Self {
        Self { photo_service }
    }

    /// TODO: document
    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying photo service.
    pub fn photo_service(&self) -> &Arc<PhotoService> {
        &self.photo_service
    }

    /// Validate a photo file extension before upload.
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

    /// TODO: document
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
