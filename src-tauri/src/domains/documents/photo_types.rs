use std::collections::HashMap;
use std::path::PathBuf;

use crate::commands::AppError;

use super::models::Photo;

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

#[derive(Debug, serde::Serialize)]
pub struct StorePhotoResponse {
    pub photo: Photo,
    pub file_path: String,
}

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

#[derive(Debug, serde::Serialize)]
pub struct GetPhotosResponse {
    pub photos: Vec<Photo>,
    pub total: i32,
}

#[derive(Debug, serde::Serialize)]
pub struct PhotoStats {
    pub total_photos: i32,
    pub total_size_bytes: i64,
    pub photos_by_intervention: HashMap<String, i32>,
    pub storage_path: String,
}

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
