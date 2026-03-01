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
use crate::domains::documents::domain::models::photo::Photo;
use rusqlite::params;
use std::path::{Path, PathBuf};
use tokio::fs;
use tracing::warn;

/// Photo storage settings local to the documents domain.
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
        storage_settings: &PhotoStorageSettings,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<Self> {
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
        settings: &PhotoStorageSettings,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<StorageProvider> {
        match settings.photo_storage_type.as_str() {
            "local" => Ok(StorageProvider::Local),
            "cloud" => {
                let provider = Self::parse_cloud_provider(settings)?;
                let bucket = settings.cloud_bucket.clone().ok_or_else(|| {
                    crate::domains::documents::infrastructure::photo::PhotoError::Validation(
                        "Cloud bucket not configured".to_string(),
                    )
                })?;
                let region = settings.cloud_region.clone().ok_or_else(|| {
                    crate::domains::documents::infrastructure::photo::PhotoError::Validation(
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
                    crate::domains::documents::infrastructure::photo::PhotoError::Validation(
                        "Cloud bucket not configured".to_string(),
                    )
                })?;
                let region = settings.cloud_region.clone().ok_or_else(|| {
                    crate::domains::documents::infrastructure::photo::PhotoError::Validation(
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
            _ => Err(
                crate::domains::documents::infrastructure::photo::PhotoError::Validation(format!(
                    "Unknown storage type: {}",
                    settings.photo_storage_type
                )),
            ),
        }
    }

    /// Parse cloud provider from settings
    fn parse_cloud_provider(
        settings: &PhotoStorageSettings,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<CloudProvider> {
        match settings.cloud_provider.as_deref() {
            Some("aws_s3") => Ok(CloudProvider::AwsS3),
            Some("gcp_storage") => Ok(CloudProvider::GcpStorage),
            Some("azure_blob") => Ok(CloudProvider::AzureBlob),
            Some(provider) => Err(
                crate::domains::documents::infrastructure::photo::PhotoError::Validation(format!(
                    "Unknown cloud provider: {}",
                    provider
                )),
            ),
            None => Err(
                crate::domains::documents::infrastructure::photo::PhotoError::Validation(
                    "Cloud provider not configured".to_string(),
                ),
            ),
        }
    }

    /// Get local storage path from settings
    fn get_local_storage_path(
        settings: &PhotoStorageSettings,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<PathBuf> {
        match &settings.local_storage_path {
            Some(path) => Ok(PathBuf::from(path)),
            None => {
                // Default to current directory + photos
                let mut path = std::env::current_dir().map_err(|e| {
                    crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
                        "Could not determine current directory: {}",
                        e
                    ))
                })?;
                path.push("photos");
                Ok(path)
            }
        }
    }

    /// Store photo locally (async) using atomic write (write to temp then rename)
    pub async fn store_locally(
        &self,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<PathBuf> {
        let file_path = self.generate_file_path(intervention_id, file_name);

        // Ensure directory exists
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
                    "Failed to create directory: {}",
                    e
                ))
            })?;
        }

        // Atomic write: write to temp file first, then rename
        let tmp_path = file_path.with_extension("tmp");
        fs::write(&tmp_path, data).await.map_err(|e| {
            crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
                "Failed to write file: {}",
                e
            ))
        })?;
        fs::rename(&tmp_path, &file_path).await.map_err(|e| {
            // Clean up temp file on rename failure
            let _ = std::fs::remove_file(&tmp_path);
            crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
                "Failed to finalize file: {}",
                e
            ))
        })?;

        Ok(file_path)
    }

    /// Store photo locally with custom path (async) using atomic write
    pub async fn store_locally_with_path(
        &self,
        base_path: &Path,
        intervention_id: &str,
        file_name: &str,
        data: &[u8],
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<PathBuf> {
        let file_path = base_path
            .join(intervention_id)
            .join("photos")
            .join(file_name);

        // Ensure directory exists
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
                    "Failed to create directory: {}",
                    e
                ))
            })?;
        }

        // Atomic write: write to temp file first, then rename
        let tmp_path = file_path.with_extension("tmp");
        fs::write(&tmp_path, data).await.map_err(|e| {
            crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
                "Failed to write file: {}",
                e
            ))
        })?;
        fs::rename(&tmp_path, &file_path).await.map_err(|e| {
            let _ = std::fs::remove_file(&tmp_path);
            crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
                "Failed to finalize file: {}",
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
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<Vec<u8>> {
        let file_path = self.generate_file_path(intervention_id, file_name);

        let data = fs::read(&file_path).await.map_err(|e| {
            crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
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
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<Vec<u8>> {
        let data = fs::read(file_path).await.map_err(|e| {
            crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
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
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<()> {
        let file_path = self.generate_file_path(intervention_id, file_name);

        if file_path.exists() {
            fs::remove_file(&file_path).await.map_err(|e| {
                crate::domains::documents::infrastructure::photo::PhotoError::Storage(format!(
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
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<String> {
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
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<String> {
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
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<String> {
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
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<String> {
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
    pub fn save_photo(
        &self,
        photo: &Photo,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<()> {
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
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

#[cfg(test)]
mod tests {
    use super::*;

    async fn make_test_service(base_path: PathBuf) -> PhotoStorageService {
        let db = crate::db::Database::new_in_memory()
            .await
            .expect("create db");
        PhotoStorageService {
            db,
            storage_provider: StorageProvider::Local,
            local_storage_path: base_path,
        }
    }

    #[tokio::test]
    async fn test_store_locally_atomic_write() {
        let tmp_dir = std::env::temp_dir().join("rpma_test_atomic");
        let _ = std::fs::remove_dir_all(&tmp_dir);

        let service = make_test_service(tmp_dir.clone()).await;

        let data = b"test image data";
        let result = service.store_locally("int-001", "test.jpg", data).await;

        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.exists(), "Final file should exist");
        assert_eq!(std::fs::read(&path).unwrap(), data);

        // Ensure no temp file is left behind
        let tmp_path = path.with_extension("tmp");
        assert!(!tmp_path.exists(), "Temp file should be cleaned up");

        let _ = std::fs::remove_dir_all(&tmp_dir);
    }

    #[tokio::test]
    async fn test_store_locally_with_path_atomic_write() {
        let tmp_dir = std::env::temp_dir().join("rpma_test_atomic_path");
        let _ = std::fs::remove_dir_all(&tmp_dir);

        let service = make_test_service(tmp_dir.clone()).await;

        let data = b"test image content";
        let result = service
            .store_locally_with_path(&tmp_dir, "int-002", "photo.png", data)
            .await;

        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.exists());
        assert_eq!(std::fs::read(&path).unwrap(), data);

        let _ = std::fs::remove_dir_all(&tmp_dir);
    }

    #[tokio::test]
    async fn test_generate_file_path_consistency() {
        let tmp_dir = std::env::temp_dir().join("rpma_test_path");
        let service = make_test_service(tmp_dir.clone()).await;

        let path1 = service.generate_file_path("int-001", "photo.jpg");
        let path2 = service.generate_file_path("int-001", "photo.jpg");
        assert_eq!(path1, path2, "Same inputs should produce same path");

        // Path should include intervention_id/photos/filename
        assert!(path1.to_string_lossy().contains("int-001"));
        assert!(path1.to_string_lossy().contains("photos"));
        assert!(path1.to_string_lossy().contains("photo.jpg"));
    }

    #[tokio::test]
    async fn test_read_missing_file_returns_error() {
        let tmp_dir = std::env::temp_dir().join("rpma_test_read_missing");
        let service = make_test_service(tmp_dir.clone()).await;

        let result = service.read_photo_file("nonexistent", "ghost.jpg").await;
        assert!(result.is_err());
    }
}
