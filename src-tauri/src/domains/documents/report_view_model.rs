//! Report View Model — data preparation layer for PDF report generation.
//!
//! This module defines `ReportViewModel` and the builder function
//! `build_intervention_report_view_model`. The view model is the **single
//! source of truth** consumed by the PDF template; no business logic or
//! data merging should happen inside the renderer.

use crate::shared::contracts::common::*;
use crate::shared::services::cross_domain::{
    Client, Intervention, InterventionStatus, InterventionStep, MaterialConsumption, Photo,
    StepStatus,
};
use chrono::Utc;
use serde::Serialize;
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// View‑model structs
// ---------------------------------------------------------------------------

/// Top‑level report view model consumed by the PDF template.
#[derive(Debug, Clone, Serialize)]
pub struct ReportViewModel {
    pub meta: ReportMeta,
    pub summary: ReportSummary,
    pub client: ReportClient,
    pub vehicle: ReportVehicle,
    pub work_conditions: ReportWorkConditions,
    pub materials: ReportMaterials,
    pub steps: Vec<ReportStep>,
    pub quality: ReportQuality,
    pub customer_validation: ReportCustomerValidation,
    pub photos: ReportPhotos,
    pub display: ReportDisplay,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportMeta {
    pub report_title: String,
    pub generated_at: String,
    pub intervention_id: String,
    pub task_number: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportSummary {
    pub status: String,
    pub status_badge: String,
    pub technician_name: String,
    pub estimated_duration: String,
    pub actual_duration: String,
    pub completion_percentage: f64,
    pub intervention_type: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportClient {
    pub name: String,
    pub email: String,
    pub phone: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportVehicle {
    pub plate: String,
    pub make: String,
    pub model: String,
    pub year: String,
    pub color: String,
    pub vin: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportWorkConditions {
    pub weather: String,
    pub lighting: String,
    pub location: String,
    pub temperature: String,
    pub humidity: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportMaterials {
    pub film_type: String,
    pub film_brand: String,
    pub film_model: String,
    pub consumptions: Vec<ReportMaterialConsumption>,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportMaterialConsumption {
    pub material_id: String,
    pub quantity_used: f64,
    pub unit_cost: String,
    pub total_cost: String,
    pub waste_quantity: f64,
    pub quality_notes: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportStep {
    pub id: String,
    pub title: String,
    pub number: i32,
    pub status: String,
    pub status_badge: String,
    pub started_at: String,
    pub completed_at: String,
    pub duration: String,
    pub photo_count: i32,
    pub notes: String,
    pub checklist: Vec<ReportChecklistItem>,
    pub defects: Vec<String>,
    pub observations: Vec<String>,
    pub measurements: Vec<ReportKeyValue>,
    pub environment: Vec<ReportKeyValue>,
    pub zones: Vec<String>,
    pub quality_score: String,
    pub validation_data: Vec<ReportKeyValue>,
    pub approval_data: ReportApproval,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportChecklistItem {
    pub label: String,
    pub checked: bool,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportKeyValue {
    pub key: String,
    pub value: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportApproval {
    pub approved_by: String,
    pub approved_at: String,
    pub rejection_reason: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportQuality {
    pub global_quality_score: String,
    pub checkpoints: Vec<ReportQualityCheckpoint>,
    pub final_observations: Vec<String>,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportQualityCheckpoint {
    pub step_name: String,
    pub step_status: String,
    pub score: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportCustomerValidation {
    pub satisfaction: String,
    pub signature_present: bool,
    pub comments: String,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportPhotos {
    pub total_count: usize,
    pub grouped_by_step: Vec<ReportPhotoGroup>,
    pub grouped_by_category: Vec<ReportPhotoGroup>,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportPhotoGroup {
    pub label: String,
    pub count: usize,
}

/// TODO: document
#[derive(Debug, Clone, Serialize)]
pub struct ReportDisplay {
    pub placeholder_not_specified: String,
    pub placeholder_no_observation: String,
    pub placeholder_not_evaluated: String,
    pub placeholder_no_data: String,
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOT_SPECIFIED: &str = "Non renseigne";
const NO_OBSERVATION: &str = "Aucune observation";
const NOT_EVALUATED: &str = "Non evalue";
const NO_DATA: &str = "Aucune donnee";

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/// Build a complete `ReportViewModel` from raw intervention data.
///
/// This is the **single entry point** that fuses top‑level `steps` (the
/// canonical list) with the intervention data and normalises every field so
/// that the PDF template can render without any further logic.
pub fn build_intervention_report_view_model(
    intervention: &Intervention,
    steps: &[InterventionStep],
    photos: &[Photo],
    materials: &[MaterialConsumption],
    client: Option<&Client>,
) -> ReportViewModel {
    let now = Utc::now();

    // --- Meta ---
    let meta = ReportMeta {
        report_title: "Rapport d'intervention PPF".to_string(),
        generated_at: now.format("%d/%m/%Y %H:%M").to_string(),
        intervention_id: intervention.id.clone(),
        task_number: intervention
            .task_number
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
    };

    // --- Summary ---
    let summary = ReportSummary {
        status: intervention_status_label(&intervention.status),
        status_badge: intervention_status_badge(&intervention.status),
        technician_name: intervention
            .technician_name
            .clone()
            .unwrap_or_else(|| "Non assigne".to_string()),
        estimated_duration: intervention
            .estimated_duration
            .map(|d| format!("{} min", d))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        actual_duration: intervention
            .actual_duration
            .map(|d| format!("{} min", d))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        completion_percentage: intervention.completion_percentage,
        intervention_type: intervention_type_label(&intervention.intervention_type),
    };

    // --- Client ---
    let report_client = match client {
        Some(c) => ReportClient {
            name: c.name.clone(),
            email: c.email.clone().unwrap_or_else(|| NOT_SPECIFIED.to_string()),
            phone: c.phone.clone().unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        },
        None => ReportClient {
            name: intervention
                .client_name
                .clone()
                .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
            email: intervention
                .client_email
                .clone()
                .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
            phone: intervention
                .client_phone
                .clone()
                .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        },
    };

    // --- Vehicle ---
    let vehicle = ReportVehicle {
        plate: intervention.vehicle_plate.clone(),
        make: intervention
            .vehicle_make
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        model: intervention
            .vehicle_model
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        year: intervention
            .vehicle_year
            .map(|y| y.to_string())
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        color: intervention
            .vehicle_color
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        vin: intervention
            .vehicle_vin
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
    };

    // --- Work conditions ---
    let work_conditions = ReportWorkConditions {
        weather: intervention
            .weather_condition
            .as_ref()
            .map(weather_label)
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        lighting: intervention
            .lighting_condition
            .as_ref()
            .map(lighting_label)
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        location: intervention
            .work_location
            .as_ref()
            .map(location_label)
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        temperature: intervention
            .temperature_celsius
            .map(|t| format!("{:.1} C", t))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        humidity: intervention
            .humidity_percentage
            .map(|h| format!("{:.1}%", h))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
    };

    // --- Materials ---
    let report_materials = ReportMaterials {
        film_type: intervention
            .film_type
            .as_ref()
            .map(film_type_label)
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        film_brand: intervention
            .film_brand
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        film_model: intervention
            .film_model
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        consumptions: materials
            .iter()
            .map(|m| ReportMaterialConsumption {
                material_id: m.material_id.clone(),
                quantity_used: m.quantity_used,
                unit_cost: m
                    .unit_cost
                    .map(|c| format!("{:.2}", c))
                    .unwrap_or_else(|| "-".to_string()),
                total_cost: m
                    .total_cost
                    .map(|c| format!("{:.2}", c))
                    .unwrap_or_else(|| "-".to_string()),
                waste_quantity: m.waste_quantity,
                quality_notes: m.quality_notes.clone().unwrap_or_else(|| "-".to_string()),
            })
            .collect(),
    };

    // --- Steps ---
    let report_steps: Vec<ReportStep> = steps
        .iter()
        .map(|step| build_report_step(step, photos))
        .collect();

    // --- Quality ---
    let quality = build_quality_section(intervention, &report_steps);

    // --- Customer validation ---
    let customer_validation = ReportCustomerValidation {
        satisfaction: intervention
            .customer_satisfaction
            .map(|s| format!("{}/10", s))
            .unwrap_or_else(|| NOT_EVALUATED.to_string()),
        signature_present: intervention.customer_signature.is_some(),
        comments: intervention
            .customer_comments
            .clone()
            .unwrap_or_else(|| NO_OBSERVATION.to_string()),
    };

    // --- Photos ---
    let report_photos = build_photos_section(photos, steps);

    // --- Display placeholders ---
    let display = ReportDisplay {
        placeholder_not_specified: NOT_SPECIFIED.to_string(),
        placeholder_no_observation: NO_OBSERVATION.to_string(),
        placeholder_not_evaluated: NOT_EVALUATED.to_string(),
        placeholder_no_data: NO_DATA.to_string(),
    };

    ReportViewModel {
        meta,
        summary,
        client: report_client,
        vehicle,
        work_conditions,
        materials: report_materials,
        steps: report_steps,
        quality,
        customer_validation,
        photos: report_photos,
        display,
    }
}

// ---------------------------------------------------------------------------
// Step builder
// ---------------------------------------------------------------------------

fn build_report_step(step: &InterventionStep, photos: &[Photo]) -> ReportStep {
    let step_photos: usize = photos
        .iter()
        .filter(|p| {
            p.step_id.as_deref() == Some(&step.id) || p.step_number == Some(step.step_number)
        })
        .count();

    let effective_photo_count = if step_photos > 0 {
        step_photos as i32
    } else {
        step.photo_count
    };

    // Extract structured data from collected_data / step_data
    let effective_data = step.collected_data.as_ref().or(step.step_data.as_ref());

    let checklist = extract_checklist(effective_data);
    let defects = extract_string_array(effective_data, "defects");
    let environment = extract_key_values(effective_data, "environment");
    let zones = extract_zones(effective_data);
    let quality_scores = extract_key_values(effective_data, "quality_scores");
    let measurements_from_data = extract_key_values(effective_data, "measurements");

    // Also check step.measurements JSON
    let measurements_from_step = step
        .measurements
        .as_ref()
        .map(|m| json_to_key_values(m))
        .unwrap_or_default();

    let mut all_measurements = measurements_from_data;
    all_measurements.extend(measurements_from_step);

    // Validation data
    let validation_data = step
        .validation_data
        .as_ref()
        .map(|v| json_to_key_values(v))
        .unwrap_or_default();

    // Build observations list (merge step.observations + observations from collected_data)
    let mut observations = step.observations.clone().unwrap_or_default();
    let data_observations = extract_string_array(effective_data, "observations");
    for obs in data_observations {
        if !observations.contains(&obs) {
            observations.push(obs);
        }
    }

    // Quality score: prefer validation_score, fall back to quality_scores average
    let quality_score_str = if let Some(score) = step.validation_score {
        format!("{}/100", score)
    } else if !quality_scores.is_empty() {
        let scores_display: Vec<String> = quality_scores
            .iter()
            .map(|kv| format!("{}: {}", kv.key, kv.value))
            .collect();
        scores_display.join(", ")
    } else {
        NOT_EVALUATED.to_string()
    };

    ReportStep {
        id: step.id.clone(),
        title: step.title.clone().unwrap_or_else(|| step.step_name.clone()),
        number: step.step_number,
        status: step_status_label(&step.step_status),
        status_badge: step_status_badge(&step.step_status),
        started_at: timestamp_string_display(&step.started_at),
        completed_at: timestamp_string_display(&step.completed_at),
        duration: step
            .duration_seconds
            .map(|d| format_duration_seconds(d))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        photo_count: effective_photo_count,
        notes: step
            .notes
            .clone()
            .unwrap_or_else(|| NO_OBSERVATION.to_string()),
        checklist,
        defects,
        observations,
        measurements: all_measurements,
        environment,
        zones,
        quality_score: quality_score_str,
        validation_data,
        approval_data: ReportApproval {
            approved_by: step
                .approved_by
                .clone()
                .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
            approved_at: timestamp_string_display(&step.approved_at),
            rejection_reason: step.rejection_reason.clone().unwrap_or_default(),
        },
    }
}

// ---------------------------------------------------------------------------
// Quality section builder
// ---------------------------------------------------------------------------

fn build_quality_section(
    intervention: &Intervention,
    report_steps: &[ReportStep],
) -> ReportQuality {
    let global_score = intervention
        .quality_score
        .map(|s| format!("{}/100", s))
        .unwrap_or_else(|| NOT_EVALUATED.to_string());

    let checkpoints: Vec<ReportQualityCheckpoint> = report_steps
        .iter()
        .filter(|s| s.quality_score != NOT_EVALUATED)
        .map(|s| ReportQualityCheckpoint {
            step_name: s.title.clone(),
            step_status: s.status.clone(),
            score: s.quality_score.clone(),
        })
        .collect();

    let final_observations = intervention.final_observations.clone().unwrap_or_default();

    ReportQuality {
        global_quality_score: global_score,
        checkpoints,
        final_observations,
    }
}

// ---------------------------------------------------------------------------
// Photos section builder
// ---------------------------------------------------------------------------

fn build_photos_section(photos: &[Photo], steps: &[InterventionStep]) -> ReportPhotos {
    // Group by step
    let mut step_map: HashMap<String, usize> = HashMap::new();
    for step in steps {
        step_map.insert(step.step_name.clone(), 0);
    }
    for photo in photos {
        if let Some(step_num) = photo.step_number {
            if let Some(step) = steps.iter().find(|s| s.step_number == step_num) {
                *step_map.entry(step.step_name.clone()).or_insert(0) += 1;
            }
        } else if let Some(step_id) = &photo.step_id {
            if let Some(step) = steps.iter().find(|s| &s.id == step_id) {
                *step_map.entry(step.step_name.clone()).or_insert(0) += 1;
            }
        }
    }
    let grouped_by_step: Vec<ReportPhotoGroup> = step_map
        .into_iter()
        .map(|(label, count)| ReportPhotoGroup { label, count })
        .collect();

    // Group by category
    let mut cat_map: HashMap<String, usize> = HashMap::new();
    for photo in photos {
        let cat = photo
            .photo_category
            .as_ref()
            .map(|c| format!("{:?}", c))
            .unwrap_or_else(|| "Non categorise".to_string());
        *cat_map.entry(cat).or_insert(0) += 1;
    }
    let grouped_by_category: Vec<ReportPhotoGroup> = cat_map
        .into_iter()
        .map(|(label, count)| ReportPhotoGroup { label, count })
        .collect();

    ReportPhotos {
        total_count: photos.len(),
        grouped_by_step,
        grouped_by_category,
    }
}

// ---------------------------------------------------------------------------
// JSON extraction helpers
// ---------------------------------------------------------------------------

fn extract_checklist(data: Option<&serde_json::Value>) -> Vec<ReportChecklistItem> {
    let Some(data) = data else {
        return Vec::new();
    };
    let Some(obj) = data.get("checklist") else {
        return Vec::new();
    };
    match obj {
        serde_json::Value::Object(map) => map
            .iter()
            .map(|(k, v)| ReportChecklistItem {
                label: humanize_key(k),
                checked: v.as_bool().unwrap_or(false),
            })
            .collect(),
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|item| {
                item.as_str().map(|s| ReportChecklistItem {
                    label: s.to_string(),
                    checked: true,
                })
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn extract_string_array(data: Option<&serde_json::Value>, key: &str) -> Vec<String> {
    let Some(data) = data else {
        return Vec::new();
    };
    let Some(arr) = data.get(key) else {
        return Vec::new();
    };
    match arr {
        serde_json::Value::Array(items) => items
            .iter()
            .filter_map(|v| match v {
                serde_json::Value::String(s) => Some(s.clone()),
                other if !other.is_null() => Some(other.to_string()),
                _ => None,
            })
            .collect(),
        serde_json::Value::String(s) => vec![s.clone()],
        _ => Vec::new(),
    }
}

fn extract_key_values(data: Option<&serde_json::Value>, key: &str) -> Vec<ReportKeyValue> {
    let Some(data) = data else {
        return Vec::new();
    };
    let Some(value) = data.get(key) else {
        return Vec::new();
    };
    json_to_key_values(value)
}

fn extract_zones(data: Option<&serde_json::Value>) -> Vec<String> {
    // Try "zones" first, then "installation_zones"
    let mut result = extract_string_array(data, "zones");
    if result.is_empty() {
        result = extract_string_array(data, "installation_zones");
    }
    result
}

fn json_to_key_values(value: &serde_json::Value) -> Vec<ReportKeyValue> {
    match value {
        serde_json::Value::Object(obj) => obj
            .iter()
            .filter(|(_, v)| !v.is_null())
            .map(|(k, v)| ReportKeyValue {
                key: humanize_key(k),
                value: json_value_display(v),
            })
            .collect(),
        serde_json::Value::Null => Vec::new(),
        _ => Vec::new(),
    }
}

fn json_value_display(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Bool(b) => {
            if *b {
                "Oui".to_string()
            } else {
                "Non".to_string()
            }
        }
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Null => "-".to_string(),
        serde_json::Value::Array(arr) => arr
            .iter()
            .map(|v| json_value_display(v))
            .collect::<Vec<_>>()
            .join(", "),
        serde_json::Value::Object(_) => {
            // Flatten nested objects
            let kvs = json_to_key_values(value);
            kvs.iter()
                .map(|kv| format!("{}: {}", kv.key, kv.value))
                .collect::<Vec<_>>()
                .join(", ")
        }
    }
}

// ---------------------------------------------------------------------------
// Label / formatting helpers
// ---------------------------------------------------------------------------

/// TODO: document
pub fn humanize_key(key: &str) -> String {
    key.replace('_', " ")
        .replace('-', " ")
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(c) => {
                    let upper: String = c.to_uppercase().collect();
                    format!("{}{}", upper, chars.as_str())
                }
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn intervention_status_label(status: &InterventionStatus) -> String {
    match status {
        InterventionStatus::Completed => "Terminee".to_string(),
        InterventionStatus::InProgress => "En cours".to_string(),
        InterventionStatus::Pending => "En attente".to_string(),
        InterventionStatus::Paused => "En pause".to_string(),
        InterventionStatus::Cancelled => "Annulee".to_string(),
    }
}

fn intervention_status_badge(status: &InterventionStatus) -> String {
    match status {
        InterventionStatus::Completed => "[OK]".to_string(),
        InterventionStatus::InProgress => "[..]".to_string(),
        InterventionStatus::Pending => "[..]".to_string(),
        InterventionStatus::Paused => "[||]".to_string(),
        InterventionStatus::Cancelled => "[X]".to_string(),
    }
}

fn intervention_type_label(
    itype: &crate::domains::interventions::domain::models::intervention::InterventionType,
) -> String {
    use crate::domains::interventions::domain::models::intervention::InterventionType;
    match itype {
        InterventionType::Ppf => "PPF (Protection Film)".to_string(),
        InterventionType::Ceramic => "Ceramique".to_string(),
        InterventionType::Detailing => "Detailing".to_string(),
        InterventionType::Other => "Autre".to_string(),
    }
}

/// TODO: document
pub fn step_status_label(status: &StepStatus) -> String {
    match status {
        StepStatus::Completed => "Termine".to_string(),
        StepStatus::InProgress => "En cours".to_string(),
        StepStatus::Pending => "En attente".to_string(),
        StepStatus::Paused => "En pause".to_string(),
        StepStatus::Failed => "Echec".to_string(),
        StepStatus::Skipped => "Ignore".to_string(),
        StepStatus::Rework => "Retravail".to_string(),
    }
}

/// TODO: document
pub fn step_status_badge(status: &StepStatus) -> String {
    match status {
        StepStatus::Completed => "[OK]".to_string(),
        StepStatus::InProgress => "[..]".to_string(),
        StepStatus::Pending => "[..]".to_string(),
        StepStatus::Paused => "[||]".to_string(),
        StepStatus::Failed => "[X]".to_string(),
        StepStatus::Skipped => "[>>]".to_string(),
        StepStatus::Rework => "[RW]".to_string(),
    }
}

fn weather_label(w: &WeatherCondition) -> String {
    match w {
        WeatherCondition::Sunny => "Ensoleille".to_string(),
        WeatherCondition::Cloudy => "Nuageux".to_string(),
        WeatherCondition::Rainy => "Pluvieux".to_string(),
        WeatherCondition::Windy => "Venteux".to_string(),
        WeatherCondition::Foggy => "Brumeux".to_string(),
        WeatherCondition::Other => "Autre".to_string(),
    }
}

fn lighting_label(l: &LightingCondition) -> String {
    match l {
        LightingCondition::Natural => "Naturel".to_string(),
        LightingCondition::Artificial => "Artificiel".to_string(),
        LightingCondition::Mixed => "Mixte".to_string(),
    }
}

fn location_label(l: &WorkLocation) -> String {
    match l {
        WorkLocation::Indoor => "Interieur".to_string(),
        WorkLocation::Outdoor => "Exterieur".to_string(),
        WorkLocation::SemiCovered => "Semi-couvert".to_string(),
    }
}

fn film_type_label(f: &FilmType) -> String {
    match f {
        FilmType::Standard => "Standard".to_string(),
        FilmType::Premium => "Premium".to_string(),
        FilmType::Matte => "Mat".to_string(),
        FilmType::Colored => "Colore".to_string(),
    }
}

fn timestamp_string_display(ts: &TimestampString) -> String {
    match ts.0 {
        Some(millis) => {
            let dt = chrono::DateTime::from_timestamp_millis(millis)
                .or_else(|| chrono::DateTime::from_timestamp(millis, 0));
            match dt {
                Some(d) => d.format("%d/%m/%Y %H:%M").to_string(),
                None => NOT_SPECIFIED.to_string(),
            }
        }
        None => NOT_SPECIFIED.to_string(),
    }
}

fn format_duration_seconds(seconds: i32) -> String {
    if seconds < 60 {
        format!("{} sec", seconds)
    } else if seconds < 3600 {
        format!("{} min", seconds / 60)
    } else {
        let hours = seconds / 3600;
        let mins = (seconds % 3600) / 60;
        if mins > 0 {
            format!("{}h {:02}min", hours, mins)
        } else {
            format!("{}h", hours)
        }
    }
}

/// Convert score (0-100) to star rating string
pub fn score_to_stars(score: i32) -> String {
    let stars = (score as f32 / 20.0).round() as i32;
    "*".repeat(stars as usize)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::contracts::common::*;
    use crate::shared::services::cross_domain::{Intervention, InterventionStatus};
    use serde_json::json;

    fn build_test_intervention() -> Intervention {
        let now = now();
        Intervention {
            id: "test-intervention-001".to_string(),
            task_id: "task-001".to_string(),
            task_number: Some("T-001".to_string()),
            status: InterventionStatus::Completed,
            vehicle_plate: "AB-123-CD".to_string(),
            vehicle_model: Some("Model S".to_string()),
            vehicle_make: Some("Tesla".to_string()),
            vehicle_year: Some(2024),
            vehicle_color: Some("Noir".to_string()),
            vehicle_vin: Some("VIN123456".to_string()),
            client_id: None,
            client_name: Some("Client Test".to_string()),
            client_email: Some("client@test.com".to_string()),
            client_phone: Some("+33612345678".to_string()),
            technician_id: Some("tech-001".to_string()),
            technician_name: Some("Jean Dupont".to_string()),
            intervention_type:
                crate::domains::interventions::domain::models::intervention::InterventionType::Ppf,
            current_step: 4,
            completion_percentage: 100.0,
            estimated_duration: Some(120),
            actual_duration: Some(95),
            film_type: Some(FilmType::Premium),
            film_brand: Some("XPEL".to_string()),
            film_model: Some("Ultimate Plus".to_string()),
            ppf_zones_config: Some(vec!["Capot".to_string(), "Pare-chocs".to_string()]),
            ppf_zones_extended: None,
            weather_condition: Some(WeatherCondition::Sunny),
            lighting_condition: Some(LightingCondition::Natural),
            work_location: Some(WorkLocation::Indoor),
            temperature_celsius: Some(30.0),
            humidity_percentage: Some(43.0),
            start_location_lat: None,
            start_location_lon: None,
            start_location_accuracy: None,
            end_location_lat: None,
            end_location_lon: None,
            end_location_accuracy: None,
            customer_satisfaction: Some(9),
            quality_score: Some(88),
            final_observations: Some(vec!["Travail soigne".to_string()]),
            customer_signature: Some("base64sig".to_string()),
            customer_comments: Some("Tres satisfait".to_string()),
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
            started_at: TimestampString::new(Some(now)),
            completed_at: TimestampString::new(Some(now)),
            scheduled_at: TimestampString::new(None),
            paused_at: TimestampString::new(None),
        }
    }

    fn build_test_steps() -> Vec<InterventionStep> {
        use crate::domains::interventions::domain::models::step::{StepStatus, StepType};

        let mut inspection = InterventionStep::new(
            "test-intervention-001".to_string(),
            1,
            "Inspection".to_string(),
            StepType::Inspection,
        );
        inspection.step_status = StepStatus::Completed;
        inspection.duration_seconds = Some(600);
        inspection.photo_count = 3;
        inspection.notes = Some("Surface propre, quelques micro-rayures".to_string());
        inspection.observations = Some(vec![
            "Micro-rayures sur le capot".to_string(),
            "Peinture en bon etat general".to_string(),
        ]);
        inspection.collected_data = Some(json!({
            "checklist": {"wash": true, "clay_bar": true, "ipa_wipe": true},
            "defects": ["rayure legere"],
            "environment": {"temperature": 30, "humidity": 43}
        }));
        inspection.validation_score = Some(90);

        let preparation = InterventionStep::new(
            "test-intervention-001".to_string(),
            2,
            "Preparation".to_string(),
            StepType::Preparation,
        );
        // Pending status — must still appear in the report

        let mut installation = InterventionStep::new(
            "test-intervention-001".to_string(),
            3,
            "Installation".to_string(),
            StepType::Installation,
        );
        installation.step_status = StepStatus::Completed;
        installation.duration_seconds = Some(3600);
        installation.photo_count = 8;
        installation.notes = Some("Installation terminee avec succes".to_string());
        installation.collected_data = Some(json!({
            "zones": ["full_front", "full_vehicle"],
            "quality_scores": {"full_front": 10, "full_vehicle": 8.5}
        }));
        installation.validation_score = Some(92);

        let mut finalization = InterventionStep::new(
            "test-intervention-001".to_string(),
            4,
            "Finalisation".to_string(),
            StepType::Finalization,
        );
        finalization.step_status = StepStatus::Completed;
        finalization.duration_seconds = Some(300);
        finalization.validation_score = Some(88);

        vec![inspection, preparation, installation, finalization]
    }

    // -----------------------------------------------------------------------
    // View model builder tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_vm_includes_all_four_steps() {
        let intervention = build_test_intervention();
        let steps = build_test_steps();
        let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

        assert_eq!(vm.steps.len(), 4);
        assert_eq!(vm.steps[0].title, "Inspection");
        assert_eq!(vm.steps[1].title, "Preparation");
        assert_eq!(vm.steps[2].title, "Installation");
        assert_eq!(vm.steps[3].title, "Finalisation");
    }

    #[test]
    fn test_vm_pending_step_preserved() {
        let intervention = build_test_intervention();
        let steps = build_test_steps();
        let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

        let prep = &vm.steps[1];
        assert_eq!(prep.status, "En attente");
        assert_eq!(prep.status_badge, "[..]");
    }

    #[test]
    fn test_vm_inspection_details() {
        let intervention = build_test_intervention();
        let steps = build_test_steps();
        let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

        let inspection = &vm.steps[0];
        // Defects from collected_data
        assert!(inspection.defects.contains(&"rayure legere".to_string()));
        // Environment from collected_data
        assert!(!inspection.environment.is_empty());
        let temp_kv = inspection
            .environment
            .iter()
            .find(|kv| kv.key == "Temperature");
        assert!(temp_kv.is_some());
        assert_eq!(temp_kv.unwrap().value, "30");

        let hum_kv = inspection
            .environment
            .iter()
            .find(|kv| kv.key == "Humidity");
        assert!(hum_kv.is_some());
        assert_eq!(hum_kv.unwrap().value, "43");

        // Observations
        assert!(inspection.observations.len() >= 2);
        // Checklist
        assert_eq!(inspection.checklist.len(), 3);
        // Quality score
        assert_eq!(inspection.quality_score, "90/100");
    }

    #[test]
    fn test_vm_installation_details() {
        let intervention = build_test_intervention();
        let steps = build_test_steps();
        let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

        let installation = &vm.steps[2];
        // Zones from collected_data
        assert!(installation.zones.contains(&"full_front".to_string()));
        assert!(installation.zones.contains(&"full_vehicle".to_string()));
        // Quality score
        assert_eq!(installation.quality_score, "92/100");
        // Notes
        assert!(installation.notes.contains("Installation"));
    }

    #[test]
    fn test_vm_normalizes_null_fields() {
        let mut intervention = build_test_intervention();
        intervention.technician_name = None;
        intervention.customer_signature = None;
        intervention.customer_satisfaction = None;
        intervention.quality_score = None;
        intervention.final_observations = None;
        intervention.customer_comments = None;
        intervention.weather_condition = None;
        intervention.lighting_condition = None;
        intervention.work_location = None;
        intervention.temperature_celsius = None;
        intervention.humidity_percentage = None;
        intervention.film_type = None;
        intervention.film_brand = None;
        intervention.film_model = None;
        intervention.estimated_duration = None;
        intervention.actual_duration = None;

        let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

        assert_eq!(vm.summary.technician_name, "Non assigne");
        assert!(!vm.customer_validation.signature_present);
        assert_eq!(vm.customer_validation.satisfaction, NOT_EVALUATED);
        assert_eq!(vm.quality.global_quality_score, NOT_EVALUATED);
        assert_eq!(vm.work_conditions.weather, NOT_SPECIFIED);
        assert_eq!(vm.materials.film_type, NOT_SPECIFIED);
        assert_eq!(vm.summary.estimated_duration, NOT_SPECIFIED);
        assert_eq!(vm.summary.actual_duration, NOT_SPECIFIED);
    }

    #[test]
    fn test_vm_client_from_intervention_denormalized() {
        let intervention = build_test_intervention();
        let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

        // Without a Client object, falls back to intervention denormalized fields
        assert_eq!(vm.client.name, "Client Test");
        assert_eq!(vm.client.email, "client@test.com");
    }

    #[test]
    fn test_vm_client_from_client_object() {
        let intervention = build_test_intervention();
        let client = Client {
            id: "c-001".to_string(),
            name: "Entreprise ABC".to_string(),
            email: Some("abc@corp.com".to_string()),
            phone: Some("+33700000000".to_string()),
            customer_type: crate::domains::clients::client_handler::CustomerType::Business,
            address_street: None,
            address_city: None,
            address_state: None,
            address_zip: None,
            address_country: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
            total_tasks: 0,
            active_tasks: 0,
            completed_tasks: 0,
            last_task_date: None,
            created_at: 0,
            updated_at: 0,
            created_by: None,
            deleted_at: None,
            deleted_by: None,
            synced: false,
            last_synced_at: None,
        };
        let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], Some(&client));

        assert_eq!(vm.client.name, "Entreprise ABC");
        assert_eq!(vm.client.email, "abc@corp.com");
        assert_eq!(vm.client.phone, "+33700000000");
    }

    #[test]
    fn test_vm_meta_fields() {
        let intervention = build_test_intervention();
        let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

        assert_eq!(vm.meta.intervention_id, "test-intervention-001");
        assert_eq!(vm.meta.task_number, "T-001");
        assert_eq!(vm.meta.report_title, "Rapport d'intervention PPF");
        assert!(!vm.meta.generated_at.is_empty());
    }

    #[test]
    fn test_vm_summary_fields() {
        let intervention = build_test_intervention();
        let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

        assert_eq!(vm.summary.status, "Terminee");
        assert_eq!(vm.summary.status_badge, "[OK]");
        assert_eq!(vm.summary.technician_name, "Jean Dupont");
        assert_eq!(vm.summary.estimated_duration, "120 min");
        assert_eq!(vm.summary.actual_duration, "95 min");
        assert_eq!(vm.summary.completion_percentage, 100.0);
        assert_eq!(vm.summary.intervention_type, "PPF (Protection Film)");
    }

    #[test]
    fn test_vm_quality_section() {
        let intervention = build_test_intervention();
        let steps = build_test_steps();
        let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

        assert_eq!(vm.quality.global_quality_score, "88/100");
        // Steps with quality scores: Inspection (90), Installation (92), Finalization (88)
        assert_eq!(vm.quality.checkpoints.len(), 3);
        assert_eq!(vm.quality.final_observations.len(), 1);
        assert_eq!(vm.quality.final_observations[0], "Travail soigne");
    }

    #[test]
    fn test_vm_customer_validation() {
        let intervention = build_test_intervention();
        let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

        assert_eq!(vm.customer_validation.satisfaction, "9/10");
        assert!(vm.customer_validation.signature_present);
        assert_eq!(vm.customer_validation.comments, "Tres satisfait");
    }

    #[test]
    fn test_vm_vehicle_fields() {
        let intervention = build_test_intervention();
        let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

        assert_eq!(vm.vehicle.plate, "AB-123-CD");
        assert_eq!(vm.vehicle.make, "Tesla");
        assert_eq!(vm.vehicle.model, "Model S");
        assert_eq!(vm.vehicle.year, "2024");
        assert_eq!(vm.vehicle.color, "Noir");
        assert_eq!(vm.vehicle.vin, "VIN123456");
    }

    #[test]
    fn test_vm_work_conditions() {
        let intervention = build_test_intervention();
        let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

        assert_eq!(vm.work_conditions.weather, "Ensoleille");
        assert_eq!(vm.work_conditions.lighting, "Naturel");
        assert_eq!(vm.work_conditions.location, "Interieur");
        assert_eq!(vm.work_conditions.temperature, "30.0 C");
        assert_eq!(vm.work_conditions.humidity, "43.0%");
    }

    #[test]
    fn test_humanize_key_function() {
        assert_eq!(humanize_key("checklist"), "Checklist");
        assert_eq!(humanize_key("quality_scores"), "Quality Scores");
        assert_eq!(humanize_key("installation_zones"), "Installation Zones");
        assert_eq!(humanize_key(""), "");
    }

    #[test]
    fn test_score_to_stars_function() {
        assert_eq!(score_to_stars(100), "*****");
        assert_eq!(score_to_stars(80), "****");
        assert_eq!(score_to_stars(0), "");
    }

    #[test]
    fn test_format_duration_seconds_function() {
        assert_eq!(format_duration_seconds(30), "30 sec");
        assert_eq!(format_duration_seconds(600), "10 min");
        assert_eq!(format_duration_seconds(3600), "1h");
        assert_eq!(format_duration_seconds(3900), "1h 05min");
    }

    #[test]
    fn test_extract_checklist_from_json() {
        let data = json!({
            "checklist": {"wash": true, "clay_bar": true, "ipa_wipe": false}
        });
        let result = extract_checklist(Some(&data));
        assert_eq!(result.len(), 3);
        let wash = result.iter().find(|c| c.label == "Wash");
        assert!(wash.is_some());
        assert!(wash.unwrap().checked);
    }

    #[test]
    fn test_extract_string_array_from_json() {
        let data = json!({"defects": ["rayure legere", "impact"]});
        let result = extract_string_array(Some(&data), "defects");
        assert_eq!(result.len(), 2);
        assert!(result.contains(&"rayure legere".to_string()));
    }

    #[test]
    fn test_extract_zones_from_json() {
        let data = json!({"zones": ["full_front", "full_vehicle"]});
        let result = extract_zones(Some(&data));
        assert_eq!(result.len(), 2);
        assert!(result.contains(&"full_front".to_string()));
    }

    #[test]
    fn test_extract_zones_fallback_installation_zones() {
        let data = json!({"installation_zones": ["hood", "bumper"]});
        let result = extract_zones(Some(&data));
        assert_eq!(result.len(), 2);
        assert!(result.contains(&"hood".to_string()));
    }
}
