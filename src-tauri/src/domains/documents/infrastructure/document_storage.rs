//! Document Storage Service
//!
//! This module provides basic document storage and management capabilities.

use crate::commands::AppResult;
use chrono::{DateTime, Duration, Utc};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::info;

/// Basic document storage service
pub struct DocumentStorageService;

impl DocumentStorageService {
    /// Get the base storage directory
    pub fn get_storage_dir(base_dir: &Path) -> PathBuf {
        base_dir.join("exports")
    }

    /// Ensure storage directory exists
    pub fn ensure_storage_dir(base_dir: &Path) -> AppResult<()> {
        let dir = Self::get_storage_dir(base_dir);
        if !dir.exists() {
            fs::create_dir_all(&dir).map_err(|e| {
                crate::commands::AppError::Internal(format!(
                    "Failed to create storage directory: {}",
                    e
                ))
            })?;
            info!("Created document storage directory: {:?}", dir);
        }
        Ok(())
    }

    /// Generate a unique filename for a document
    pub fn generate_filename(prefix: &str, extension: &str) -> String {
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        format!("{}_{}.{}", prefix, timestamp, extension)
    }

    /// Clean up old documents (older than specified hours)
    pub async fn cleanup_old_documents(base_dir: &Path, max_age_hours: i64) -> AppResult<()> {
        let storage_dir = Self::get_storage_dir(base_dir);
        if !storage_dir.exists() {
            return Ok(());
        }

        let cutoff_time = Utc::now() - Duration::hours(max_age_hours);
        let mut cleaned_count = 0;

        for entry in fs::read_dir(&storage_dir).map_err(|e| {
            crate::commands::AppError::Internal(format!("Failed to read storage directory: {}", e))
        })? {
            let entry = entry.map_err(|e| {
                crate::commands::AppError::Internal(format!(
                    "Failed to read directory entry: {}",
                    e
                ))
            })?;

            let path = entry.path();
            if path.is_file() {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(modified_datetime) =
                            modified.duration_since(std::time::UNIX_EPOCH)
                        {
                            let modified_secs = modified_datetime.as_secs() as i64;
                            if let Some(modified_datetime) =
                                DateTime::<Utc>::from_timestamp(modified_secs, 0)
                            {
                                if modified_datetime < cutoff_time {
                                    if fs::remove_file(&path).is_ok() {
                                        cleaned_count += 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if cleaned_count > 0 {
            info!("Cleaned up {} old documents", cleaned_count);
        }

        Ok(())
    }

    /// Get document file path
    pub fn get_document_path(base_dir: &Path, filename: &str) -> PathBuf {
        Self::get_storage_dir(base_dir).join(filename)
    }

    /// Check if document exists
    pub fn document_exists(base_dir: &Path, filename: &str) -> bool {
        Self::get_document_path(base_dir, filename).exists()
    }
}
