//! Photo Service Facade - Main API interface maintaining backward compatibility
//!
//! This module provides the main PhotoService API that delegates to specialized
//! modules while maintaining the same public interface for backward compatibility.

pub use super::storage::{PhotoStorageService, StorageProvider};
pub use super::processing::PhotoProcessingService;
pub use super::upload::PhotoUploadService;
pub use super::metadata::{PhotoMetadataService, PhotoMetadataUpdate};
pub use super::statistics::{PhotoStatisticsService, PhotoStats};

use crate::db::Database;
use crate::models::photo::Photo;

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
    pub fn new(
        db: Database,
        storage_settings: &crate::models::settings::StorageSettings,
    ) -> PhotoResult<Self> {
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
        // Validate request
        self.validate_store_request(&request)?;

        // Compress image if needed
        let compressed_data = self.processing.compress_image_if_needed(image_data).await?;

        // Store based on storage provider
        let (file_path, storage_url) = match self.storage.storage_provider() {
            StorageProvider::Local => {
                let file_path = self.storage.store_locally(
                    &request.intervention_id,
                    &request.file_name,
                    &compressed_data,
                ).await?;
                let storage_url = format!("file://{}", file_path.display());
                (file_path, Some(storage_url))
            }
            StorageProvider::Cloud { provider, bucket, region } => {
                let storage_url = self.storage.store_in_cloud(
                    provider,
                    bucket,
                    region,
                    &request.intervention_id,
                    &request.file_name,
                    &compressed_data,
                ).await?;
                let file_path = self.storage.generate_local_cache_path(&request.intervention_id, &request.file_name);
                (file_path, Some(storage_url))
            }
            StorageProvider::Hybrid { local_path, cloud_provider, bucket, region } => {
                // Store locally first
                let file_path = self.storage.store_locally_with_path(
                    local_path,
                    &request.intervention_id,
                    &request.file_name,
                    &compressed_data,
                ).await?;
                // Then upload to cloud asynchronously (would be handled by background job)
                let storage_url = self.storage.store_in_cloud(
                    cloud_provider,
                    bucket,
                    region,
                    &request.intervention_id,
                    &request.file_name,
                    &compressed_data,
                ).await?;
                (file_path, Some(storage_url))
            }
        };

        // Get file metadata
        let metadata = std::fs::metadata(&file_path)?;
        let file_size = metadata.len() as i64;

        // Extract image dimensions and quality scores
        let (width, height) = self.processing.extract_image_dimensions(&compressed_data)?;
        let (quality_score, blur_score, exposure_score, composition_score) =
            self.processing.calculate_photo_quality_scores(&compressed_data)?;

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
        self.upload.upload_photo_with_retry(photo_id, max_retries).await
    }

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

        // Validate mime type
        if !request.mime_type.starts_with("image/") {
            return Err(PhotoError::Validation(
                "Only image files are supported".to_string(),
            ));
        }

        Ok(())
    }
}