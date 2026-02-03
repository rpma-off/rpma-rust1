//! Photo repository implementation
//!
//! Provides consistent database access patterns for Photo entities.

use crate::db::Database;
use crate::models::photo::{Photo, PhotoCategory, PhotoType};
use crate::repositories::base::{Repository, RepoError, RepoResult};
use crate::repositories::cache::{Cache, CacheKeyBuilder, ttl};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Query for filtering photos
#[derive(Debug, Clone, Default)]
pub struct PhotoQuery {
    pub search: Option<String>,
    pub intervention_id: Option<String>,
    pub step_id: Option<String>,
    pub photo_type: Option<PhotoType>,
    pub photo_category: Option<PhotoCategory>,
    pub is_approved: Option<bool>,
    pub synced: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl PhotoQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(search) = &self.search {
            conditions.push("(title LIKE ? OR description LIKE ? OR file_name LIKE ?)".to_string());
            let pattern = format!("%{}%", search);
            params.push(pattern.clone().into());
            params.push(pattern.clone().into());
            params.push(pattern.into());
        }

        if let Some(intervention_id) = &self.intervention_id {
            conditions.push("intervention_id = ?".to_string());
            params.push(intervention_id.clone().into());
        }

        if let Some(step_id) = &self.step_id {
            conditions.push("step_id = ?".to_string());
            params.push(step_id.clone().into());
        }

        if let Some(photo_type) = &self.photo_type {
            conditions.push("photo_type = ?".to_string());
            params.push(photo_type.to_string().into());
        }

        if let Some(photo_category) = &self.photo_category {
            conditions.push("photo_category = ?".to_string());
            params.push(photo_category.to_string().into());
        }

        if let Some(is_approved) = self.is_approved {
            conditions.push("is_approved = ?".to_string());
            params.push((if is_approved { 1 } else { 0 }).into());
        }

        if let Some(synced) = self.synced {
            conditions.push("synced = ?".to_string());
            params.push((if synced { 1 } else { 0 }).into());
        }

        let where_clause = if conditions.len() > 1 {
            format!("WHERE {}", conditions.join(" AND "))
        } else {
            String::new()
        };

        (where_clause, params)
    }

    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
        let allowed_columns = [
            "created_at", "updated_at", "captured_at", "title", "description",
            "file_name", "file_size", "photo_type", "photo_category", "is_approved"
        ];
        allowed_columns.iter()
            .find(|&&col| col == sort_by)
            .map(|s| s.to_string())
            .ok_or_else(|| RepoError::Validation(format!("Invalid sort column: {}", sort_by)))
    }

    fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = Self::validate_sort_column(
            self.sort_by.as_deref().unwrap_or("captured_at")
        )?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            Some("DESC") => "DESC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}

/// Photo repository for database operations
pub struct PhotoRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl PhotoRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("photo"),
        }
    }

    /// Find photos by intervention ID
    pub async fn find_by_intervention(&self, intervention_id: String) -> RepoResult<Vec<Photo>> {
        let cache_key = self.cache_key_builder.list(&["intervention", &intervention_id]);

        if let Some(photos) = self.cache.get::<Vec<Photo>>(&cache_key) {
            return Ok(photos);
        }

        let photos = self
            .db
            .query_as::<Photo>(
                "SELECT * FROM photos WHERE intervention_id = ? ORDER BY captured_at DESC",
                params![intervention_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find photos by intervention: {}", e)))?;

        self.cache.set(&cache_key, photos.clone(), ttl::SHORT);

        Ok(photos)
    }

    /// Find photos by step ID
    pub async fn find_by_step(&self, step_id: String) -> RepoResult<Vec<Photo>> {
        let cache_key = self.cache_key_builder.list(&["step", &step_id]);

        if let Some(photos) = self.cache.get::<Vec<Photo>>(&cache_key) {
            return Ok(photos);
        }

        let photos = self
            .db
            .query_as::<Photo>(
                "SELECT * FROM photos WHERE step_id = ? ORDER BY captured_at DESC",
                params![step_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find photos by step: {}", e)))?;

        self.cache.set(&cache_key, photos.clone(), ttl::SHORT);

        Ok(photos)
    }

    /// Find photos by category
    pub async fn find_by_category(&self, category: PhotoCategory) -> RepoResult<Vec<Photo>> {
        let cache_key = self.cache_key_builder.list(&["category", &category.to_string()]);

        if let Some(photos) = self.cache.get::<Vec<Photo>>(&cache_key) {
            return Ok(photos);
        }

        let photos = self
            .db
            .query_as::<Photo>(
                "SELECT * FROM photos WHERE photo_category = ? ORDER BY captured_at DESC",
                params![category.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find photos by category: {}", e)))?;

        self.cache.set(&cache_key, photos.clone(), ttl::MEDIUM);

        Ok(photos)
    }

    /// Find photos by type
    pub async fn find_by_type(&self, photo_type: PhotoType) -> RepoResult<Vec<Photo>> {
        let cache_key = self.cache_key_builder.list(&["type", &photo_type.to_string()]);

        if let Some(photos) = self.cache.get::<Vec<Photo>>(&cache_key) {
            return Ok(photos);
        }

        let photos = self
            .db
            .query_as::<Photo>(
                "SELECT * FROM photos WHERE photo_type = ? ORDER BY captured_at DESC",
                params![photo_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find photos by type: {}", e)))?;

        self.cache.set(&cache_key, photos.clone(), ttl::MEDIUM);

        Ok(photos)
    }

    /// Find unsynced photos
    pub async fn find_unsynced(&self) -> RepoResult<Vec<Photo>> {
        let cache_key = self.cache_key_builder.list(&["unsynced"]);

        if let Some(photos) = self.cache.get::<Vec<Photo>>(&cache_key) {
            return Ok(photos);
        }

        let photos = self
            .db
            .query_as::<Photo>(
                "SELECT * FROM photos WHERE synced = 0 ORDER BY captured_at ASC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find unsynced photos: {}", e)))?;

        self.cache.set(&cache_key, photos.clone(), ttl::SHORT);

        Ok(photos)
    }

    /// Find photos pending approval
    pub async fn find_pending_approval(&self) -> RepoResult<Vec<Photo>> {
        let cache_key = self.cache_key_builder.list(&["pending_approval"]);

        if let Some(photos) = self.cache.get::<Vec<Photo>>(&cache_key) {
            return Ok(photos);
        }

        let photos = self
            .db
            .query_as::<Photo>(
                "SELECT * FROM photos WHERE is_approved = 0 AND is_required = 1 ORDER BY captured_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find pending approval photos: {}", e)))?;

        self.cache.set(&cache_key, photos.clone(), ttl::SHORT);

        Ok(photos)
    }

    /// Update photo approval status
    pub async fn update_approval(
        &self,
        photo_id: String,
        is_approved: bool,
        approved_by: Option<String>,
    ) -> RepoResult<Photo> {
        let now = chrono::Utc::now().timestamp();

        self.db
            .execute(
                "UPDATE photos SET is_approved = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?",
                params![
                    if is_approved { 1 } else { 0 },
                    approved_by,
                    if is_approved { Some(now) } else { None },
                    now,
                    photo_id
                ],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update photo approval: {}", e)))?;

        self.invalidate_photo_cache(&photo_id);
        self.invalidate_all_cache();

        self.find_by_id(photo_id).await?
            .ok_or_else(|| RepoError::NotFound("Photo not found after update".to_string()))
    }

    /// Search photos with query
    pub async fn search(&self, query: PhotoQuery) -> RepoResult<Vec<Photo>> {
        let (where_clause, where_params) = query.build_where_clause();
        let order_by = query.build_order_by_clause().unwrap_or_else(|e| {
            eprintln!("Invalid order clause, using default: {}", e);
            "ORDER BY captured_at DESC".to_string()
        });
        let limit_offset = query.build_limit_offset();

        let sql = format!(
            "SELECT * FROM photos {} {} {}",
            where_clause,
            order_by,
            if let Some((limit, offset)) = limit_offset {
                match offset {
                    Some(offset) => format!("LIMIT {} OFFSET {}", limit, offset),
                    None => format!("LIMIT {}", limit),
                }
            } else {
                "LIMIT 1000".to_string()
            }
        );

        let params = rusqlite::params_from_iter(where_params);

        let photos = self
            .db
            .query_as::<Photo>(&sql, params)
            .map_err(|e| RepoError::Database(format!("Failed to search photos: {}", e)))?;

        Ok(photos)
    }

    /// Count photos matching query
    pub async fn count(&self, query: PhotoQuery) -> RepoResult<i64> {
        let (where_clause, where_params) = query.build_where_clause();

        let sql = format!("SELECT COUNT(*) as count FROM photos {}", where_clause);
        let params = rusqlite::params_from_iter(where_params);

        let count = self
            .db
            .query_single_value::<i64>(&sql, params)
            .map_err(|e| RepoError::Database(format!("Failed to count photos: {}", e)))?;

        Ok(count)
    }

    fn invalidate_photo_cache(&self, id: &str) {
        self.cache.remove(&self.cache_key_builder.id(id));
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<Photo, String> for PhotoRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Photo>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(photo) = self.cache.get::<Photo>(&cache_key) {
            return Ok(Some(photo));
        }

        let photo = self
            .db
            .query_single_as::<Photo>("SELECT * FROM photos WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to find photo by id: {}", e)))?;

        if let Some(ref photo) = photo {
            self.cache.set(&cache_key, photo.clone(), ttl::LONG);
        }

        Ok(photo)
    }

    async fn find_all(&self) -> RepoResult<Vec<Photo>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(photos) = self.cache.get::<Vec<Photo>>(&cache_key) {
            return Ok(photos);
        }

        let photos = self
            .db
            .query_as::<Photo>(
                "SELECT * FROM photos ORDER BY captured_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all photos: {}", e)))?;

        self.cache.set(&cache_key, photos.clone(), ttl::MEDIUM);

        Ok(photos)
    }

    async fn save(&self, entity: Photo) -> RepoResult<Photo> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        if exists {
            let now = chrono::Utc::now().timestamp();

            self.db
                .execute(
                    "UPDATE photos SET
                        intervention_id = ?,
                        step_id = ?,
                        step_number = ?,
                        file_path = ?,
                        file_name = ?,
                        file_size = ?,
                        mime_type = ?,
                        width = ?,
                        height = ?,
                        photo_type = ?,
                        photo_category = ?,
                        photo_angle = ?,
                        zone = ?,
                        title = ?,
                        description = ?,
                        notes = ?,
                        annotations = ?,
                        gps_location_lat = ?,
                        gps_location_lon = ?,
                        gps_location_accuracy = ?,
                        quality_score = ?,
                        blur_score = ?,
                        exposure_score = ?,
                        composition_score = ?,
                        is_required = ?,
                        is_approved = ?,
                        approved_by = ?,
                        approved_at = ?,
                        rejection_reason = ?,
                        synced = ?,
                        storage_url = ?,
                        upload_retry_count = ?,
                        upload_error = ?,
                        last_synced_at = ?,
                        captured_at = ?,
                        uploaded_at = ?,
                        updated_at = ?
                        WHERE id = ?",
                    params![
                        entity.intervention_id,
                        entity.step_id,
                        entity.step_number,
                        entity.file_path,
                        entity.file_name,
                        entity.file_size,
                        entity.mime_type,
                        entity.width,
                        entity.height,
                        entity.photo_type.map(|t| t.to_string()),
                        entity.photo_category.map(|c| c.to_string()),
                        entity.photo_angle,
                        entity.zone,
                        entity.title,
                        entity.description,
                        entity.notes,
                        entity.annotations.and_then(|v| serde_json::to_string(&v).ok()),
                        entity.gps_location_lat,
                        entity.gps_location_lon,
                        entity.gps_location_accuracy,
                        entity.quality_score,
                        entity.blur_score,
                        entity.exposure_score,
                        entity.composition_score,
                        if entity.is_required { 1 } else { 0 },
                        if entity.is_approved { 1 } else { 0 },
                        entity.approved_by,
                        entity.approved_at,
                        entity.rejection_reason,
                        if entity.synced { 1 } else { 0 },
                        entity.storage_url,
                        entity.upload_retry_count,
                        entity.upload_error,
                        entity.last_synced_at,
                        entity.captured_at,
                        entity.uploaded_at,
                        now,
                        entity.id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to update photo: {}", e)))?;
        } else {
            self.db
                .execute(
                    "INSERT INTO photos (
                        id, intervention_id, step_id, step_number,
                        file_path, file_name, file_size, mime_type, width, height,
                        photo_type, photo_category, photo_angle, zone,
                        title, description, notes, annotations,
                        gps_location_lat, gps_location_lon, gps_location_accuracy,
                        quality_score, blur_score, exposure_score, composition_score,
                        is_required, is_approved, approved_by, approved_at, rejection_reason,
                        synced, storage_url, upload_retry_count, upload_error,
                        last_synced_at, captured_at, uploaded_at,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        entity.id,
                        entity.intervention_id,
                        entity.step_id,
                        entity.step_number,
                        entity.file_path,
                        entity.file_name,
                        entity.file_size,
                        entity.mime_type,
                        entity.width,
                        entity.height,
                        entity.photo_type.map(|t| t.to_string()),
                        entity.photo_category.map(|c| c.to_string()),
                        entity.photo_angle,
                        entity.zone,
                        entity.title,
                        entity.description,
                        entity.notes,
                        entity.annotations.and_then(|v| serde_json::to_string(&v).ok()),
                        entity.gps_location_lat,
                        entity.gps_location_lon,
                        entity.gps_location_accuracy,
                        entity.quality_score,
                        entity.blur_score,
                        entity.exposure_score,
                        entity.composition_score,
                        if entity.is_required { 1 } else { 0 },
                        if entity.is_approved { 1 } else { 0 },
                        entity.approved_by,
                        entity.approved_at,
                        entity.rejection_reason,
                        if entity.synced { 1 } else { 0 },
                        entity.storage_url,
                        entity.upload_retry_count,
                        entity.upload_error,
                        entity.last_synced_at,
                        entity.captured_at,
                        entity.uploaded_at,
                        entity.created_at,
                        entity.updated_at,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create photo: {}", e)))?;
        }

        self.invalidate_photo_cache(&entity.id);
        self.invalidate_all_cache();

        self.find_by_id(entity.id).await?
            .ok_or_else(|| RepoError::NotFound("Photo not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self
            .db
            .execute("DELETE FROM photos WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete photo: {}", e)))?;

        self.invalidate_photo_cache(&id);
        self.invalidate_all_cache();

        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let exists = self
            .db
            .query_single_value::<i64>("SELECT COUNT(*) FROM photos WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to check photo existence: {}", e)))?;

        Ok(exists > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    async fn setup_test_db() -> Database {
        Database::new_in_memory().await.unwrap()
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = PhotoRepository::new(Arc::new(db), Arc::clone(&cache));

        let intervention_id = uuid::Uuid::new_v4().to_string();
        let photo = Photo::new(intervention_id.clone(), "/test/path.jpg".to_string());

        repo.save(photo.clone()).await.unwrap();

        let found = repo.find_by_id(photo.id.clone()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, photo.id);
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = PhotoRepository::new(Arc::new(db), Arc::clone(&cache));

        let found = repo.find_by_id("nonexistent".to_string()).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_find_all() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = PhotoRepository::new(Arc::new(db), Arc::clone(&cache));

        let intervention_id = uuid::Uuid::new_v4().to_string();
        let photo1 = Photo::new(intervention_id.clone(), "/test/path1.jpg".to_string());
        let photo2 = Photo::new(intervention_id.clone(), "/test/path2.jpg".to_string());

        repo.save(photo1).await.unwrap();
        repo.save(photo2).await.unwrap();

        let all = repo.find_all().await.unwrap();
        assert_eq!(all.len(), 2);
    }

    #[tokio::test]
    async fn test_save_create() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = PhotoRepository::new(Arc::new(db), Arc::clone(&cache));

        let intervention_id = uuid::Uuid::new_v4().to_string();
        let photo = Photo::new(intervention_id, "/test/path.jpg".to_string());

        let saved = repo.save(photo.clone()).await.unwrap();
        assert_eq!(saved.id, photo.id);
        assert!(repo.exists_by_id(saved.id).await.unwrap());
    }

    #[tokio::test]
    async fn test_save_update() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = PhotoRepository::new(Arc::new(db), Arc::clone(&cache));

        let intervention_id = uuid::Uuid::new_v4().to_string();
        let mut photo = Photo::new(intervention_id, "/test/path.jpg".to_string());
        repo.save(photo.clone()).await.unwrap();

        photo.title = Some("Updated title".to_string());
        let updated = repo.save(photo).await.unwrap();
        assert_eq!(updated.title, Some("Updated title".to_string()));
    }

    #[tokio::test]
    async fn test_delete_by_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = PhotoRepository::new(Arc::new(db), Arc::clone(&cache));

        let intervention_id = uuid::Uuid::new_v4().to_string();
        let photo = Photo::new(intervention_id, "/test/path.jpg".to_string());
        repo.save(photo.clone()).await.unwrap();

        let deleted = repo.delete_by_id(photo.id.clone()).await.unwrap();
        assert!(deleted);
        assert!(!repo.exists_by_id(photo.id).await.unwrap());
    }

    #[tokio::test]
    async fn test_find_by_intervention() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = PhotoRepository::new(Arc::new(db), Arc::clone(&cache));

        let intervention_id = uuid::Uuid::new_v4().to_string();
        let photo1 = Photo::new(intervention_id.clone(), "/test/path1.jpg".to_string());
        let photo2 = Photo::new(intervention_id.clone(), "/test/path2.jpg".to_string());

        repo.save(photo1).await.unwrap();
        repo.save(photo2).await.unwrap();

        let photos = repo.find_by_intervention(intervention_id).await.unwrap();
        assert_eq!(photos.len(), 2);
    }

    #[tokio::test]
    async fn test_find_by_category() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = PhotoRepository::new(Arc::new(db), Arc::clone(&cache));

        let intervention_id = uuid::Uuid::new_v4().to_string();
        let mut photo1 = Photo::new(intervention_id.clone(), "/test/path1.jpg".to_string());
        photo1.photo_category = Some(PhotoCategory::VehicleCondition);
        let mut photo2 = Photo::new(intervention_id.clone(), "/test/path2.jpg".to_string());
        photo2.photo_category = Some(PhotoCategory::Workspace);

        repo.save(photo1).await.unwrap();
        repo.save(photo2).await.unwrap();

        let vehicle_photos = repo.find_by_category(PhotoCategory::VehicleCondition).await.unwrap();
        assert_eq!(vehicle_photos.len(), 1);
    }
}

