//! Intervention step model
//!
//! Row-to-domain conversions (`FromSqlRow` impls) live in
//! `infrastructure::intervention_row_mapping` to keep this model free of
//! `rusqlite` dependencies (ADR-002).

use crate::shared::contracts::common::*;
use serde::{Deserialize, Serialize};
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
    #[ts(type = "JsonValue | null")]
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
    #[ts(type = "JsonValue | null")]
    pub step_data: Option<serde_json::Value>,
    #[ts(type = "JsonValue | null")]
    pub collected_data: Option<serde_json::Value>,
    #[ts(type = "JsonValue | null")]
    pub measurements: Option<serde_json::Value>,
    pub observations: Option<Vec<String>>,

    // Photos
    pub photo_count: i32,
    pub required_photos_completed: bool,
    pub photo_urls: Option<Vec<String>>,
    #[ts(type = "JsonValue | null")]
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
            id: crate::shared::utils::uuid::generate_uuid_string(),
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_step() {
        let step = InterventionStep::new(
            "intervention-123".to_string(),
            1,
            "Inspection du vÃ©hicule".to_string(),
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
