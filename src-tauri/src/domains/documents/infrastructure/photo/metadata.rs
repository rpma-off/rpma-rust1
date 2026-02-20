//! Photo Metadata Module - CRUD operations for photo metadata
//!
//! This module handles photo metadata operations including:
//! - Photo retrieval and listing with filtering
//! - Photo deletion with file cleanup
//! - Metadata updates and approval workflow

use crate::db::Database;
use crate::models::photo::Photo;
use rusqlite::params;
use std::fs;
use std::path::Path;

/// Photo metadata update request
#[derive(Debug, serde::Deserialize)]
pub struct PhotoMetadataUpdate {
    pub title: Option<Option<String>>,
    pub description: Option<Option<String>>,
    pub notes: Option<Option<String>>,
    pub is_approved: Option<bool>,
    pub approved_by: Option<Option<String>>,
    pub rejection_reason: Option<Option<String>>,
}

/// Photo metadata service
#[derive(Debug)]
pub struct PhotoMetadataService {
    db: Database,
}

impl PhotoMetadataService {
    /// Create new photo metadata service
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get photos with filtering and pagination
    pub fn get_photos(
        &self,
        request: super::GetPhotosRequest,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<super::GetPhotosResponse>
    {
        let mut conditions = Vec::new();
        let mut params_vec = Vec::new();

        // Build WHERE clause
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

        // Get photos
        let sql = format!(
            "SELECT * FROM photos {} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            where_clause
        );
        params_vec.push(limit.to_string());
        params_vec.push(offset.to_string());

        // Convert params to rusqlite format
        let params: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        let photos = self.db.query_as::<Photo>(&sql, &params[..])?;

        // Get total count
        let count_sql = format!("SELECT COUNT(*) FROM photos {}", where_clause);
        let count_params: Vec<&dyn rusqlite::ToSql> = params_vec[..params_vec.len() - 2]
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();
        let total: i32 = self.db.query_single_value(&count_sql, &count_params[..])?;

        Ok(super::GetPhotosResponse { photos, total })
    }

    /// Get photo by ID
    pub fn get_photo(
        &self,
        id: &str,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<Option<Photo>> {
        Ok(self
            .db
            .query_single_as::<Photo>("SELECT * FROM photos WHERE id = ?", params![id])?)
    }

    /// Delete photo
    pub fn delete_photo(
        &self,
        id: &str,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<()> {
        // Get photo record first
        let photo = self.get_photo(id)?.ok_or_else(|| {
            crate::domains::documents::infrastructure::photo::PhotoError::NotFound(format!(
                "Photo {} not found",
                id
            ))
        })?;

        // Delete file
        if Path::new(&photo.file_path).exists() {
            fs::remove_file(&photo.file_path)?;
        }

        // Delete from database
        self.db
            .execute("DELETE FROM photos WHERE id = ?", params![id])?;

        Ok(())
    }

    /// Update photo metadata
    pub fn update_photo_metadata(
        &self,
        id: &str,
        updates: PhotoMetadataUpdate,
    ) -> crate::domains::documents::infrastructure::photo::PhotoResult<Photo> {
        // Get current photo
        let mut photo = self.get_photo(id)?.ok_or_else(|| {
            crate::domains::documents::infrastructure::photo::PhotoError::NotFound(format!(
                "Photo {} not found",
                id
            ))
        })?;

        // Apply updates
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

        photo.updated_at = crate::shared::contracts::common::now();

        // Save updates
        self.save_photo(&photo)?;

        Ok(photo)
    }

    /// Save photo record to database
    fn save_photo(
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
}
