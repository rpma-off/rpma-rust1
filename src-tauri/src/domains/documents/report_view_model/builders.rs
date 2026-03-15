//! Step, quality section, and photos section builders.

use std::collections::HashMap;

use crate::shared::services::cross_domain::{Intervention, InterventionStep, Photo};

use super::extractors::{
    extract_checklist, extract_key_values, extract_string_array, extract_zones, json_to_key_values,
};
use super::formatters::{
    format_duration_seconds, step_status_badge, step_status_label, timestamp_string_display,
    NOT_EVALUATED, NO_OBSERVATION, NOT_SPECIFIED,
};
use super::{
    ReportApproval, ReportPhotos, ReportPhotoGroup, ReportQuality, ReportQualityCheckpoint,
    ReportStep,
};

pub(super) fn build_report_step(step: &InterventionStep, photos: &[Photo]) -> ReportStep {
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

pub(super) fn build_quality_section(
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

pub(super) fn build_photos_section(
    photos: &[Photo],
    steps: &[InterventionStep],
) -> ReportPhotos {
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
