//! Label and formatting helpers for the report view model.

use crate::shared::contracts::common::*;
use crate::shared::services::cross_domain::{InterventionStatus, StepStatus};

// ---------------------------------------------------------------------------
// Constants (shared with mod.rs via pub(super))
// ---------------------------------------------------------------------------

pub(super) const NOT_SPECIFIED: &str = "Non renseigne";
pub(super) const NO_OBSERVATION: &str = "Aucune observation";
pub(super) const NOT_EVALUATED: &str = "Non evalue";
pub(super) const NO_DATA: &str = "Aucune donnee";

// ---------------------------------------------------------------------------
// Public helpers (called from report_pdf.rs tests via super::*  re-exports)
// ---------------------------------------------------------------------------

/// Converts a snake_case or kebab-case key into a human-readable label.
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

fn normalize_lookup_key(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .replace(['-', ' '], "_")
}

fn fallback_display_label(value: &str) -> String {
    let normalized = value.trim().replace(['_', '-'], " ");
    normalized
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(c) => {
                    let upper: String = c.to_uppercase().collect();
                    format!("{}{}", upper, chars.as_str().to_lowercase())
                }
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn looks_french(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return false;
    }
    trimmed.chars().any(|c| c.is_lowercase()) && !trimmed.contains('_') && !trimmed.contains('-')
}

pub fn checklist_label(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    match normalize_lookup_key(trimmed).as_str() {
        "clean_dry" => "Surface propre et sèche".to_string(),
        "client_informed" | "client_briefed" => "Client informé".to_string(),
        "defects_logged" => "Défauts enregistrés".to_string(),
        "film_ready" => "Film prêt".to_string(),
        "humidity_ok" => "Humidité conforme".to_string(),
        "temp_ok" => "Température conforme".to_string(),
        "alignment_ok" => "Alignement conforme".to_string(),
        "clean_finish" => "Finition propre".to_string(),
        "edges_sealed" => "Bords scellés".to_string(),
        "no_bubbles" => "Aucune bulle".to_string(),
        "smooth_surface" => "Surface lisse".to_string(),
        "wash" => "Lavage effectué".to_string(),
        "clay_bar" => "Décontamination à la clay".to_string(),
        "ipa_wipe" => "Nettoyage IPA".to_string(),
        _ if looks_french(trimmed) => trimmed.to_string(),
        _ => fallback_display_label(trimmed),
    }
}

pub fn defect_type_label(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    match normalize_lookup_key(trimmed).as_str() {
        "scratch" => "Rayure".to_string(),
        "dent" => "Bosse".to_string(),
        "bubble" => "Bulle".to_string(),
        "contamination" => "Contamination".to_string(),
        "peeling" => "Décollement".to_string(),
        "lift" | "edge_lift" => "Relèvement".to_string(),
        _ if looks_french(trimmed) => trimmed.to_string(),
        _ => fallback_display_label(trimmed),
    }
}

pub fn severity_label(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    match normalize_lookup_key(trimmed).as_str() {
        "high" => "Élevé".to_string(),
        "medium" => "Moyen".to_string(),
        "low" => "Faible".to_string(),
        "critical" => "Critique".to_string(),
        _ if looks_french(trimmed) => trimmed.to_string(),
        _ => fallback_display_label(trimmed),
    }
}

pub fn workflow_status_label(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    match normalize_lookup_key(trimmed).as_str() {
        "completed" => "Terminé".to_string(),
        "in_progress" | "inprogress" => "En cours".to_string(),
        "pending" => "En attente".to_string(),
        "paused" => "En pause".to_string(),
        "failed" => "Échec".to_string(),
        "cancelled" | "canceled" => "Annulé".to_string(),
        "archived" => "Archivé".to_string(),
        "rejected" => "Rejeté".to_string(),
        "skipped" => "Ignoré".to_string(),
        "rework" => "Retravail".to_string(),
        _ if looks_french(trimmed) => trimmed.to_string(),
        _ => fallback_display_label(trimmed),
    }
}

pub fn zone_label(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    match normalize_lookup_key(trimmed).as_str() {
        "front_bumper" | "bumper" => "Pare-chocs avant".to_string(),
        "rear_bumper" => "Pare-chocs arrière".to_string(),
        "hood" => "Capot".to_string(),
        "roof" => "Toit".to_string(),
        "trunk" => "Coffre".to_string(),
        "full_front" => "Face avant complète".to_string(),
        "full_vehicle" => "Véhicule complet".to_string(),
        "front_left_fender" => "Aile avant gauche".to_string(),
        "front_right_fender" => "Aile avant droite".to_string(),
        "rear_left_fender" => "Aile arrière gauche".to_string(),
        "rear_right_fender" => "Aile arrière droite".to_string(),
        "left_door" => "Porte gauche".to_string(),
        "right_door" => "Porte droite".to_string(),
        _ if looks_french(trimmed) => trimmed.to_string(),
        _ => fallback_display_label(trimmed),
    }
}

/// TODO: document
pub fn step_status_label(status: &StepStatus) -> String {
    match status {
        StepStatus::Completed => "Terminé".to_string(),
        StepStatus::InProgress => "En cours".to_string(),
        StepStatus::Pending => "En attente".to_string(),
        StepStatus::Paused => "En pause".to_string(),
        StepStatus::Failed => "Échec".to_string(),
        StepStatus::Skipped => "Ignoré".to_string(),
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

/// Convert score (0-100) to star rating string.
pub fn score_to_stars(score: i32) -> String {
    let stars = (score as f32 / 20.0).round() as i32;
    "*".repeat(stars as usize)
}

// ---------------------------------------------------------------------------
// Private helpers (pub(super) so builders.rs can use them)
// ---------------------------------------------------------------------------

pub(super) fn intervention_status_label(status: &InterventionStatus) -> String {
    match status {
        InterventionStatus::Completed => "Terminée".to_string(),
        InterventionStatus::InProgress => "En cours".to_string(),
        InterventionStatus::Pending => "En attente".to_string(),
        InterventionStatus::Paused => "En pause".to_string(),
        InterventionStatus::Cancelled => "Annulée".to_string(),
        InterventionStatus::Archived => "Archivée".to_string(),
    }
}

pub(super) fn intervention_status_badge(status: &InterventionStatus) -> String {
    match status {
        InterventionStatus::Completed => "[OK]".to_string(),
        InterventionStatus::InProgress => "[..]".to_string(),
        InterventionStatus::Pending => "[..]".to_string(),
        InterventionStatus::Paused => "[||]".to_string(),
        InterventionStatus::Cancelled => "[X]".to_string(),
        InterventionStatus::Archived => "[A]".to_string(),
    }
}

pub(super) fn intervention_type_label(
    itype: &crate::shared::services::cross_domain::InterventionType,
) -> String {
    use crate::shared::services::cross_domain::InterventionType;
    match itype {
        InterventionType::Ppf => "PPF (Protection Film)".to_string(),
        InterventionType::Ceramic => "Ceramique".to_string(),
        InterventionType::Detailing => "Detailing".to_string(),
        InterventionType::Other => "Autre".to_string(),
    }
}

pub(super) fn weather_label(w: &WeatherCondition) -> String {
    match w {
        WeatherCondition::Sunny => "Ensoleille".to_string(),
        WeatherCondition::Cloudy => "Nuageux".to_string(),
        WeatherCondition::Rainy => "Pluvieux".to_string(),
        WeatherCondition::Windy => "Venteux".to_string(),
        WeatherCondition::Foggy => "Brumeux".to_string(),
        WeatherCondition::Other => "Autre".to_string(),
    }
}

pub(super) fn lighting_label(l: &LightingCondition) -> String {
    match l {
        LightingCondition::Natural => "Naturel".to_string(),
        LightingCondition::Artificial => "Artificiel".to_string(),
        LightingCondition::Mixed => "Mixte".to_string(),
    }
}

pub(super) fn location_label(l: &WorkLocation) -> String {
    match l {
        WorkLocation::Indoor => "Interieur".to_string(),
        WorkLocation::Outdoor => "Exterieur".to_string(),
        WorkLocation::SemiCovered => "Semi-couvert".to_string(),
    }
}

pub(super) fn film_type_label(f: &FilmType) -> String {
    match f {
        FilmType::Standard => "Standard".to_string(),
        FilmType::Premium => "Premium".to_string(),
        FilmType::Matte => "Mat".to_string(),
        FilmType::Colored => "Colore".to_string(),
    }
}

pub(super) fn timestamp_string_display(ts: &TimestampString) -> String {
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

pub(super) fn format_duration_seconds(seconds: i32) -> String {
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
