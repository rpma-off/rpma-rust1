//! Intervention Types - Shared types for intervention services
//!
//! This module contains all the types used across intervention services
//! to avoid circular dependencies.

use serde::{Deserialize, Serialize};
#[cfg(any(feature = "specta", feature = "ts-rs"))]
use ts_rs::TS;

/// Request to start a new intervention
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct StartInterventionRequest {
    pub task_id: String,
    pub intervention_number: Option<String>,
    pub ppf_zones: Vec<String>,
    pub custom_zones: Option<Vec<String>>,
    pub film_type: String,
    pub film_brand: Option<String>,
    pub film_model: Option<String>,
    pub weather_condition: String,
    pub lighting_condition: String,
    pub work_location: String,
    pub temperature: Option<f32>,
    pub humidity: Option<f32>,
    pub technician_id: String,
    pub assistant_ids: Option<Vec<String>>,
    pub scheduled_start: String, // ISO datetime
    pub estimated_duration: i32, // minutes
    pub gps_coordinates: Option<GpsCoordinates>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub customer_requirements: Option<Vec<String>>,
    pub special_instructions: Option<String>,
}

/// Response for starting an intervention
#[derive(Debug, Serialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct StartInterventionResponse {
    pub intervention: crate::models::intervention::Intervention,
    pub steps: Vec<crate::models::step::InterventionStep>,
    pub initial_requirements: Vec<StepRequirement>,
}

/// Request to advance a step
#[derive(Debug, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct AdvanceStepRequest {
    pub intervention_id: String,
    pub step_id: String,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "any"))]
    pub collected_data: serde_json::Value,
    pub photos: Option<Vec<String>>, // Photo IDs
    pub notes: Option<String>,
    pub quality_check_passed: bool,
    pub issues: Option<Vec<String>>,
}

/// Response for advancing a step
#[derive(Debug, Serialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct AdvanceStepResponse {
    pub step: crate::models::step::InterventionStep,
    pub next_step: Option<crate::models::step::InterventionStep>,
    pub progress_percentage: f32,
    pub requirements_completed: Vec<String>,
}

/// Request for saving step progress without advancing
#[derive(Debug, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct SaveStepProgressRequest {
    pub step_id: String,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "any"))]
    pub collected_data: serde_json::Value,
    pub notes: Option<String>,
    pub photos: Option<Vec<String>>,
}

/// Response for saving step progress
#[derive(Debug, Serialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct SaveStepProgressResponse {
    pub step: crate::models::step::InterventionStep,
}

/// Request to finalize an intervention
#[derive(Deserialize, Debug)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct FinalizeInterventionRequest {
    pub intervention_id: String,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "any"))]
    pub collected_data: Option<serde_json::Value>,
    pub photos: Option<Vec<String>>,
    pub customer_satisfaction: Option<i32>,
    pub quality_score: Option<i32>,
    pub final_observations: Option<Vec<String>>,
    pub customer_signature: Option<String>,
    pub customer_comments: Option<String>,
}

/// Response for finalizing an intervention
#[derive(Debug, Serialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct FinalizeInterventionResponse {
    pub intervention: crate::models::intervention::Intervention,
    pub metrics: InterventionMetrics,
}

/// Intervention metrics for finalization
#[derive(Debug, Serialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct InterventionMetrics {
    pub total_duration_minutes: i32,
    pub completion_rate: f32,
    pub quality_score: Option<i32>,
    pub customer_satisfaction: Option<i32>,
    pub steps_completed: i32,
    pub total_steps: i32,
    pub photos_taken: i32,
}

/// Step requirement for workflow validation
#[derive(Debug, Serialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct StepRequirement {
    pub step_id: String,
    pub requirement_type: String,
    pub description: String,
    pub is_mandatory: bool,
    pub is_completed: bool,
}

/// GPS coordinates for location tracking
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct GpsCoordinates {
    pub latitude: f64,
    pub longitude: f64,
    pub accuracy: Option<f64>,
}

/// Intervention step with associated photos
#[derive(Debug, Serialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct InterventionStepWithPhotos {
    pub step: crate::models::step::InterventionStep,
    pub photos: Vec<crate::models::photo::Photo>,
}

/// Intervention with all related data
#[derive(Debug, Serialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct InterventionWithDetails {
    pub intervention: crate::models::intervention::Intervention,
    pub steps: Vec<InterventionStepWithPhotos>,
}
