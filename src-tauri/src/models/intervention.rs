//! Intervention model - Main entity for PPF interventions

use super::common::*;
use crate::db::FromSqlRow;
use rusqlite::{Result as SqliteResult, Row};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
#[cfg(any(feature = "specta", feature = "ts-rs"))]
use ts_rs::TS;

/// Intervention status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
#[serde(rename_all = "snake_case")]
pub enum InterventionStatus {
    Pending,
    InProgress,
    Paused,
    Completed,
    Cancelled,
}

impl Default for InterventionStatus {
    fn default() -> Self {
        Self::Pending
    }
}

impl std::fmt::Display for InterventionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        };
        write!(f, "{}", s)
    }
}

impl std::str::FromStr for InterventionStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(Self::Pending),
            "in_progress" => Ok(Self::InProgress),
            "paused" => Ok(Self::Paused),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            _ => Err(format!("Invalid intervention status: {}", s)),
        }
    }
}

/// Intervention type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
#[serde(rename_all = "snake_case")]
pub enum InterventionType {
    Ppf,
    Ceramic,
    Detailing,
    Other,
}

impl Default for InterventionType {
    fn default() -> Self {
        Self::Ppf
    }
}

impl std::str::FromStr for InterventionType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ppf" => Ok(Self::Ppf),
            "ceramic" => Ok(Self::Ceramic),
            "detailing" => Ok(Self::Detailing),
            "other" => Ok(Self::Other),
            _ => Err(format!("Invalid intervention type: {}", s)),
        }
    }
}

impl std::fmt::Display for InterventionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Ppf => "ppf",
            Self::Ceramic => "ceramic",
            Self::Detailing => "detailing",
            Self::Other => "other",
        };
        write!(f, "{}", s)
    }
}

/// Main intervention struct
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct Intervention {
    // Identifiers
    pub id: String,
    pub task_id: String,
    pub task_number: Option<String>,

    // Status
    pub status: InterventionStatus,

    // Vehicle
    pub vehicle_plate: String,
    pub vehicle_model: Option<String>,
    pub vehicle_make: Option<String>,
    pub vehicle_year: Option<i32>,
    pub vehicle_color: Option<String>,
    pub vehicle_vin: Option<String>,

    // Client (denormalized)
    pub client_id: Option<String>,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub client_phone: Option<String>,

    // Technician (denormalized)
    pub technician_id: Option<String>,
    pub technician_name: Option<String>,

    // Intervention PPF
    pub intervention_type: InterventionType,
    /// Number of completed steps (0-based count, not array index)
    pub current_step: i32,
    pub completion_percentage: f64,

    // PPF Configuration - Box large collections to reduce stack size
    pub ppf_zones_config: Option<Vec<String>>,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "any"))]
    pub ppf_zones_extended: Option<serde_json::Value>,
    pub film_type: Option<FilmType>,
    pub film_brand: Option<String>,
    pub film_model: Option<String>,

    // Temporality
    pub scheduled_at: TimestampString,
    pub started_at: TimestampString,
    pub completed_at: TimestampString,
    pub paused_at: TimestampString,
    pub estimated_duration: Option<i32>, // minutes
    pub actual_duration: Option<i32>,    // minutes

    // Environmental conditions
    pub weather_condition: Option<WeatherCondition>,
    pub lighting_condition: Option<LightingCondition>,
    pub work_location: Option<WorkLocation>,
    pub temperature_celsius: Option<f64>,
    pub humidity_percentage: Option<f64>,

    // GPS locations - separate fields to match database schema
    pub start_location_lat: Option<f64>,
    pub start_location_lon: Option<f64>,
    pub start_location_accuracy: Option<f64>,
    pub end_location_lat: Option<f64>,
    pub end_location_lon: Option<f64>,
    pub end_location_accuracy: Option<f64>,

    // Finalization - Box large collections
    pub customer_satisfaction: Option<i32>, // 1-10
    pub quality_score: Option<i32>,         // 0-100
    pub final_observations: Option<Vec<String>>,
    pub customer_signature: Option<String>, // base64
    pub customer_comments: Option<String>,

    // Metadata - Box large JSON values
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "any"))]
    pub metadata: Option<serde_json::Value>,
    pub notes: Option<String>,
    pub special_instructions: Option<String>,

    // Device - Box large JSON values
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "any"))]
    pub device_info: Option<serde_json::Value>,
    pub app_version: Option<String>,

    // Sync
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    pub last_synced_at: Option<i64>,
    pub sync_error: Option<String>,
    #[serde(serialize_with = "serialize_timestamp")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    pub updated_at: i64,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

impl Intervention {
    /// Create new intervention with defaults
    pub fn new(task_id: String, task_number: String, vehicle_plate: String) -> Self {
        let now = now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            task_id,
            task_number: Some(task_number),
            status: InterventionStatus::default(),
            vehicle_plate,
            vehicle_model: None,
            vehicle_make: None,
            vehicle_year: None,
            vehicle_color: None,
            vehicle_vin: None,
            client_id: None,
            client_name: None,
            client_email: None,
            client_phone: None,
            technician_id: None,
            technician_name: None,
            intervention_type: InterventionType::default(),
            current_step: 0,
            completion_percentage: 0.0,
            ppf_zones_config: None,
            ppf_zones_extended: None,
            film_type: None,
            film_brand: None,
            film_model: None,
            scheduled_at: TimestampString(None),
            started_at: TimestampString(None),
            completed_at: TimestampString(None),
            paused_at: TimestampString(None),
            estimated_duration: None,
            actual_duration: None,
            weather_condition: None,
            lighting_condition: None,
            work_location: None,
            temperature_celsius: None,
            humidity_percentage: None,
            start_location_lat: None,
            start_location_lon: None,
            start_location_accuracy: None,
            end_location_lat: None,
            end_location_lon: None,
            end_location_accuracy: None,
            customer_satisfaction: None,
            quality_score: None,
            final_observations: None,
            customer_signature: None,
            customer_comments: None,
            metadata: None,
            notes: None,
            special_instructions: None,
            device_info: None,
            app_version: None,
            synced: false,
            last_synced_at: None,
            sync_error: None,
            created_at: now,
            updated_at: now,
            created_by: None,
            updated_by: None,
        }
    }

    /// Validate intervention data
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        // Task ID should be a valid UUID
        if uuid::Uuid::parse_str(&self.task_id).is_err() {
            errors.push("Invalid task_id format - must be a valid UUID".to_string());
        }

        // Vehicle plate required
        if self.vehicle_plate.is_empty() {
            errors.push("vehicle_plate is required".to_string());
        }

        // Vehicle year validation
        if let Some(year) = self.vehicle_year {
            if !(1900..=2100).contains(&year) {
                errors.push(format!("Invalid vehicle_year: {}", year));
            }
        }

        // Completion percentage range
        if self.completion_percentage < 0.0 || self.completion_percentage > 100.0 {
            errors.push(format!(
                "Invalid completion_percentage: {}",
                self.completion_percentage
            ));
        }

        // Customer satisfaction range
        if let Some(sat) = self.customer_satisfaction {
            if !(1..=10).contains(&sat) {
                errors.push(format!("Invalid customer_satisfaction: {}", sat));
            }
        }

        // Quality score range
        if let Some(score) = self.quality_score {
            if !(0..=100).contains(&score) {
                errors.push(format!("Invalid quality_score: {}", score));
            }
        }

        // GPS validation
        if let (Some(lat), Some(lon)) = (self.start_location_lat, self.start_location_lon) {
            if !(-90.0..=90.0).contains(&lat) {
                errors.push(format!("Invalid start_location_lat: {}", lat));
            }
            if !(-180.0..=180.0).contains(&lon) {
                errors.push(format!("Invalid start_location_lon: {}", lon));
            }
        }
        if let (Some(lat), Some(lon)) = (self.end_location_lat, self.end_location_lon) {
            if !(-90.0..=90.0).contains(&lat) {
                errors.push(format!("Invalid end_location_lat: {}", lat));
            }
            if !(-180.0..=180.0).contains(&lon) {
                errors.push(format!("Invalid end_location_lon: {}", lon));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /// Convert from SQLite row
    pub fn from_row(row: &Row) -> SqliteResult<Self> {
        // Parse JSON fields
        let ppf_zones: Option<Vec<String>> = row
            .get::<_, Option<String>>("ppf_zones_config")?
            .and_then(|s| serde_json::from_str(&s).ok());

        let start_location_lat: Option<f64> = row.get("start_location_lat")?;
        let start_location_lon: Option<f64> = row.get("start_location_lon")?;
        let start_location_accuracy: Option<f64> = row.get("start_location_accuracy")?;
        let end_location_lat: Option<f64> = row.get("end_location_lat")?;
        let end_location_lon: Option<f64> = row.get("end_location_lon")?;
        let end_location_accuracy: Option<f64> = row.get("end_location_accuracy")?;

        Ok(Self {
            id: row
                .get::<_, Option<String>>("id")?
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
            task_id: row
                .get::<_, Option<String>>("task_id")?
                .unwrap_or_else(|| "UNKNOWN".to_string()),
            task_number: row.get("task_number")?,
            status: {
                let status_str = row
                    .get::<_, Option<String>>("status")?
                    .unwrap_or_else(|| "pending".to_string());
                InterventionStatus::from_str(&status_str).unwrap_or(InterventionStatus::default())
            },
            vehicle_plate: row
                .get::<_, Option<String>>("vehicle_plate")?
                .unwrap_or_else(|| "UNKNOWN".to_string()),
            vehicle_model: row.get("vehicle_model")?,
            vehicle_make: row.get("vehicle_make")?,
            vehicle_year: row.get("vehicle_year")?,
            vehicle_color: row.get("vehicle_color")?,
            vehicle_vin: row.get("vehicle_vin")?,
            technician_id: row.get("technician_id")?,
            technician_name: row.get("technician_name")?,
            client_id: row.get("client_id")?,
            client_name: row.get("client_name")?,
            client_email: row.get("client_email")?,
            client_phone: row.get("client_phone")?,
            intervention_type: {
                let type_str = row
                    .get::<_, Option<String>>("intervention_type")?
                    .unwrap_or_else(|| "ppf".to_string());
                InterventionType::from_str(&type_str).unwrap_or(InterventionType::default())
            },
            current_step: row.get("current_step")?,
            completion_percentage: row.get("completion_percentage")?,
            ppf_zones_config: ppf_zones,
            ppf_zones_extended: row
                .get::<_, Option<String>>("ppf_zones_extended")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            film_type: row
                .get::<_, Option<String>>("film_type")?
                .and_then(|s| serde_json::from_str(&format!(r#""{}""#, s)).ok()),
            film_brand: row.get("film_brand")?,
            film_model: row.get("film_model")?,

            scheduled_at: TimestampString(row.get("scheduled_at")?),
            started_at: TimestampString(row.get("started_at")?),
            completed_at: TimestampString(row.get("completed_at")?),
            paused_at: TimestampString(row.get("paused_at")?),
            estimated_duration: row.get("estimated_duration")?,
            actual_duration: row.get("actual_duration")?,

            weather_condition: row
                .get::<_, Option<String>>("weather_condition")?
                .and_then(|s| serde_json::from_str(&format!(r#""{}""#, s)).ok()),
            lighting_condition: row
                .get::<_, Option<String>>("lighting_condition")?
                .and_then(|s| serde_json::from_str(&format!(r#""{}""#, s)).ok()),
            work_location: row
                .get::<_, Option<String>>("work_location")?
                .and_then(|s| serde_json::from_str(&format!(r#""{}""#, s)).ok()),
            temperature_celsius: row.get("temperature_celsius")?,
            humidity_percentage: row.get("humidity_percentage")?,

            start_location_lat,
            start_location_lon,
            start_location_accuracy,
            end_location_lat,
            end_location_lon,
            end_location_accuracy,

            customer_satisfaction: row.get("customer_satisfaction")?,
            quality_score: row.get("quality_score")?,

            final_observations: row
                .get::<_, Option<String>>("final_observations")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            customer_signature: row.get("customer_signature")?,
            customer_comments: row.get("customer_comments")?,

            metadata: row
                .get::<_, Option<String>>("metadata")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            notes: row.get("notes")?,
            special_instructions: row.get("special_instructions")?,

            device_info: row
                .get::<_, Option<String>>("device_info")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            app_version: row.get("app_version")?,

            synced: row.get::<_, Option<i32>>("synced")?.unwrap_or(0) == 1,
            last_synced_at: row.get("last_synced_at")?,
            sync_error: row.get("sync_error")?,
            created_at: row.get::<_, Option<i64>>("created_at")?.unwrap_or(now()),
            updated_at: row.get::<_, Option<i64>>("updated_at")?.unwrap_or(now()),
            created_by: row.get("created_by")?,
            updated_by: row.get("updated_by")?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_intervention() {
        let task_id = uuid::Uuid::new_v4().to_string();
        let intervention = Intervention::new(
            task_id.clone(),
            "ABC-123".to_string(),
            "ABC-123".to_string(),
        );

        assert_eq!(intervention.task_id, task_id);
        assert_eq!(intervention.vehicle_plate, "ABC-123");
        assert_eq!(intervention.status, InterventionStatus::Pending);
        assert_eq!(intervention.current_step, 0);
        assert_eq!(intervention.completion_percentage, 0.0);
    }

    #[test]
    fn test_validate_intervention() {
        let task_id = uuid::Uuid::new_v4().to_string();
        let mut intervention =
            Intervention::new(task_id, "ABC-123".to_string(), "ABC-123".to_string());

        assert!(intervention.validate().is_ok());

        // Invalid task id
        intervention.task_id = "INVALID".to_string();
        assert!(intervention.validate().is_err());

        intervention.task_id = uuid::Uuid::new_v4().to_string();

        // Invalid vehicle year
        intervention.vehicle_year = Some(1800);
        assert!(intervention.validate().is_err());

        intervention.vehicle_year = Some(2024);

        // Invalid completion percentage
        intervention.completion_percentage = 150.0;
        assert!(intervention.validate().is_err());
    }

    #[test]
    fn test_status_serialization() {
        let status = InterventionStatus::InProgress;
        let json = serde_json::to_string(&status).expect("Failed to serialize InterventionStatus");
        assert_eq!(json, r#""in_progress""#);

        let deserialized: InterventionStatus =
            serde_json::from_str(&json).expect("Failed to deserialize InterventionStatus");
        assert_eq!(deserialized, status);
    }

    #[test]
    fn test_status_from_str() {
        assert_eq!(
            "pending"
                .parse::<InterventionStatus>()
                .expect("Failed to parse 'pending' status"),
            InterventionStatus::Pending
        );
        assert_eq!(
            "in_progress"
                .parse::<InterventionStatus>()
                .expect("Failed to parse 'in_progress' status"),
            InterventionStatus::InProgress
        );
        assert!("invalid".parse::<InterventionStatus>().is_err());
    }
}

/// Progress tracking for interventions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct InterventionProgress {
    pub intervention_id: String,
    pub current_step: i32,
    pub total_steps: i32,
    pub completed_steps: i32,
    pub completion_percentage: f32,
    pub estimated_time_remaining: Option<i32>, // minutes
    pub status: InterventionStatus,
}

/// Filter for intervention queries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct InterventionFilter {
    pub task_id: Option<String>,
    pub status: Option<String>,
    pub technician_id: Option<String>,
    pub client_id: Option<String>,
    pub priority: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub intervention_type: Option<String>,
}

/// Request for bulk updating interventions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct BulkUpdateInterventionRequest {
    pub intervention_ids: Vec<String>,
    pub status: Option<String>,
    pub technician_id: Option<String>,
    pub priority: Option<String>,
    pub updates: Option<String>,
}
