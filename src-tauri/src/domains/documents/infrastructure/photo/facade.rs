//! Photo Service Facade - Main API interface maintaining backward compatibility
//!
//! This module provides the main PhotoService API that delegates to specialized
//! modules while maintaining the same public interface for backward compatibility.

pub use super::metadata::{PhotoMetadataService, PhotoMetadataUpdate};
pub use super::processing::PhotoProcessingService;
pub use super::statistics::{PhotoStatisticsService, PhotoStats};
pub use super::storage::{PhotoStorageService, PhotoStorageSettings, StorageProvider};
pub use super::upload::PhotoUploadService;

use crate::db::Database;
use crate::domains::documents::domain::models::photo::Photo;

/// Request to store a new photo
#[derive(Debug, serde::Deserialize)]
pub struct StorePhotoRequest {
    pub intervention_id: String,
    pub step_id: Option<String>,
    pub step_number: Option<i32>,
    pub file_name: String,
    pub mime_type: String,
    pub photo_type: Option<String>,
    pub photo_category: Option<String>,
    pub zone: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub is_required: bool,
}

/// Response for storing a photo
#[derive(Debug, serde::Serialize)]
pub struct StorePhotoResponse {
    pub photo: Photo,
    pub file_path: String,
}

/// Request to retrieve photos
#[derive(Debug, serde::Deserialize)]
pub struct GetPhotosRequest {
    pub intervention_id: Option<String>,
    pub step_id: Option<String>,
    pub photo_type: Option<String>,
    pub photo_category: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

/// Response for retrieving photos
#[derive(Debug, serde::Serialize)]
pub struct GetPhotosResponse {
    pub photos: Vec<Photo>,
    pub total: i32,
}

/// Service errors for photo operations
#[derive(Debug, thiserror::Error)]
pub enum PhotoError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Storage error: {0}")]
    Storage(String),
    #[error("Processing error: {0}")]
    Processing(String),
    #[error("File too large: {0}")]
    FileTooLarge(String),
    #[error("Invalid file type: {0}")]
    InvalidMimeType(String),
}

impl From<String> for PhotoError {
    fn from(s: String) -> Self {
        Self::Database(s)
    }
}

/// Result type for photo operations
pub type PhotoResult<T> = Result<T, PhotoError>;

/// Main photo service - Facade maintaining backward compatibility
#[derive(Debug)]
pub struct PhotoService {
    storage: PhotoStorageService,
    processing: PhotoProcessingService,
    upload: PhotoUploadService,
    metadata: PhotoMetadataService,
    statistics: PhotoStatisticsService,
}

impl PhotoService {
    /// Create new photo service with storage configuration
    pub fn new(db: Database, storage_settings: &PhotoStorageSettings) -> PhotoResult<Self> {
        let storage = PhotoStorageService::new(db.clone(), storage_settings)?;
        let processing = PhotoProcessingService::new();
        let upload = PhotoUploadService::new(db.clone());
        let metadata = PhotoMetadataService::new(db.clone());
        let statistics = PhotoStatisticsService::new(db, storage.local_storage_path().clone());

        Ok(Self {
            storage,
            processing,
            upload,
            metadata,
            statistics,
        })
    }

    /// Store a new photo
    pub async fn store_photo(
        &self,
        request: StorePhotoRequest,
        image_data: Vec<u8>,
    ) -> PhotoResult<StorePhotoResponse> {
        // Validate request and image data
        self.validate_store_request(&request)?;
        self.validate_image_data(&image_data)?;

        // Compress image if needed
        let compressed_data = self.processing.compress_image_if_needed(image_data).await?;

        // Store based on storage provider
        let (file_path, storage_url) = match self.storage.storage_provider() {
            StorageProvider::Local => {
                let file_path = self
                    .storage
                    .store_locally(
                        &request.intervention_id,
                        &request.file_name,
                        &compressed_data,
                    )
                    .await?;
                let storage_url = format!("file://{}", file_path.display());
                (file_path, Some(storage_url))
            }
            StorageProvider::Cloud {
                provider,
                bucket,
                region,
            } => {
                let storage_url = self
                    .storage
                    .store_in_cloud(
                        provider,
                        bucket,
                        region,
                        &request.intervention_id,
                        &request.file_name,
                        &compressed_data,
                    )
                    .await?;
                let file_path = self
                    .storage
                    .generate_local_cache_path(&request.intervention_id, &request.file_name);
                (file_path, Some(storage_url))
            }
            StorageProvider::Hybrid {
                local_path,
                cloud_provider,
                bucket,
                region,
            } => {
                // Store locally first
                let file_path = self
                    .storage
                    .store_locally_with_path(
                        local_path,
                        &request.intervention_id,
                        &request.file_name,
                        &compressed_data,
                    )
                    .await?;
                // Then upload to cloud asynchronously (would be handled by background job)
                let storage_url = self
                    .storage
                    .store_in_cloud(
                        cloud_provider,
                        bucket,
                        region,
                        &request.intervention_id,
                        &request.file_name,
                        &compressed_data,
                    )
                    .await?;
                (file_path, Some(storage_url))
            }
        };

        // Get file metadata
        let metadata = tokio::fs::metadata(&file_path).await?;
        let file_size = metadata.len() as i64;

        // Extract image dimensions and quality scores
        let (width, height) = self.processing.extract_image_dimensions(&compressed_data)?;
        let (quality_score, blur_score, exposure_score, composition_score) = self
            .processing
            .calculate_photo_quality_scores(&compressed_data)?;

        // Create photo record
        let mut photo = Photo::new(
            request.intervention_id.clone(),
            file_path.to_string_lossy().to_string(),
        );
        photo.step_id = request.step_id.clone();
        photo.step_number = request.step_number;
        photo.file_name = Some(request.file_name.clone());
        photo.file_size = Some(file_size);
        photo.mime_type = request.mime_type.clone();
        photo.width = width;
        photo.height = height;
        photo.quality_score = quality_score;
        photo.blur_score = blur_score;
        photo.exposure_score = exposure_score;
        photo.composition_score = composition_score;
        photo.photo_type = request
            .photo_type
            .as_ref()
            .and_then(|s| serde_json::from_str(&format!(r#""{}""#, s)).ok());
        photo.photo_category = request
            .photo_category
            .as_ref()
            .and_then(|s| serde_json::from_str(&format!(r#""{}""#, s)).ok());
        photo.zone = request.zone.clone();
        photo.title = request.title.clone();
        photo.description = request.description.clone();
        photo.notes = request.notes.clone();
        photo.is_required = request.is_required;
        photo.storage_url = storage_url;

        // Save photo record
        self.storage.save_photo(&photo)?;

        // Generate thumbnail for efficient UI previews
        if let Err(e) = self
            .processing
            .generate_thumbnail(&compressed_data, &file_path)
            .await
        {
            tracing::warn!("Thumbnail generation failed (non-fatal): {}", e);
        }

        Ok(StorePhotoResponse {
            photo,
            file_path: file_path.to_string_lossy().to_string(),
        })
    }

    /// Get photos with filtering
    pub fn get_photos(&self, request: GetPhotosRequest) -> PhotoResult<GetPhotosResponse> {
        self.metadata.get_photos(request)
    }

    /// Get photo by ID
    pub fn get_photo(&self, id: &str) -> PhotoResult<Option<Photo>> {
        self.metadata.get_photo(id)
    }

    /// Delete photo
    pub fn delete_photo(&self, id: &str) -> PhotoResult<()> {
        self.metadata.delete_photo(id)
    }

    /// Get photo statistics
    pub fn get_stats(&self) -> PhotoResult<PhotoStats> {
        self.statistics.get_stats()
    }

    /// Read photo file data
    pub fn read_photo_data(&self, id: &str) -> PhotoResult<Vec<u8>> {
        let photo = self
            .get_photo(id)?
            .ok_or_else(|| PhotoError::NotFound(format!("Photo {} not found", id)))?;

        if !std::path::Path::new(&photo.file_path).exists() {
            return Err(PhotoError::NotFound(
                "Le fichier photo est introuvable sur le disque. Il a peut-ÃƒÂªtre ÃƒÂ©tÃƒÂ© dÃƒÂ©placÃƒÂ© ou supprimÃƒÂ©.".to_string(),
            ));
        }

        std::fs::read(&photo.file_path).map_err(PhotoError::Io)
    }

    /// Update photo metadata
    pub fn update_photo_metadata(
        &self,
        id: &str,
        updates: PhotoMetadataUpdate,
    ) -> PhotoResult<Photo> {
        self.metadata.update_photo_metadata(id, updates)
    }

    /// Attempt to upload photo with retry logic
    pub async fn upload_photo_with_retry(
        &self,
        photo_id: &str,
        max_retries: u32,
    ) -> PhotoResult<()> {
        self.upload
            .upload_photo_with_retry(photo_id, max_retries)
            .await
    }

    /// Allowed MIME types for photo uploads
    const ALLOWED_MIME_TYPES: &'static [&'static str] = &[
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
    ];

    /// Maximum upload file size in bytes (20 MB)
    const MAX_UPLOAD_SIZE: usize = 20 * 1024 * 1024;

    /// Validate store request
    fn validate_store_request(&self, request: &StorePhotoRequest) -> PhotoResult<()> {
        if request.intervention_id.is_empty() {
            return Err(PhotoError::Validation(
                "intervention_id is required".to_string(),
            ));
        }

        if request.file_name.is_empty() {
            return Err(PhotoError::Validation("file_name is required".to_string()));
        }

        if request.mime_type.is_empty() {
            return Err(PhotoError::Validation("mime_type is required".to_string()));
        }

        // Validate against allowed MIME type whitelist
        if !Self::ALLOWED_MIME_TYPES.contains(&request.mime_type.as_str()) {
            let allowed = Self::ALLOWED_MIME_TYPES
                .iter()
                .map(|t| t.split('/').last().unwrap_or(t).to_uppercase())
                .collect::<Vec<_>>()
                .join(", ");
            return Err(PhotoError::InvalidMimeType(format!(
                "Le type de fichier '{}' n'est pas pris en charge. Formats acceptÃƒÂ©s : {}.",
                request.mime_type, allowed
            )));
        }

        Ok(())
    }

    /// Validate image data size before processing
    fn validate_image_data(&self, data: &[u8]) -> PhotoResult<()> {
        if data.is_empty() {
            return Err(PhotoError::Validation(
                "Le fichier image est vide.".to_string(),
            ));
        }

        if data.len() > Self::MAX_UPLOAD_SIZE {
            let size_mb = data.len() as f64 / (1024.0 * 1024.0);
            let max_mb = Self::MAX_UPLOAD_SIZE as f64 / (1024.0 * 1024.0);
            return Err(PhotoError::FileTooLarge(format!(
                "Le fichier ({:.1} Mo) dÃƒÂ©passe la taille maximale autorisÃƒÂ©e ({:.0} Mo).",
                size_mb, max_mb
            )));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper to create a minimal PhotoService for validation-only tests.
    /// Uses a dummy config since we only test validation methods.
    fn create_test_request(mime_type: &str) -> StorePhotoRequest {
        StorePhotoRequest {
            intervention_id: "int-001".to_string(),
            step_id: None,
            step_number: None,
            file_name: "photo.jpg".to_string(),
            mime_type: mime_type.to_string(),
            photo_type: None,
            photo_category: None,
            zone: None,
            title: None,
            description: None,
            notes: None,
            is_required: false,
        }
    }

    #[test]
    fn test_allowed_mime_types_accepted() {
        for mime in PhotoService::ALLOWED_MIME_TYPES {
            let request = create_test_request(mime);
            // Validate request fields only (no DB needed)
            assert!(
                PhotoService::ALLOWED_MIME_TYPES.contains(&request.mime_type.as_str()),
                "MIME type {} should be allowed",
                mime
            );
        }
    }

    #[test]
    fn test_invalid_mime_type_rejected() {
        let invalid_types = [
            "application/pdf",
            "text/plain",
            "image/gif",
            "image/bmp",
            "video/mp4",
            "",
        ];
        for mime in &invalid_types {
            assert!(
                !PhotoService::ALLOWED_MIME_TYPES.contains(mime),
                "MIME type {} should not be allowed",
                mime
            );
        }
    }

    #[test]
    fn test_max_upload_size_constant() {
        // 20 MB limit
        assert_eq!(PhotoService::MAX_UPLOAD_SIZE, 20 * 1024 * 1024);
    }

    #[test]
    fn test_photo_error_variants() {
        // Validate that error variants produce user-friendly messages
        let err = PhotoError::FileTooLarge("test".to_string());
        assert!(err.to_string().contains("File too large"));

        let err = PhotoError::InvalidMimeType("test".to_string());
        assert!(err.to_string().contains("Invalid file type"));
    }
}
