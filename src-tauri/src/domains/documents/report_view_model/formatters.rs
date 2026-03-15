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
        InterventionStatus::Completed => "Terminee".to_string(),
        InterventionStatus::InProgress => "En cours".to_string(),
        InterventionStatus::Pending => "En attente".to_string(),
        InterventionStatus::Paused => "En pause".to_string(),
        InterventionStatus::Cancelled => "Annulee".to_string(),
    }
}

pub(super) fn intervention_status_badge(status: &InterventionStatus) -> String {
    match status {
        InterventionStatus::Completed => "[OK]".to_string(),
        InterventionStatus::InProgress => "[..]".to_string(),
        InterventionStatus::Pending => "[..]".to_string(),
        InterventionStatus::Paused => "[||]".to_string(),
        InterventionStatus::Cancelled => "[X]".to_string(),
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
