//! Photo Handler - Combined IPC commands and Photo Service logic
//!
//! This module provides the flattened implementation of photo management,
//! combining service logic and Tauri IPC commands.
//!
// DEBT: Mixed responsibilities — 1297-line file bundles domain types, PhotoService,
// image-compression logic, thumbnail generation, and Tauri IPC commands.
// Rationale: violates single-responsibility; any change to image processing forces a
// recompile of the IPC layer and vice-versa.
// Next step: extract `PhotoService` into `infrastructure/photo_service.rs` (no API break needed)
// and leave only thin `document_*` IPC wrappers here.

use image::ImageFormat;
use rusqlite::params;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tokio::sync::Semaphore;
use tracing::{info, instrument, warn};

use super::models::*;
use super::report_export as report_export_service;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::db::Database;
use crate::resolve_context;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::contracts::common::now;

// ── Types and Errors ─────────────────────────────────────────────────────────

/// Photo metadata update request
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PhotoMetadataUpdate {
    pub title: Option<Option<String>>,
    pub description: Option<Option<String>>,
    pub notes: Option<Option<String>>,
    pub is_approved: Option<bool>,
    pub approved_by: Option<Option<String>>,
    pub rejection_reason: Option<Option<String>>,
}

/// Request to store a new photo
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
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
#[serde(deny_unknown_fields)]
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

/// Photo storage statistics
#[derive(Debug, serde::Serialize)]
pub struct PhotoStats {
    pub total_photos: i32,
    pub total_size_bytes: i64,
    pub photos_by_intervention: HashMap<String, i32>,
    pub storage_path: String,
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

impl From<rusqlite::Error> for PhotoError {
    fn from(e: rusqlite::Error) -> Self {
        Self::Database(e.to_string())
    }
}

impl From<PhotoError> for AppError {
    fn from(e: PhotoError) -> Self {
        match e {
            PhotoError::NotFound(m) => AppError::NotFound(m),
            PhotoError::Validation(m) | PhotoError::InvalidMimeType(m) => AppError::Validation(m),
            _ => AppError::Internal(e.to_string()),
        }
    }
}

pub type PhotoResult<T> = Result<T, PhotoError>;

/// Photo storage settings
#[derive(Debug, Clone)]
pub struct PhotoStorageSettings {
    pub photo_storage_type: String,
    pub local_storage_path: Option<String>,
    pub cloud_provider: Option<String>,
    pub cloud_bucket: Option<String>,
    pub cloud_region: Option<String>,
}

impl Default for PhotoStorageSettings {
    fn default() -> Self {
        Self {
            photo_storage_type: "local".to_string(),
            local_storage_path: None,
            cloud_provider: None,
            cloud_bucket: None,
            cloud_region: None,
        }
    }
}

#[derive(Debug, Clone)]
pub enum StorageProvider {
    Local,
    Cloud {
        provider: CloudProvider,
        bucket: String,
        region: String,
    },
    Hybrid {
        local_path: PathBuf,
        cloud_provider: CloudProvider,
        bucket: String,
        region: String,
    },
}

#[derive(Debug, Clone)]
pub enum CloudProvider {
    AwsS3,
    GcpStorage,
    AzureBlob,
}

// ── Photo Service ────────────────────────────────────────────────────────────

// TODO(ADR-001): extract business logic to application/
#[derive(Debug)]
pub struct PhotoService {
    db: Database,
    storage_provider: StorageProvider,
    local_storage_path: PathBuf,
    processing_semaphore: Arc<Semaphore>,
    jpeg_quality: u8,
    max_file_size: usize,
}

impl PhotoService {
    pub fn new(db: Database, settings: &PhotoStorageSettings) -> PhotoResult<Self> {
        let storage_provider = Self::create_storage_provider(settings)?;
        let local_storage_path = Self::get_local_storage_path(settings)?;

        Ok(Self {
            db,
            storage_provider,
            local_storage_path,
            processing_semaphore: Arc::new(Semaphore::new(4)),
            jpeg_quality: 80,
            max_file_size: 20 * 1024 * 1024, // 20MB
        })
    }

    // ── Storage Logic ──

    fn create_storage_provider(settings: &PhotoStorageSettings) -> PhotoResult<StorageProvider> {
        match settings.photo_storage_type.as_str() {
            "local" => Ok(StorageProvider::Local),
            "cloud" => {
                let provider = Self::parse_cloud_provider(settings)?;
                let bucket = settings.cloud_bucket.clone().ok_or_else(|| {
                    PhotoError::Validation("Cloud bucket not configured".to_string())
                })?;
                let region = settings.cloud_region.clone().ok_or_else(|| {
                    PhotoError::Validation("Cloud region not configured".to_string())
                })?;
                Ok(StorageProvider::Cloud {
                    provider,
                    bucket,
                    region,
                })
            }
            "hybrid" => {
                let local_path = Self::get_local_storage_path(settings)?;
                let provider = Self::parse_cloud_provider(settings)?;
                let bucket = settings.cloud_bucket.clone().ok_or_else(|| {
                    PhotoError::Validation("Cloud bucket not configured".to_string())
                })?;
                let region = settings.cloud_region.clone().ok_or_else(|| {
                    PhotoError::Validation("Cloud region not configured".to_string())
                })?;
                Ok(StorageProvider::Hybrid {
                    local_path,
                    cloud_provider: provider,
                    bucket,
                    region,
                })
            }
            _ => Err(PhotoError::Validation(format!(
                "Unknown storage type: {}",
                settings.photo_storage_type
            ))),
        }
    }

    fn parse_cloud_provider(settings: &PhotoStorageSettings) -> PhotoResult<CloudProvider> {
        match settings.cloud_provider.as_deref() {
            Some("aws_s3") => Ok(CloudProvider::AwsS3),
            Some("gcp_storage") => Ok(CloudProvider::GcpStorage),
            Some("azure_blob") => Ok(CloudProvider::AzureBlob),
            Some(provider) => Err(PhotoError::Validation(format!(
                "Unknown cloud provider: {}",
                provider
            ))),
            None => Err(PhotoError::Validation(
                "Cloud provider not configured".to_string(),
            )),
        }
    }

    fn get_local_storage_path(settings: &PhotoStorageSettings) -> PhotoResult<PathBuf> {
        match &settings.local_storage_path {
            Some(path) => Ok(PathBuf::from(path)),
            None => {
                let mut path = std::env::current_dir().map_err(|e| {
                    PhotoError::Storage(format!("Could not determine current directory: {}", e))
                })?;
                path.push("photos");
                Ok(path)
            }
        }
    }

    fn validate_store_request(&self, request: &StorePhotoRequest) -> PhotoResult<()> {
        if request.intervention_id.is_empty() {
            return Err(PhotoError::Validation(
                "Intervention ID is required".to_string(),
            ));
        }
        Ok(())
    }

    fn validate_image_data(&self, data: &[u8]) -> PhotoResult<()> {
        if data.is_empty() {
            return Err(PhotoError::Validation("Image data is empty".to_string()));
        }
        if data.len() > self.max_file_size {
            return Err(PhotoError::FileTooLarge(format!(
                "Size {} exceeds limit",
                data.len()
            )));
        }
        Ok(())
    }

    pub async fn store_photo(
        &self,
        request: StorePhotoRequest,
        image_data: Vec<u8>,
    ) -> PhotoResult<StorePhotoResponse> {
        self.validate_store_request(&request)?;
        self.validate_image_data(&image_data)?;

        let compressed_data = self.compress_image_if_needed(image_data).await?;

        let (file_path, storage_url) = match &self.storage_provider {
            StorageProvider::Local => {
                let file_path = self
                    .store_locally(
                        &request.intervention_id,
                        &request.file_name,
                        &compressed_data,
                    )
                    .await?;
                (
                    file_path.clone(),
                    Some(format!("file://{}", file_path.display())),
                )
            }
            StorageProvider::Cloud {
                provider,
                bucket,
                region,
            } => {
                let storage_url = self
                    .store_in_cloud(
                        provider,
                        bucket,
                        region,
                        &request.intervention_id,
                        &request.file_name,
                        &compressed_data,
                    )
                    .await?;
                let file_path =
                    self.generate_local_cache_path(&request.intervention_id, &request.file_name);
                (file_path, Some(storage_url))
            }
            StorageProvider::Hybrid {
                local_path,
                cloud_provider,
                bucket,
                region,
            } => {
                let file_path = self
                    .store_locally_with_path(
                        local_path,
                        &request.intervention_id,
                        &request.file_name,
                        &compressed_data,
                    )
                    .await?;
                let storage_url = self
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

        let metadata = tokio::fs::metadata(&file_path).await?;
        let file_size = metadata.len() as i64;

        let (width, height) = helpers::extract_image_dimensions(&compressed_data)?;
        let (quality_score, blur_score, exposure_score, composition_score) =
            helpers::calculate_photo_quality_scores(&compressed_data)?;

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

        self.save_photo_record(&photo)?;

        if let Err(e) = self.generate_thumbnail(&compressed_data, &file_path).await {
            warn!("Thumbnail generation failed (non-fatal): {}", e);
        }

        Ok(StorePhotoResponse {
            photo,
            file_path: file_path.to_string_lossy().to_string(),
        })
    }

    async fn store_locally(
        &self,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> PhotoResult<PathBuf> {
        let file_path = self.generate_file_path(intervention_id, file_name);
        self.write_file_atomic(&file_path, data).await?;
        Ok(file_path)
    }

    async fn store_locally_with_path(
        &self,
        base_path: &Path,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> PhotoResult<PathBuf> {
        let file_path = base_path
            .join(intervention_id)
            .join("photos")
            .join(file_name);
        self.write_file_atomic(&file_path, data).await?;
        Ok(file_path)
    }

    async fn write_file_atomic(&self, path: &Path, data: &[u8]) -> PhotoResult<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).await?;
        }
        let tmp_path = path.with_extension("tmp");
        fs::write(&tmp_path, data).await?;
        fs::rename(&tmp_path, path).await.map_err(|e| {
            let _ = std::fs::remove_file(&tmp_path);
            PhotoError::from(e)
        })?;
        Ok(())
    }

    async fn store_in_cloud(
        &self,
        provider: &CloudProvider,
        _bucket: &str,
        _region: &str,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> PhotoResult<String> {
        match provider {
            CloudProvider::AwsS3 => {
                let file_path = self.store_locally(intervention_id, file_name, data).await?;
                let url = format!("file://{}", file_path.display());
                warn!("S3 upload not implemented, stored locally: {}", url);
                Ok(url)
            }
            CloudProvider::GcpStorage => {
                let file_path = self.store_locally(intervention_id, file_name, data).await?;
                let url = format!("file://{}", file_path.display());
                warn!("GCP upload not implemented, stored locally: {}", url);
                Ok(url)
            }
            CloudProvider::AzureBlob => {
                let file_path = self.store_locally(intervention_id, file_name, data).await?;
                let url = format!("file://{}", file_path.display());
                warn!("Azure upload not implemented, stored locally: {}", url);
                Ok(url)
            }
        }
    }

    pub fn generate_file_path(&self, intervention_id: &str, file_name: &str) -> PathBuf {
        self.local_storage_path
            .join(intervention_id)
            .join("photos")
            .join(file_name)
    }

    pub fn generate_local_cache_path(&self, intervention_id: &str, file_name: &str) -> PathBuf {
        self.local_storage_path
            .join("cache")
            .join(intervention_id)
            .join(file_name)
    }

    // ── Metadata Logic ──

    // TODO(ADR-005): move to infrastructure repository
    pub fn get_photos(&self, request: GetPhotosRequest) -> PhotoResult<GetPhotosResponse> {
        let mut conditions = Vec::new();
        let mut params_vec = Vec::new();

        if let Some(intervention_id) = &request.intervention_id {
            conditions.push("intervention_id = ?");
            params_vec.push(intervention_id.clone());
        }
        if let Some(step_id) = &request.step_id {
            conditions.push("step_id = ?");
            params_vec.push(step_id.clone());
        }
        if let Some(photo_type) = &request.photo_type {
            conditions.push("photo_type = ?");
            params_vec.push(photo_type.clone());
        }
        if let Some(photo_category) = &request.photo_category {
            conditions.push("photo_category = ?");
            params_vec.push(photo_category.clone());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };
        let limit = request.limit.unwrap_or(50);
        let offset = request.offset.unwrap_or(0);

        let sql = format!(
            "SELECT * FROM photos {} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            where_clause
        );
        let mut query_params = params_vec.clone();
        query_params.push(limit.to_string());
        query_params.push(offset.to_string());

        let rusql_params: Vec<&dyn rusqlite::ToSql> = query_params
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();
        let photos = self.db.query_as::<Photo>(&sql, &rusql_params[..])?;

        let count_sql = format!("SELECT COUNT(*) FROM photos {}", where_clause);
        let count_rusql_params: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();
        let total: i32 = self
            .db
            .query_single_value(&count_sql, &count_rusql_params[..])?;

        Ok(GetPhotosResponse { photos, total })
    }

    // TODO(ADR-005): move to infrastructure repository
    pub fn get_photo(&self, id: &str) -> PhotoResult<Option<Photo>> {
        Ok(self
            .db
            .query_single_as::<Photo>("SELECT * FROM photos WHERE id = ?", params![id])?)
    }

    // TODO(ADR-005): move to infrastructure repository
    pub fn delete_photo(&self, id: &str) -> PhotoResult<()> {
        let photo = self
            .get_photo(id)?
            .ok_or_else(|| PhotoError::NotFound(format!("Photo {} not found", id)))?;
        if Path::new(&photo.file_path).exists() {
            let _ = std::fs::remove_file(&photo.file_path);
        }
        self.db
            .execute("DELETE FROM photos WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn update_photo_metadata(
        &self,
        id: &str,
        updates: PhotoMetadataUpdate,
    ) -> PhotoResult<Photo> {
        let mut photo = self
            .get_photo(id)?
            .ok_or_else(|| PhotoError::NotFound(format!("Photo {} not found", id)))?;

        if let Some(title) = updates.title {
            photo.title = title;
        }
        if let Some(description) = updates.description {
            photo.description = description;
        }
        if let Some(notes) = updates.notes {
            photo.notes = notes;
        }
        if let Some(is_approved) = updates.is_approved {
            photo.is_approved = is_approved;
        }
        if let Some(approved_by) = updates.approved_by {
            photo.approved_by = approved_by;
        }
        if let Some(rejection_reason) = updates.rejection_reason {
            photo.rejection_reason = rejection_reason;
        }

        photo.updated_at = now();
        self.save_photo_record(&photo)?;
        Ok(photo)
    }

    // TODO(ADR-005): move to infrastructure repository
    fn save_photo_record(&self, photo: &Photo) -> PhotoResult<()> {
        let exists: i32 = self.db.query_single_value(
            "SELECT COUNT(*) FROM photos WHERE id = ?",
            params![photo.id],
        )?;
        if exists > 0 {
            self.db.execute(
                "UPDATE photos SET step_id = ?, step_number = ?, file_name = ?, file_size = ?, mime_type = ?, width = ?, height = ?, photo_type = ?, photo_category = ?, photo_angle = ?, zone = ?, title = ?, description = ?, notes = ?, annotations = ?, gps_location_lat = ?, gps_location_lon = ?, gps_location_accuracy = ?, quality_score = ?, blur_score = ?, exposure_score = ?, composition_score = ?, is_required = ?, is_approved = ?, approved_by = ?, approved_at = ?, rejection_reason = ?, synced = ?, storage_url = ?, upload_retry_count = ?, upload_error = ?, last_synced_at = ?, captured_at = ?, uploaded_at = ?, updated_at = ? WHERE id = ?",
                params![photo.step_id, photo.step_number, photo.file_name, photo.file_size, photo.mime_type, photo.width, photo.height, photo.photo_type, photo.photo_category, photo.photo_angle, photo.zone, photo.title, photo.description, photo.notes, photo.annotations.as_ref().map(|a| serde_json::to_string(a).unwrap_or_default()), photo.gps_location_lat, photo.gps_location_lon, photo.gps_location_accuracy, photo.quality_score, photo.blur_score, photo.exposure_score, photo.composition_score, photo.is_required, photo.is_approved, photo.approved_by, photo.approved_at, photo.rejection_reason, photo.synced, photo.storage_url, photo.upload_retry_count, photo.upload_error, photo.last_synced_at, photo.captured_at, photo.uploaded_at, photo.updated_at, photo.id]
            )?;
        } else {
            self.db.execute(
                "INSERT INTO photos (id, intervention_id, step_id, step_number, file_name, file_path, file_size, mime_type, width, height, photo_type, photo_category, photo_angle, zone, title, description, notes, annotations, gps_location_lat, gps_location_lon, gps_location_accuracy, quality_score, blur_score, exposure_score, composition_score, is_required, is_approved, approved_by, approved_at, rejection_reason, synced, storage_url, upload_retry_count, upload_error, last_synced_at, captured_at, uploaded_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![photo.id, photo.intervention_id, photo.step_id, photo.step_number, photo.file_name, photo.file_path, photo.file_size, photo.mime_type, photo.width, photo.height, photo.photo_type, photo.photo_category, photo.photo_angle, photo.zone, photo.title, photo.description, photo.notes, photo.annotations.as_ref().map(|a| serde_json::to_string(a).unwrap_or_default()), photo.gps_location_lat, photo.gps_location_lon, photo.gps_location_accuracy, photo.quality_score, photo.blur_score, photo.exposure_score, photo.composition_score, photo.is_required, photo.is_approved, photo.approved_by, photo.approved_at, photo.rejection_reason, photo.synced, photo.storage_url, photo.upload_retry_count, photo.upload_error, photo.last_synced_at, photo.captured_at, photo.uploaded_at, photo.created_at, photo.updated_at]
            )?;
        }
        Ok(())
    }

    // ── Processing Logic ──

    // TODO(ADR-001): extract business logic to application/
    pub async fn compress_image_if_needed(&self, data: Vec<u8>) -> PhotoResult<Vec<u8>> {
        if data.len() <= self.max_file_size {
            return Ok(data);
        }
        let _permit = self
            .processing_semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|e| PhotoError::Processing(format!("Semaphore error: {}", e)))?;
        let quality = self.jpeg_quality;
        let max_size = self.max_file_size;
        tokio::task::spawn_blocking(move || helpers::compress_image_blocking(&data, quality, max_size))
            .await
            .map_err(|e| PhotoError::Processing(e.to_string()))?
    }

    // TODO(ADR-001): extract business logic to application/
    pub async fn generate_thumbnail(&self, data: &[u8], path: &Path) -> PhotoResult<PathBuf> {
        let data = data.to_vec();
        let thumb_path = helpers::thumbnail_path(path);
        let target = thumb_path.clone();
        tokio::task::spawn_blocking(move || helpers::generate_thumbnail_blocking(&data, &target))
            .await
            .map_err(|e| PhotoError::Processing(e.to_string()))??;
        Ok(thumb_path)
    }

    // ── Statistics Logic ──

    // TODO(ADR-005): move to infrastructure repository
    pub fn get_stats(&self) -> PhotoResult<PhotoStats> {
        let total: i32 = self
            .db
            .query_single_value("SELECT COUNT(*) FROM photos", [])?;
        let size: i64 = self
            .db
            .query_single_value("SELECT COALESCE(SUM(file_size), 0) FROM photos", [])?;
        let intervention_stats = self.db.query_multiple(
            "SELECT intervention_id, COUNT(*) FROM photos GROUP BY intervention_id",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?)),
        )?;
        let photos_by_intervention = intervention_stats.into_iter().collect();
        Ok(PhotoStats {
            total_photos: total,
            total_size_bytes: size,
            photos_by_intervention,
            storage_path: self.local_storage_path.to_string_lossy().to_string(),
        })
    }

    pub fn read_photo_data(&self, id: &str) -> PhotoResult<Vec<u8>> {
        let photo = self
            .get_photo(id)?
            .ok_or_else(|| PhotoError::NotFound(format!("Photo {} not found", id)))?;
        if !Path::new(&photo.file_path).exists() {
            return Err(PhotoError::NotFound(
                "Photo file not found on disk".to_string(),
            ));
        }
        std::fs::read(&photo.file_path).map_err(PhotoError::Io)
    }

    pub async fn upload_photo_with_retry(
        &self,
        photo_id: &str,
        max_retries: u32,
    ) -> PhotoResult<()> {
        let mut photo = self
            .get_photo(photo_id)?
            .ok_or_else(|| PhotoError::NotFound(format!("Photo {} not found", photo_id)))?;
        if photo.synced {
            return Ok(());
        }
        let mut retry_count = photo.upload_retry_count as u32;
        while retry_count < max_retries {
            match self.attempt_upload().await {
                Ok(_) => {
                    photo.synced = true;
                    photo.uploaded_at = Some(now());
                    photo.upload_retry_count = 0;
                    photo.upload_error = None;
                    self.save_photo_record(&photo)?;
                    return Ok(());
                }
                Err(e) => {
                    retry_count += 1;
                    photo.upload_retry_count = retry_count as i32;
                    photo.upload_error = Some(e.to_string());
                    self.save_photo_record(&photo)?;
                    let delay = 2u64.pow(retry_count.min(5));
                    tokio::time::sleep(tokio::time::Duration::from_secs(delay)).await;
                }
            }
        }
        Err(PhotoError::Storage(format!(
            "Upload failed after {} retries",
            max_retries
        )))
    }

    async fn attempt_upload(&self) -> PhotoResult<()> {
        use rand::Rng;
        if rand::thread_rng().gen::<f64>() < 0.7 {
            Ok(())
        } else {
            Err(PhotoError::Storage("Simulated upload failure".to_string()))
        }
    }
}

// ── Facade Logic ──

/// Facade for the Documents bounded context.
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
    OptionalPhoto(Option<Photo>),
    Unit,
    PhotoData(Vec<u8>),
    Photo(Photo),
    Report(InterventionReportResult),
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

// ── IPC Commands ─────────────────────────────────────────────────────────────

fn get_services(state: &AppState<'_>) -> DocumentsServices {
    DocumentsServices {
        db: state.db.clone(),
        intervention_service: state.intervention_service.clone(),
        client_service: state.client_service.clone(),
        app_data_dir: state.app_config.app_data_dir.clone(),
    }
}

/// ADR-018: Thin IPC layer
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

// ── Private helpers ──────────────────────────────────────────────────────────

/// Pure image-processing helpers extracted from [`PhotoService`].
///
/// All functions here are stateless (no DB, no I/O semaphore) so they can be
/// unit-tested and, when the domain migrates to the four-layer structure, moved
/// into `application/` without any call-site changes other than the path prefix.
mod helpers {
    use super::{ImageFormat, PhotoError, PhotoResult};
    use image::{GenericImageView, ImageEncoder};
    use std::io::Cursor;
    use std::path::{Path, PathBuf};

    /// Compress `data` to JPEG at the given `quality`, recursively halving
    /// quality until the output fits within `max_size`.
    pub(super) fn compress_image_blocking(
        data: &[u8],
        quality: u8,
        max_size: usize,
    ) -> PhotoResult<Vec<u8>> {
        let img =
            image::load_from_memory(data).map_err(|e| PhotoError::Processing(e.to_string()))?;
        let mut output = Cursor::new(Vec::new());
        let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut output, quality);
        encoder
            .write_image(
                img.as_bytes(),
                img.width(),
                img.height(),
                img.color().into(),
            )
            .map_err(|e| PhotoError::Processing(e.to_string()))?;
        let compressed = output.into_inner();
        if compressed.len() > max_size && quality > 20 {
            return compress_image_blocking(data, quality / 2, max_size);
        }
        Ok(compressed)
    }

    /// Return `(width, height)` from raw image bytes, or `(None, None)` on error.
    pub(super) fn extract_image_dimensions(
        data: &[u8],
    ) -> PhotoResult<(Option<i32>, Option<i32>)> {
        match image::load_from_memory(data) {
            Ok(img) => {
                let (w, h) = img.dimensions();
                Ok((Some(w as i32), Some(h as i32)))
            }
            Err(_) => Ok((None, None)),
        }
    }

    /// Compute (overall, blur, exposure, composition) quality scores (0–100).
    pub(super) fn calculate_photo_quality_scores(
        data: &[u8],
    ) -> PhotoResult<(Option<i32>, Option<i32>, Option<i32>, Option<i32>)> {
        match image::load_from_memory(data) {
            Ok(img) => {
                let gray = img.to_luma8();
                let (w, h) = gray.dimensions();
                let blur = calculate_blur_score(&gray, w, h);
                let exposure = calculate_exposure_score(&gray);
                let composition = calculate_composition_score(&gray, w, h);
                let overall = ((blur as f32 * 0.4)
                    + (exposure as f32 * 0.3)
                    + (composition as f32 * 0.3)) as i32;
                Ok((Some(overall), Some(blur), Some(exposure), Some(composition)))
            }
            Err(_) => Ok((None, None, None, None)),
        }
    }

    /// Laplacian-variance sharpness score (higher = sharper).
    pub(super) fn calculate_blur_score(gray: &image::GrayImage, w: u32, h: u32) -> i32 {
        let mut variance = 0.0;
        let mut count = 0;
        for y in 1..h.saturating_sub(1) {
            for x in 1..w.saturating_sub(1) {
                let center = gray.get_pixel(x, y).0[0] as f32;
                let top = gray.get_pixel(x, y - 1).0[0] as f32;
                let bottom = gray.get_pixel(x, y + 1).0[0] as f32;
                let left = gray.get_pixel(x - 1, y).0[0] as f32;
                let right = gray.get_pixel(x + 1, y).0[0] as f32;
                let laplacian = center * 4.0 - top - bottom - left - right;
                variance += laplacian * laplacian;
                count += 1;
            }
        }
        if count > 0 {
            ((variance / count as f32) / 1000.0).min(1.0) as i32 * 100
        } else {
            50
        }
    }

    /// Penalise over- and under-exposed pixels.
    pub(super) fn calculate_exposure_score(gray: &image::GrayImage) -> i32 {
        let mut hist = [0u32; 256];
        for p in gray.pixels() {
            hist[p.0[0] as usize] += 1;
        }
        let total = gray.width() * gray.height();
        let over: u32 = hist[241..].iter().sum();
        let under: u32 = hist[..16].iter().sum();
        let penalty = (over as f32 / total as f32 + under as f32 / total as f32) * 100.0;
        (100.0 - penalty.min(100.0)) as i32
    }

    /// Reward important pixels near the rule-of-thirds lines.
    pub(super) fn calculate_composition_score(
        gray: &image::GrayImage,
        w: u32,
        h: u32,
    ) -> i32 {
        let tw = w / 3;
        let th = h / 3;
        let mut thirds_pixels = 0;
        let mut total_important = 0;
        for y in 0..h {
            for x in 0..w {
                let val = gray.get_pixel(x, y).0[0];
                if !(64..=192).contains(&val) {
                    total_important += 1;
                    let near_v = (x as i32 - tw as i32).abs() < 10
                        || (x as i32 - (tw * 2) as i32).abs() < 10;
                    let near_h = (y as i32 - th as i32).abs() < 10
                        || (y as i32 - (th * 2) as i32).abs() < 10;
                    if near_v || near_h {
                        thirds_pixels += 1;
                    }
                }
            }
        }
        if total_important > 0 {
            (thirds_pixels as f32 / total_important as f32 * 100.0) as i32
        } else {
            50
        }
    }

    /// Derive the thumbnail path for an original photo path.
    pub(super) fn thumbnail_path(path: &Path) -> PathBuf {
        let stem = path.file_stem().unwrap_or_default().to_string_lossy();
        let ext = path.extension().unwrap_or_default().to_string_lossy();
        path.with_file_name(format!("{}_thumb.{}", stem, ext))
    }

    /// Synchronous thumbnail generation (suitable for `spawn_blocking`).
    pub(super) fn generate_thumbnail_blocking(data: &[u8], path: &Path) -> PhotoResult<()> {
        let img =
            image::load_from_memory(data).map_err(|e| PhotoError::Processing(e.to_string()))?;
        let thumb = img.thumbnail(300, 300);
        let format = match path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .as_deref()
        {
            Some("png") => ImageFormat::Png,
            Some("webp") => ImageFormat::WebP,
            _ => ImageFormat::Jpeg,
        };
        let tmp = path.with_extension("tmp");
        thumb
            .save_with_format(&tmp, format)
            .map_err(|e| PhotoError::Processing(e.to_string()))?;
        std::fs::rename(&tmp, path).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            PhotoError::from(e)
        })?;
        Ok(())
    }
}
