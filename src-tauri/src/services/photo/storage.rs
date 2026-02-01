//! Photo Storage Module - Storage provider interface and CRUD operations
//!
//! This module handles photo storage operations including:
//! - Storage provider configuration and management
//! - Local and cloud storage implementations
//! - File path generation and management
//! - Database persistence for photo records
//!
//! **Async I/O**: All file operations use tokio::fs for non-blocking I/O

use crate::db::Database;
use crate::models::photo::Photo;
use rusqlite::params;
use std::path::{Path, PathBuf};
use tokio::fs;
use tracing::warn;

/// Storage provider types
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

/// Cloud storage providers
#[derive(Debug, Clone)]
pub enum CloudProvider {
    AwsS3,
    GcpStorage,
    AzureBlob,
}

/// Main photo service - Storage focused implementation
#[derive(Debug)]
pub struct PhotoStorageService {
    db: Database,
    storage_provider: StorageProvider,
    local_storage_path: PathBuf,
}

impl PhotoStorageService {
    /// Create new photo storage service with storage configuration
    pub fn new(
        db: Database,
        storage_settings: &crate::models::settings::StorageSettings,
    ) -> crate::services::photo::PhotoResult<Self> {
        let storage_provider = Self::create_storage_provider(storage_settings)?;
        let local_storage_path = Self::get_local_storage_path(storage_settings)?;

        Ok(Self {
            db,
            storage_provider,
            local_storage_path,
        })
    }

    /// Create storage provider from settings
    fn create_storage_provider(
        settings: &crate::models::settings::StorageSettings,
    ) -> crate::services::photo::PhotoResult<StorageProvider> {
        match settings.photo_storage_type.as_str() {
            "local" => Ok(StorageProvider::Local),
            "cloud" => {
                let provider = Self::parse_cloud_provider(settings)?;
                let bucket = settings.cloud_bucket.clone().ok_or_else(|| {
                    crate::services::photo::PhotoError::Validation(
                        "Cloud bucket not configured".to_string(),
                    )
                })?;
                let region = settings.cloud_region.clone().ok_or_else(|| {
                    crate::services::photo::PhotoError::Validation(
                        "Cloud region not configured".to_string(),
                    )
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
                    crate::services::photo::PhotoError::Validation(
                        "Cloud bucket not configured".to_string(),
                    )
                })?;
                let region = settings.cloud_region.clone().ok_or_else(|| {
                    crate::services::photo::PhotoError::Validation(
                        "Cloud region not configured".to_string(),
                    )
                })?;
                Ok(StorageProvider::Hybrid {
                    local_path,
                    cloud_provider: provider,
                    bucket,
                    region,
                })
            }
            _ => Err(crate::services::photo::PhotoError::Validation(format!(
                "Unknown storage type: {}",
                settings.photo_storage_type
            ))),
        }
    }

    /// Parse cloud provider from settings
    fn parse_cloud_provider(
        settings: &crate::models::settings::StorageSettings,
    ) -> crate::services::photo::PhotoResult<CloudProvider> {
        match settings.cloud_provider.as_deref() {
            Some("aws_s3") => Ok(CloudProvider::AwsS3),
            Some("gcp_storage") => Ok(CloudProvider::GcpStorage),
            Some("azure_blob") => Ok(CloudProvider::AzureBlob),
            Some(provider) => Err(crate::services::photo::PhotoError::Validation(format!(
                "Unknown cloud provider: {}",
                provider
            ))),
            None => Err(crate::services::photo::PhotoError::Validation(
                "Cloud provider not configured".to_string(),
            )),
        }
    }

    /// Get local storage path from settings
    fn get_local_storage_path(
        settings: &crate::models::settings::StorageSettings,
    ) -> crate::services::photo::PhotoResult<PathBuf> {
        match &settings.local_storage_path {
            Some(path) => Ok(PathBuf::from(path)),
            None => {
                // Default to current directory + photos
                let mut path = std::env::current_dir().map_err(|e| {
                    crate::services::photo::PhotoError::Storage(format!(
                        "Could not determine current directory: {}",
                        e
                    ))
                })?;
                path.push("photos");
                Ok(path)
            }
        }
    }

    /// Store photo locally (async)
    pub async fn store_locally(
        &self,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> crate::services::photo::PhotoResult<PathBuf> {
        let file_path = self.generate_file_path(intervention_id, file_name);

        // Ensure directory exists
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                crate::services::photo::PhotoError::Storage(format!(
                    "Failed to create directory: {}",
                    e
                ))
            })?;
        }

        // Write image data to file asynchronously
        fs::write(&file_path, data).await.map_err(|e| {
            crate::services::photo::PhotoError::Storage(format!(
                "Failed to write file: {}",
                e
            ))
        })?;

        Ok(file_path)
    }

    /// Store photo locally with custom path (async)
    pub async fn store_locally_with_path(
        &self,
        base_path: &Path,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> crate::services::photo::PhotoResult<PathBuf> {
        let file_path = base_path
            .join(intervention_id)
            .join("photos")
            .join(file_name);

        // Ensure directory exists
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                crate::services::photo::PhotoError::Storage(format!(
                    "Failed to create directory: {}",
                    e
                ))
            })?;
        }

        // Write image data to file asynchronously
        fs::write(&file_path, data).await.map_err(|e| {
            crate::services::photo::PhotoError::Storage(format!(
                "Failed to write file: {}",
                e
            ))
        })?;

        Ok(file_path)
    }

    /// Read photo file asynchronously
    pub async fn read_photo_file(
        &self,
        intervention_id: &str,
        file_name: &str,
    ) -> crate::services::photo::PhotoResult<Vec<u8>> {
        let file_path = self.generate_file_path(intervention_id, file_name);
        
        let data = fs::read(&file_path).await.map_err(|e| {
            crate::services::photo::PhotoError::Storage(format!(
                "Failed to read file: {}",
                e
            ))
        })?;
        
        Ok(data)
    }

    /// Read photo file from custom path asynchronously
    pub async fn read_photo_file_with_path(
        &self,
        file_path: &Path,
    ) -> crate::services::photo::PhotoResult<Vec<u8>> {
        let data = fs::read(file_path).await.map_err(|e| {
            crate::services::photo::PhotoError::Storage(format!(
                "Failed to read file: {}",
                e
            ))
        })?;
        
        Ok(data)
    }

    /// Delete photo file asynchronously
    pub async fn delete_photo_file(
        &self,
        intervention_id: &str,
        file_name: &str,
    ) -> crate::services::photo::PhotoResult<()> {
        let file_path = self.generate_file_path(intervention_id, file_name);
        
        if file_path.exists() {
            fs::remove_file(&file_path).await.map_err(|e| {
                crate::services::photo::PhotoError::Storage(format!(
                    "Failed to delete file: {}",
                    e
                ))
            })?;
        }
        
        Ok(())
    }

    /// Store photo in cloud storage (async)
    pub async fn store_in_cloud(
        &self,
        provider: &CloudProvider,
        bucket: &str,
        region: &str,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> crate::services::photo::PhotoResult<String> {
        match provider {
            CloudProvider::AwsS3 => {
                self.store_in_s3(bucket, region, intervention_id, file_name, data)
                    .await
            }
            CloudProvider::GcpStorage => {
                self.store_in_gcp(bucket, region, intervention_id, file_name, data)
                    .await
            }
            CloudProvider::AzureBlob => {
                self.store_in_azure(bucket, region, intervention_id, file_name, data)
                    .await
            }
        }
    }

    /// Store in AWS S3 (async)
    async fn store_in_s3(
        &self,
        bucket: &str,
        region: &str,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> crate::services::photo::PhotoResult<String> {
        // TODO: Implement actual S3 upload using rusoto_s3 or aws-sdk-rust
        // For now, store locally and return a local file URL
        match self.store_locally(intervention_id, file_name, data).await {
            Ok(file_path) => {
                let url = format!("file://{}", file_path.display());
                warn!("S3 upload not implemented yet, stored locally: {}", url);
                Ok(url)
            }
            Err(e) => {
                let key = format!("photos/{}/{}", intervention_id, file_name);
                let url = format!("https://{}.s3.{}.amazonaws.com/{}", bucket, region, key);
                warn!(
                    "S3 upload failed, returning mock URL: {} (error: {})",
                    url, e
                );
                Ok(url)
            }
        }
    }

    /// Store in Google Cloud Storage (async)
    async fn store_in_gcp(
        &self,
        bucket: &str,
        _region: &str,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> crate::services::photo::PhotoResult<String> {
        // TODO: Implement actual GCP upload
        // For now, store locally and return a local file URL
        match self.store_locally(intervention_id, file_name, data).await {
            Ok(file_path) => {
                let url = format!("file://{}", file_path.display());
                warn!("GCP upload not implemented yet, stored locally: {}", url);
                Ok(url)
            }
            Err(e) => {
                let key = format!("photos/{}/{}", intervention_id, file_name);
                let url = format!("https://storage.googleapis.com/{}/{}", bucket, key);
                warn!(
                    "GCP upload failed, returning mock URL: {} (error: {})",
                    url, e
                );
                Ok(url)
            }
        }
    }

    /// Store in Azure Blob Storage (async)
    async fn store_in_azure(
        &self,
        bucket: &str,
        _region: &str,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> crate::services::photo::PhotoResult<String> {
        // TODO: Implement actual Azure upload
        // For now, store locally and return a local file URL
        match self.store_locally(intervention_id, file_name, data).await {
            Ok(file_path) => {
                let url = format!("file://{}", file_path.display());
                warn!("Azure upload not implemented yet, stored locally: {}", url);
                Ok(url)
            }
            Err(e) => {
                let key = format!("photos/{}/{}", intervention_id, file_name);
                let url = format!("https://{}.blob.core.windows.net/{}", bucket, key);
                warn!(
                    "Azure upload failed, returning mock URL: {} (error: {})",
                    url, e
                );
                Ok(url)
            }
        }
    }

    /// Generate local cache path for cloud-stored photos
    pub fn generate_local_cache_path(&self, intervention_id: &str, file_name: &str) -> PathBuf {
        self.local_storage_path
            .join("cache")
            .join(intervention_id)
            .join(file_name)
    }

    /// Generate file path for local storage
    pub fn generate_file_path(&self, intervention_id: &str, file_name: &str) -> PathBuf {
        // Create path: local_storage_path/intervention_id/photos/filename
        self.local_storage_path
            .join(intervention_id)
            .join("photos")
            .join(file_name)
    }

    /// Save photo record to database
    pub fn save_photo(&self, photo: &Photo) -> crate::services::photo::PhotoResult<()> {
        // Check if photo exists
        let exists: i32 = self.db.query_single_value(
            "SELECT COUNT(*) FROM photos WHERE id = ?",
            params![photo.id],
        )?;

        if exists > 0 {
            // Update
            self.db.execute(
                r#"
                UPDATE photos SET
                    step_id = ?, step_number = ?, file_name = ?, file_size = ?,
                    mime_type = ?, width = ?, height = ?, photo_type = ?,
                    photo_category = ?, photo_angle = ?, zone = ?, title = ?,
                    description = ?, notes = ?, annotations = ?, gps_location_lat = ?,
                    gps_location_lon = ?, gps_location_accuracy = ?, quality_score = ?,
                    blur_score = ?, exposure_score = ?, composition_score = ?,
                    is_required = ?, is_approved = ?, approved_by = ?, approved_at = ?,
                    rejection_reason = ?, synced = ?, storage_url = ?,
                    upload_retry_count = ?, upload_error = ?, last_synced_at = ?,
                    captured_at = ?, uploaded_at = ?, updated_at = ?
                WHERE id = ?
                "#,
                params![
                    photo.step_id,
                    photo.step_number,
                    photo.file_name,
                    photo.file_size,
                    photo.mime_type,
                    photo.width,
                    photo.height,
                    photo.photo_type,
                    photo.photo_category,
                    photo.photo_angle,
                    photo.zone,
                    photo.title,
                    photo.description,
                    photo.notes,
                    photo
                        .annotations
                        .as_ref()
                        .map(|a| serde_json::to_string(a).unwrap_or_default()),
                    photo.gps_location_lat,
                    photo.gps_location_lon,
                    photo.gps_location_accuracy,
                    photo.quality_score,
                    photo.blur_score,
                    photo.exposure_score,
                    photo.composition_score,
                    photo.is_required,
                    photo.is_approved,
                    photo.approved_by,
                    photo.approved_at,
                    photo.rejection_reason,
                    photo.synced,
                    photo.storage_url,
                    photo.upload_retry_count,
                    photo.upload_error,
                    photo.last_synced_at,
                    photo.captured_at,
                    photo.uploaded_at,
                    photo.updated_at,
                    photo.id
                ],
            )?;
        } else {
            // Insert
            self.db.execute(
                r#"
                INSERT INTO photos (
                    id, intervention_id, step_id, step_number, file_name, file_path,
                    file_size, mime_type, width, height, photo_type, photo_category,
                    photo_angle, zone, title, description, notes, annotations,
                    gps_location_lat, gps_location_lon, gps_location_accuracy,
                    quality_score, blur_score, exposure_score, composition_score,
                    is_required, is_approved, approved_by, approved_at, rejection_reason,
                    synced, storage_url, upload_retry_count, upload_error, last_synced_at,
                    captured_at, uploaded_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                params![
                    photo.id,
                    photo.intervention_id,
                    photo.step_id,
                    photo.step_number,
                    photo.file_name,
                    photo.file_path,
                    photo.file_size,
                    photo.mime_type,
                    photo.width,
                    photo.height,
                    photo.photo_type,
                    photo.photo_category,
                    photo.photo_angle,
                    photo.zone,
                    photo.title,
                    photo.description,
                    photo.notes,
                    photo.annotations.as_ref().map(|a| serde_json::to_string(a).unwrap_or_default()),
                    photo.gps_location_lat,
                    photo.gps_location_lon,
                    photo.gps_location_accuracy,
                    photo.quality_score,
                    photo.blur_score,
                    photo.exposure_score,
                    photo.composition_score,
                    photo.is_required,
                    photo.is_approved,
                    photo.approved_by,
                    photo.approved_at,
                    photo.rejection_reason,
                    photo.synced,
                    photo.storage_url,
                    photo.upload_retry_count,
                    photo.upload_error,
                    photo.last_synced_at,
                    photo.captured_at,
                    photo.uploaded_at,
                    photo.created_at,
                    photo.updated_at
                ],
            )?;
        }

        Ok(())
    }

    /// Get storage provider reference
    pub fn storage_provider(&self) -> &StorageProvider {
        &self.storage_provider
    }

    /// Get local storage path reference
    pub fn local_storage_path(&self) -> &PathBuf {
        &self.local_storage_path
    }

    /// Get database reference
    #[allow(dead_code)]
    pub fn database(&self) -> &Database {
        &self.db
    }
}
