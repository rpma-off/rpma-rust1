//! Intervention step model

use super::common::*;
use crate::db::FromSqlRow;
use rusqlite::{Result as SqliteResult, Row};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
// Conditional import removed
use ts_rs::TS;

/// Step status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    InProgress,
    Paused,
    Completed,
    Failed,
    Skipped,
    Rework,
}

impl Default for StepStatus {
    fn default() -> Self {
        Self::Pending
    }
}

impl std::str::FromStr for StepStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(Self::Pending),
            "in_progress" => Ok(Self::InProgress),
            "paused" => Ok(Self::Paused),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            "skipped" => Ok(Self::Skipped),
            "rework" => Ok(Self::Rework),
            _ => Err(format!("Invalid step status: {}", s)),
        }
    }
}

impl std::fmt::Display for StepStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::Skipped => "skipped",
            Self::Rework => "rework",
        };
        write!(f, "{}", s)
    }
}

/// Step type enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "lowercase")]
pub enum StepType {
    Inspection,
    Preparation,
    Installation,
    Finalization,
}

impl Default for StepType {
    fn default() -> Self {
        Self::Inspection
    }
}

impl std::str::FromStr for StepType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "inspection" => Ok(Self::Inspection),
            "preparation" => Ok(Self::Preparation),
            "installation" => Ok(Self::Installation),
            "finalization" => Ok(Self::Finalization),
            _ => Err(format!("Invalid step type: {}", s)),
        }
    }
}

impl std::fmt::Display for StepType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Inspection => "inspection",
            Self::Preparation => "preparation",
            Self::Installation => "installation",
            Self::Finalization => "finalization",
        };
        write!(f, "{}", s)
    }
}

/// Intervention step struct
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct InterventionStep {
    // Identifiers
    pub id: String,
    pub intervention_id: String,

    // Configuration
    pub step_number: i32,
    pub step_name: String,
    pub step_type: StepType,
    pub step_status: StepStatus,

    // Metadata
    pub description: Option<String>,
    #[ts(type = "JsonValue")]
    pub instructions: Option<serde_json::Value>,
    pub quality_checkpoints: Option<Vec<String>>,

    // Requirements
    pub is_mandatory: bool,
    pub requires_photos: bool,
    pub min_photos_required: i32,
    pub max_photos_allowed: i32,

    // Temporality
    pub started_at: TimestampString,
    pub completed_at: TimestampString,
    pub paused_at: TimestampString,
    pub duration_seconds: Option<i32>,
    pub estimated_duration_seconds: Option<i32>,
    #[ts(type = "JsonValue")]
    pub step_data: Option<serde_json::Value>,
    #[ts(type = "JsonValue")]
    pub collected_data: Option<serde_json::Value>,
    #[ts(type = "JsonValue")]
    pub measurements: Option<serde_json::Value>,
    pub observations: Option<Vec<String>>,

    // Photos
    pub photo_count: i32,
    pub required_photos_completed: bool,
    pub photo_urls: Option<Vec<String>>,
    #[ts(type = "JsonValue")]
    pub validation_data: Option<serde_json::Value>,
    pub validation_errors: Option<Vec<String>>,
    pub validation_score: Option<i32>,

    // Approval
    pub requires_supervisor_approval: bool,
    pub approved_by: Option<String>,
    pub approved_at: TimestampString,
    pub rejection_reason: Option<String>,

    // GPS
    pub location_lat: Option<f64>,
    pub location_lon: Option<f64>,
    pub location_accuracy: Option<f64>,

    pub device_timestamp: TimestampString,
    pub server_timestamp: TimestampString,

    // Notes
    pub title: Option<String>,
    pub notes: Option<String>,

    // Sync
    pub synced: bool,
    pub last_synced_at: TimestampString,

    // Audit
    #[serde(serialize_with = "serialize_timestamp")]
    pub created_at: Timestamp,
    #[serde(serialize_with = "serialize_timestamp")]
    pub updated_at: Timestamp,
}

impl InterventionStep {
    /// Create new step
    pub fn new(
        intervention_id: String,
        step_number: i32,
        step_name: String,
        step_type: StepType,
    ) -> Self {
        let now = now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            intervention_id,
            step_number,
            step_name,
            step_type,
            step_status: StepStatus::default(),
            description: None,
            instructions: None,
            quality_checkpoints: None,
            is_mandatory: false,
            requires_photos: false,
            min_photos_required: 0,
            max_photos_allowed: 20,
            started_at: TimestampString::new(None),
            completed_at: TimestampString::new(None),
            paused_at: TimestampString::new(None),
            duration_seconds: None,
            estimated_duration_seconds: None,
            step_data: None,
            collected_data: None,
            measurements: None,
            observations: None,
            photo_count: 0,
            required_photos_completed: false,
            photo_urls: None,
            validation_data: None,
            validation_errors: None,
            validation_score: None,
            requires_supervisor_approval: false,
            approved_by: None,
            approved_at: TimestampString::new(None),
            rejection_reason: None,
            location_lat: None,
            location_lon: None,
            location_accuracy: None,
            device_timestamp: TimestampString::new(None),
            server_timestamp: TimestampString::new(None),
            title: None,
            notes: None,
            synced: false,
            last_synced_at: TimestampString::new(None),
            created_at: now,
            updated_at: now,
        }
    }

    /// Validate step data
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        if self.step_name.is_empty() {
            errors.push("step_name is required".to_string());
        }

        if self.step_number < 1 {
            errors.push(format!("Invalid step_number: {}", self.step_number));
        }

        if let Some(score) = self.validation_score {
            if !(0..=100).contains(&score) {
                errors.push(format!("Invalid validation_score: {}", score));
            }
        }

        if self.requires_photos && self.photo_count < self.min_photos_required {
            errors.push(format!(
                "Not enough photos: {} < {}",
                self.photo_count, self.min_photos_required
            ));
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /// Convert from SQLite row
    pub fn from_row(row: &Row) -> SqliteResult<Self> {
        Ok(Self {
            id: row.get("id")?,
            intervention_id: row.get("intervention_id")?,
            step_number: row.get("step_number")?,
            step_name: row.get("step_name")?,

            step_type: {
                let type_str: String = row.get("step_type")?;
                StepType::from_str(&type_str).unwrap_or(StepType::default())
            },
            step_status: {
                let status_str: String = row.get("step_status")?;
                StepStatus::from_str(&status_str).unwrap_or(StepStatus::default())
            },
            description: row.get("description")?,
            instructions: row
                .get::<_, Option<String>>("instructions")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            quality_checkpoints: row
                .get::<_, Option<String>>("quality_checkpoints")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            is_mandatory: row.get::<_, i32>("is_mandatory")? == 1,
            requires_photos: row.get::<_, i32>("requires_photos")? == 1,
            min_photos_required: row.get("min_photos_required")?,
            max_photos_allowed: row.get("max_photos_allowed")?,

            started_at: TimestampString::new(row.get("started_at")?),
            completed_at: TimestampString::new(row.get("completed_at")?),
            paused_at: TimestampString::new(row.get("paused_at")?),

            duration_seconds: row.get("duration_seconds")?,
            estimated_duration_seconds: row.get("estimated_duration_seconds")?,

            step_data: row
                .get::<_, Option<String>>("step_data")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            collected_data: row
                .get::<_, Option<String>>("collected_data")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            measurements: row
                .get::<_, Option<String>>("measurements")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            observations: row
                .get::<_, Option<String>>("observations")?
                .and_then(|s| serde_json::from_str(&s).ok()),

            photo_count: row.get("photo_count")?,
            required_photos_completed: row.get::<_, i32>("required_photos_completed")? == 1,
            photo_urls: row
                .get::<_, Option<String>>("photo_urls")?
                .and_then(|s| serde_json::from_str(&s).ok()),

            validation_data: row
                .get::<_, Option<String>>("validation_data")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            validation_errors: row
                .get::<_, Option<String>>("validation_errors")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            validation_score: row.get("validation_score")?,

            requires_supervisor_approval: row.get::<_, i32>("requires_supervisor_approval")? == 1,
            approved_by: row.get("approved_by")?,
            approved_at: TimestampString::new(row.get("approved_at")?),
            rejection_reason: row.get("rejection_reason")?,

            location_lat: row.get("location_lat")?,
            location_lon: row.get("location_lon")?,
            location_accuracy: row.get("location_accuracy")?,

            device_timestamp: TimestampString::new(row.get("device_timestamp")?),
            server_timestamp: TimestampString::new(row.get("server_timestamp")?),

            title: row.get("title")?,
            notes: row.get("notes")?,

            synced: row.get::<_, i32>("synced")? == 1,
            last_synced_at: TimestampString::new(row.get("last_synced_at")?),

            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

impl FromSqlRow for InterventionStep {
    fn from_row(row: &Row) -> SqliteResult<Self> {
        Ok(InterventionStep {
            id: row.get("id")?,
            intervention_id: row.get("intervention_id")?,
            step_number: row.get("step_number")?,
            step_name: row.get("step_name")?,
            step_type: {
                let type_str: String = row.get("step_type")?;
                StepType::from_str(&type_str).unwrap_or(StepType::default())
            },
            step_status: {
                let status_str: String = row.get("step_status")?;
                StepStatus::from_str(&status_str).unwrap_or(StepStatus::default())
            },
            description: row.get::<_, Option<String>>("description")?,
            instructions: {
                let instr_str: Option<String> = row.get("instructions")?;
                instr_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            quality_checkpoints: {
                let checkpoints_str: Option<String> = row.get("quality_checkpoints")?;
                checkpoints_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            is_mandatory: row.get::<_, i32>("is_mandatory")? == 1,
            requires_photos: row.get::<_, i32>("requires_photos")? == 1,
            min_photos_required: row.get("min_photos_required")?,
            max_photos_allowed: row.get("max_photos_allowed")?,
            started_at: TimestampString::new(row.get::<_, Option<Timestamp>>("started_at")?),
            completed_at: TimestampString::new(row.get::<_, Option<Timestamp>>("completed_at")?),
            paused_at: TimestampString::new(row.get::<_, Option<Timestamp>>("paused_at")?),
            duration_seconds: row.get::<_, Option<i32>>("duration_seconds")?,
            estimated_duration_seconds: row.get::<_, Option<i32>>("estimated_duration_seconds")?,
            step_data: {
                let data_str: Option<String> = row.get("step_data")?;
                data_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            collected_data: {
                let data_str: Option<String> = row.get("collected_data")?;
                data_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            measurements: {
                let measurements_str: Option<String> = row.get("measurements")?;
                measurements_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            observations: {
                let obs_str: Option<String> = row.get("observations")?;
                obs_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            photo_count: row.get("photo_count")?,
            required_photos_completed: row.get::<_, i32>("required_photos_completed")? == 1,
            photo_urls: {
                let urls_str: Option<String> = row.get("photo_urls")?;
                urls_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            validation_data: {
                let val_str: Option<String> = row.get("validation_data")?;
                val_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            validation_errors: {
                let errors_str: Option<String> = row.get("validation_errors")?;
                errors_str.and_then(|s| serde_json::from_str(&s).ok())
            },
            validation_score: row.get::<_, Option<i32>>("validation_score")?,
            requires_supervisor_approval: row.get::<_, i32>("requires_supervisor_approval")? == 1,
            approved_by: row.get::<_, Option<String>>("approved_by")?,
            approved_at: TimestampString::new(row.get::<_, Option<Timestamp>>("approved_at")?),
            rejection_reason: row.get::<_, Option<String>>("rejection_reason")?,
            location_lat: row.get("location_lat")?,
            location_lon: row.get("location_lon")?,
            location_accuracy: row.get("location_accuracy")?,
            device_timestamp: TimestampString::new(
                row.get::<_, Option<Timestamp>>("device_timestamp")?,
            ),
            server_timestamp: TimestampString::new(
                row.get::<_, Option<Timestamp>>("server_timestamp")?,
            ),
            title: row.get::<_, Option<String>>("title")?,
            notes: row.get::<_, Option<String>>("notes")?,
            synced: row.get::<_, i32>("synced")? == 1,
            last_synced_at: TimestampString::new(
                row.get::<_, Option<Timestamp>>("last_synced_at")?,
            ),
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_step() {
        let step = InterventionStep::new(
            "intervention-123".to_string(),
            1,
            "Inspection du véhicule".to_string(),
            StepType::Inspection,
        );

        assert_eq!(step.step_number, 1);
        assert_eq!(step.step_type, StepType::Inspection);
        assert_eq!(step.step_status, StepStatus::Pending);
    }

    #[test]
    fn test_validate_step() {
        let mut step = InterventionStep::new(
            "intervention-123".to_string(),
            1,
            "Test Step".to_string(),
            StepType::Inspection,
        );

        assert!(step.validate().is_ok());

        // Test photo requirement
        step.requires_photos = true;
        step.min_photos_required = 3;
        step.photo_count = 1;

        assert!(step.validate().is_err());
    }
}
