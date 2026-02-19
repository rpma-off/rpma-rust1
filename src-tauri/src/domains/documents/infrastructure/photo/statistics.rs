//! Photo Statistics Module - Usage analytics and reporting
//!
//! This module provides photo usage statistics including:
//! - Total photo counts and storage usage
//! - Photos grouped by intervention
//! - Storage path information

use crate::db::Database;
use std::collections::HashMap;

/// Photo count by intervention
#[derive(Debug)]
struct InterventionPhotoCount {
    pub intervention_id: String,
    pub count: i32,
}

impl crate::db::FromSqlRow for InterventionPhotoCount {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            intervention_id: row.get(0)?,
            count: row.get(1)?,
        })
    }
}

/// Photo storage statistics
#[derive(Debug, serde::Serialize)]
pub struct PhotoStats {
    pub total_photos: i32,
    pub total_size_bytes: i64,
    pub photos_by_intervention: HashMap<String, i32>,
    pub storage_path: String,
}

/// Photo statistics service
#[derive(Debug)]
pub struct PhotoStatisticsService {
    db: Database,
    local_storage_path: std::path::PathBuf,
}

impl PhotoStatisticsService {
    /// Create new photo statistics service
    pub fn new(db: Database, local_storage_path: std::path::PathBuf) -> Self {
        Self {
            db,
            local_storage_path,
        }
    }

    /// Get photo statistics
    pub fn get_stats(&self) -> crate::services::photo::PhotoResult<PhotoStats> {
        // Get total photos and size
        let total_photos: i32 = self
            .db
            .query_single_value("SELECT COUNT(*) FROM photos", [])?;

        let total_size: i64 = self
            .db
            .query_single_value("SELECT COALESCE(SUM(file_size), 0) FROM photos", [])?;

        // Get photos by intervention
        let intervention_stats: Vec<InterventionPhotoCount> = self.db.query_as(
            "SELECT intervention_id, COUNT(*) as photo_count FROM photos WHERE intervention_id IS NOT NULL GROUP BY intervention_id",
            [],
        )?;

        let photos_by_intervention: HashMap<String, i32> = intervention_stats
            .into_iter()
            .map(|stat| (stat.intervention_id, stat.count))
            .collect();

        Ok(PhotoStats {
            total_photos,
            total_size_bytes: total_size,
            photos_by_intervention,
            storage_path: self.local_storage_path.to_string_lossy().to_string(),
        })
    }
}
