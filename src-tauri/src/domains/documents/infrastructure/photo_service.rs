use rusqlite::params;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tokio::sync::Semaphore;
use tracing::warn;

use crate::db::Database;
use crate::domains::documents::models::Photo;
use crate::domains::documents::{
    CloudProvider, GetPhotosRequest, GetPhotosResponse, PhotoError, PhotoMetadataUpdate,
    PhotoResult, PhotoStats, PhotoStorageSettings, StorageProvider, StorePhotoRequest,
    StorePhotoResponse,
};
use crate::shared::contracts::common::now;

use super::photo_processing;

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
            max_file_size: 20 * 1024 * 1024,
        })
    }

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

        let (width, height) = photo_processing::extract_image_dimensions(&compressed_data)?;
        let (quality_score, blur_score, exposure_score, composition_score) =
            photo_processing::calculate_photo_quality_scores(&compressed_data)?;

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
            CloudProvider::AwsS3 | CloudProvider::GcpStorage | CloudProvider::AzureBlob => {
                let file_path = self.store_locally(intervention_id, file_name, data).await?;
                let url = format!("file://{}", file_path.display());
                warn!("Cloud upload not implemented, stored locally: {}", url);
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

    pub fn get_photo(&self, id: &str) -> PhotoResult<Option<Photo>> {
        Ok(self
            .db
            .query_single_as::<Photo>("SELECT * FROM photos WHERE id = ?", params![id])?)
    }

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
        tokio::task::spawn_blocking(move || {
            photo_processing::compress_image_blocking(&data, quality, max_size)
        })
        .await
        .map_err(|e| PhotoError::Processing(e.to_string()))?
    }

    pub async fn generate_thumbnail(&self, data: &[u8], path: &Path) -> PhotoResult<PathBuf> {
        let data = data.to_vec();
        let thumb_path = photo_processing::thumbnail_path(path);
        let target = thumb_path.clone();
        tokio::task::spawn_blocking(move || {
            photo_processing::generate_thumbnail_blocking(&data, &target)
        })
        .await
        .map_err(|e| PhotoError::Processing(e.to_string()))??;
        Ok(thumb_path)
    }

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
        let photos_by_intervention: HashMap<String, i32> = intervention_stats.into_iter().collect();
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
