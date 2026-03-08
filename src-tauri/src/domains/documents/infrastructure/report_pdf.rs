//! Comprehensive PDF Report Generation Service
//!
//! This module provides professional PDF report generation for PPF interventions
//! using genpdf library for automatic pagination and better layout management.

use crate::commands::AppResult;
use crate::shared::contracts::common::*;
use crate::shared::services::cross_domain::Client;
use crate::shared::services::cross_domain::InterventionStatus;
use crate::shared::services::cross_domain::InterventionStep;
use crate::shared::services::cross_domain::Photo;
use crate::shared::services::cross_domain::StepStatus;

use chrono::Utc;
use genpdf::{elements, fonts, style, Alignment, Document, Element, SimplePageDecorator};
use std::path::Path;

/// Comprehensive PDF report generator for PPF interventions
pub struct InterventionPdfReport {
    intervention: crate::shared::services::cross_domain::Intervention,
    steps: Vec<InterventionStep>,
    photos: Vec<Photo>,
    materials: Vec<crate::shared::services::cross_domain::MaterialConsumption>,
    client: Option<Client>,
}

impl InterventionPdfReport {
    /// Create a new PDF report instance
    pub fn new(
        intervention: crate::shared::services::cross_domain::Intervention,
        steps: Vec<InterventionStep>,
        photos: Vec<Photo>,
        materials: Vec<crate::shared::services::cross_domain::MaterialConsumption>,
        client: Option<Client>,
    ) -> Self {
        Self {
            intervention,
            steps,
            photos,
            materials,
            client,
        }
    }

    /// Generate the PDF report
    pub async fn generate(&self, output_path: &Path) -> AppResult<()> {
        tracing::info!(
            "Starting PDF generation for intervention: {}",
            self.intervention.id
        );

        // Create a new document with bundled or system fonts.
        // We resolve the fonts/ directory relative to the running binary so it works
        // both during development and in a production install.
        tracing::info!("Loading fonts for PDF generation");

        let font_family = Self::load_fonts()?;

        let mut doc = Document::new(font_family);
        doc.set_title("Rapport d'Intervention PPF");

        // Set up page decorator
        let mut decorator = SimplePageDecorator::new();
        decorator.set_margins(20);
        doc.set_page_decorator(decorator);

        tracing::info!(
            "Adding PDF sections for intervention: {}",
            self.intervention.id
        );

        // Add all report sections
        self.add_title_page(&mut doc);
        self.add_intervention_summary(&mut doc);
        self.add_client_section(&mut doc);
        self.add_vehicle_section(&mut doc);
        self.add_work_conditions(&mut doc);
        self.add_materials_section(&mut doc);
        self.add_workflow_steps(&mut doc);
        self.add_quality_control(&mut doc);
        self.add_photo_documentation(&mut doc);
        self.add_customer_validation(&mut doc);
        self.add_footer(&mut doc);

        // Ensure output directory exists
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                crate::commands::AppError::Internal(format!(
                    "Failed to create output directory: {}",
                    e
                ))
            })?;
        }

        tracing::info!("Rendering PDF to file: {:?}", output_path);

        // Render the document
        match doc.render_to_file(output_path) {
            Ok(_) => {
                tracing::info!(
                    "Successfully generated PDF report for intervention: {}",
                    self.intervention.id
                );
                Ok(())
            }
            Err(e) => {
                tracing::error!(
                    "Failed to render PDF for intervention {}: {}",
                    self.intervention.id,
                    e
                );
                Err(crate::commands::AppError::Internal(format!(
                    "Failed to render PDF: {}",
                    e
                )))
            }
        }
    }
}

impl InterventionPdfReport {
    /// Add title page
    fn add_title_page(&self, doc: &mut Document) {
        doc.push(elements::Break::new(2.0));

        doc.push(
            elements::Paragraph::new("RAPPORT D'INTERVENTION PPF")
                .aligned(Alignment::Center)
                .styled(style::Style::new().bold().with_font_size(20)),
        );

        doc.push(elements::Break::new(2.0));

        doc.push(
            elements::Paragraph::new(&format!("Intervention ID: {}", self.intervention.id))
                .aligned(Alignment::Center),
        );

        doc.push(
            elements::Paragraph::new(&format!(
                "Généré le: {}",
                Utc::now().format("%d/%m/%Y %H:%M")
            ))
            .aligned(Alignment::Center),
        );

        doc.push(elements::Break::new(3.0));
    }

    /// Add intervention summary section
    fn add_intervention_summary(&self, doc: &mut Document) {
        doc.push(
            elements::Paragraph::new("RÉSUMÉ DE L'INTERVENTION")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        // Status
        let status_text = match self.intervention.status {
            InterventionStatus::Completed => "[OK] Terminée",
            InterventionStatus::InProgress => "[..] En cours",
            InterventionStatus::Pending => "[..] En attente",
            InterventionStatus::Paused => "[||] En pause",
            InterventionStatus::Cancelled => "[X] Annulée",
        };

        doc.push(elements::Paragraph::new(&format!(
            "Statut: {}",
            status_text
        )));

        // Technician
        let technician_text = self
            .intervention
            .technician_name
            .as_ref()
            .map(|name| name.as_str())
            .unwrap_or("Non assigné");
        doc.push(elements::Paragraph::new(&format!(
            "Technicien: {}",
            technician_text
        )));

        // Duration information
        if let Some(actual) = self.intervention.actual_duration {
            doc.push(elements::Paragraph::new(&format!(
                "Durée réelle: {} minutes",
                actual
            )));
        }
        if let Some(estimated) = self.intervention.estimated_duration {
            doc.push(elements::Paragraph::new(&format!(
                "Durée estimée: {} minutes",
                estimated
            )));
        }

        // Quality score with stars
        if let Some(score) = self.intervention.quality_score {
            let stars = Self::score_to_stars(score);
            doc.push(elements::Paragraph::new(&format!(
                "Score qualité: {} ({}/100)",
                stars, score
            )));
        }

        // Completion percentage
        doc.push(elements::Paragraph::new(&format!(
            "Progression: {:.1}%",
            self.intervention.completion_percentage
        )));

        doc.push(elements::Break::new(1.0));
    }

    /// Add client information section (only if client data exists)
    fn add_client_section(&self, doc: &mut Document) {
        if let Some(client) = &self.client {
            doc.push(
                elements::Paragraph::new("INFORMATIONS CLIENT")
                    .styled(style::Style::new().bold().with_font_size(16)),
            );

            doc.push(elements::Break::new(0.5));

            doc.push(elements::Paragraph::new(&format!("Nom: {}", client.name)));

            if let Some(email) = &client.email {
                doc.push(elements::Paragraph::new(&format!("Email: {}", email)));
            }

            if let Some(phone) = &client.phone {
                doc.push(elements::Paragraph::new(&format!("Téléphone: {}", phone)));
            }

            doc.push(elements::Break::new(1.0));
        }
    }

    /// Add vehicle information section
    fn add_vehicle_section(&self, doc: &mut Document) {
        doc.push(
            elements::Paragraph::new("INFORMATIONS VÉHICULE")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        doc.push(elements::Paragraph::new(&format!(
            "Plaque: {}",
            self.intervention.vehicle_plate
        )));

        if let Some(make) = &self.intervention.vehicle_make {
            if let Some(model) = &self.intervention.vehicle_model {
                doc.push(elements::Paragraph::new(&format!(
                    "Modèle: {} {}",
                    make, model
                )));
            } else {
                doc.push(elements::Paragraph::new(&format!("Marque: {}", make)));
            }
        }

        if let Some(year) = self.intervention.vehicle_year {
            doc.push(elements::Paragraph::new(&format!("Année: {}", year)));
        }

        if let Some(vin) = &self.intervention.vehicle_vin {
            doc.push(elements::Paragraph::new(&format!("VIN: {}", vin)));
        }

        if let Some(color) = &self.intervention.vehicle_color {
            doc.push(elements::Paragraph::new(&format!("Couleur: {}", color)));
        }

        doc.push(elements::Break::new(1.0));
    }

    /// Add work conditions section
    fn add_work_conditions(&self, doc: &mut Document) {
        doc.push(
            elements::Paragraph::new("CONDITIONS DE TRAVAIL")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        if let Some(weather) = &self.intervention.weather_condition {
            let weather_text = match weather {
                WeatherCondition::Sunny => "Ensoleillé",
                WeatherCondition::Cloudy => "Nuageux",
                WeatherCondition::Rainy => "Pluvieux",
                WeatherCondition::Windy => "Venteux",
                WeatherCondition::Foggy => "Brumeux",
                WeatherCondition::Other => "Autre",
            };
            doc.push(elements::Paragraph::new(&format!(
                "Météo: {}",
                weather_text
            )));
        }

        if let Some(lighting) = &self.intervention.lighting_condition {
            let lighting_text = match lighting {
                LightingCondition::Natural => "Naturel",
                LightingCondition::Artificial => "Artificiel",
                LightingCondition::Mixed => "Mixte",
            };
            doc.push(elements::Paragraph::new(&format!(
                "Éclairage: {}",
                lighting_text
            )));
        }

        if let Some(location) = &self.intervention.work_location {
            let location_text = match location {
                WorkLocation::Indoor => "Intérieur",
                WorkLocation::Outdoor => "Extérieur",
                WorkLocation::SemiCovered => "Semi-couvert",
            };
            doc.push(elements::Paragraph::new(&format!(
                "Lieu: {}",
                location_text
            )));
        }

        if let Some(temp) = self.intervention.temperature_celsius {
            doc.push(elements::Paragraph::new(&format!(
                "Température: {:.1}°C",
                temp
            )));
        }

        if let Some(humidity) = self.intervention.humidity_percentage {
            doc.push(elements::Paragraph::new(&format!(
                "Humidité: {:.1}%",
                humidity
            )));
        }

        doc.push(elements::Break::new(1.0));
    }

    /// Add materials section
    fn add_materials_section(&self, doc: &mut Document) {
        doc.push(
            elements::Paragraph::new("MATÉRIAUX UTILISÉS")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        if let Some(film_type) = &self.intervention.film_type {
            let film_text = match film_type {
                FilmType::Standard => "Standard",
                FilmType::Premium => "Premium",
                FilmType::Matte => "Mat",
                FilmType::Colored => "Coloré",
            };
            doc.push(elements::Paragraph::new(&format!(
                "Type de film: {}",
                film_text
            )));
        }

        if let Some(brand) = &self.intervention.film_brand {
            doc.push(elements::Paragraph::new(&format!("Marque: {}", brand)));
        }

        if let Some(model) = &self.intervention.film_model {
            doc.push(elements::Paragraph::new(&format!("Modèle: {}", model)));
        }

        if let Some(zones) = &self.intervention.ppf_zones_config {
            if !zones.is_empty() {
                doc.push(elements::Paragraph::new(&format!(
                    "Zones traitées: {}",
                    zones.join(", ")
                )));
            }
        }

        // Materials consumption table would go here
        // For now, just show total count
        doc.push(elements::Paragraph::new(&format!(
            "Consommations enregistrées: {}",
            self.materials.len()
        )));

        doc.push(elements::Break::new(1.0));
    }

    /// Add workflow steps section (ALL steps, no truncation)
    fn add_workflow_steps(&self, doc: &mut Document) {
        doc.push(
            elements::Paragraph::new("ÉTAPES DU WORKFLOW")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        if self.steps.is_empty() {
            doc.push(elements::Paragraph::new(
                "Aucune étape enregistrée pour cette intervention.",
            ));
            doc.push(elements::Break::new(1.0));
            return;
        }

        for step in &self.steps {
            let status_icon = match step.step_status {
                StepStatus::Completed => "[OK]",
                StepStatus::InProgress => "[..]",
                StepStatus::Pending => "[..]",
                StepStatus::Paused => "[||]",
                StepStatus::Failed => "[X]",
                StepStatus::Skipped => "[>>]",
                StepStatus::Rework => "[..]",
            };

            let step_header = format!(
                "Étape {}: {} - {} {}",
                step.step_number,
                step.step_name,
                status_icon,
                Self::step_status_to_text(&step.step_status)
            );

            doc.push(elements::Paragraph::new(&step_header).styled(style::Style::new().bold()));

            // Description
            if let Some(description) = &step.description {
                if !description.is_empty() {
                    doc.push(elements::Paragraph::new(&format!(
                        "  Description: {}",
                        description
                    )));
                }
            }

            // Duration
            if let Some(duration) = step.duration_seconds {
                doc.push(elements::Paragraph::new(&format!(
                    "  Durée: {} secondes",
                    duration
                )));
            }

            // Photo count
            if step.photo_count > 0 {
                doc.push(elements::Paragraph::new(&format!(
                    "  Photos: {}",
                    step.photo_count
                )));
            }

            // Notes
            if let Some(notes) = &step.notes {
                if !notes.is_empty() {
                    doc.push(elements::Paragraph::new(&format!("  Notes: {}", notes)));
                }
            }

            // Observations
            if let Some(observations) = &step.observations {
                if !observations.is_empty() {
                    doc.push(
                        elements::Paragraph::new("  Observations:")
                            .styled(style::Style::new().italic()),
                    );
                    for obs in observations {
                        doc.push(elements::Paragraph::new(&format!("    - {}", obs)));
                    }
                }
            }

            // Quality checkpoints
            if let Some(checkpoints) = &step.quality_checkpoints {
                if !checkpoints.is_empty() {
                    doc.push(
                        elements::Paragraph::new("  Points de contrôle qualité:")
                            .styled(style::Style::new().italic()),
                    );
                    for checkpoint in checkpoints {
                        doc.push(elements::Paragraph::new(&format!(
                            "    - {}",
                            checkpoint
                        )));
                    }
                }
            }

            // Collected data / step data (effective data)
            let effective_data = step
                .collected_data
                .as_ref()
                .or(step.step_data.as_ref());
            if let Some(data) = effective_data {
                Self::render_step_data_section(doc, data);
            }

            // Measurements
            if let Some(measurements) = &step.measurements {
                if !measurements.is_null() {
                    doc.push(
                        elements::Paragraph::new("  Mesures:")
                            .styled(style::Style::new().italic()),
                    );
                    Self::render_json_flat(doc, measurements, 2);
                }
            }

            // Validation data
            if let Some(validation_data) = &step.validation_data {
                if !validation_data.is_null() {
                    doc.push(
                        elements::Paragraph::new("  Données de validation:")
                            .styled(style::Style::new().italic()),
                    );
                    Self::render_json_flat(doc, validation_data, 2);
                }
            }

            // Validation errors
            if let Some(errors) = &step.validation_errors {
                if !errors.is_empty() {
                    doc.push(
                        elements::Paragraph::new("  Erreurs de validation:")
                            .styled(style::Style::new().italic()),
                    );
                    for err in errors {
                        doc.push(elements::Paragraph::new(&format!("    - {}", err)));
                    }
                }
            }

            // Quality score with stars
            if let Some(score) = step.validation_score {
                let stars = Self::score_to_stars(score);
                doc.push(elements::Paragraph::new(&format!(
                    "  Validation: {} ({}/100)",
                    stars, score
                )));
            }

            doc.push(elements::Break::new(0.3));
        }

        doc.push(elements::Break::new(1.0));
    }

    /// Add quality control section
    fn add_quality_control(&self, doc: &mut Document) {
        doc.push(
            elements::Paragraph::new("CONTRÔLE QUALITÉ")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        if let Some(score) = self.intervention.quality_score {
            let stars = Self::score_to_stars(score);
            doc.push(elements::Paragraph::new(&format!(
                "Score qualité global: {} ({}/100)",
                stars, score
            )));
        } else {
            doc.push(elements::Paragraph::new(
                "Score qualité global: Non évalué",
            ));
        }

        if let Some(satisfaction) = self.intervention.customer_satisfaction {
            let stars = Self::score_to_stars(satisfaction * 10); // Convert to 0-100 scale
            doc.push(elements::Paragraph::new(&format!(
                "Satisfaction client: {} ({}/10)",
                stars, satisfaction
            )));
        } else {
            doc.push(elements::Paragraph::new(
                "Satisfaction client: Non évaluée",
            ));
        }

        // Per-step quality summary
        let steps_with_score: Vec<_> = self
            .steps
            .iter()
            .filter(|s| s.validation_score.is_some())
            .collect();
        if !steps_with_score.is_empty() {
            doc.push(
                elements::Paragraph::new("Scores par étape:")
                    .styled(style::Style::new().bold()),
            );
            for step in &steps_with_score {
                if let Some(score) = step.validation_score {
                    let stars = Self::score_to_stars(score);
                    doc.push(elements::Paragraph::new(&format!(
                        "  {} ({}): {} ({}/100)",
                        step.step_name,
                        Self::step_status_to_text(&step.step_status),
                        stars,
                        score
                    )));
                }
            }
        }

        if let Some(observations) = &self.intervention.final_observations {
            if !observations.is_empty() {
                doc.push(
                    elements::Paragraph::new("Observations finales:")
                        .styled(style::Style::new().bold()),
                );
                for obs in observations {
                    doc.push(elements::Paragraph::new(&format!("  - {}", obs)));
                }
            }
        }

        doc.push(elements::Break::new(1.0));
    }

    /// Add photo documentation section
    fn add_photo_documentation(&self, doc: &mut Document) {
        doc.push(
            elements::Paragraph::new("DOCUMENTATION PHOTOS")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        doc.push(elements::Paragraph::new(&format!(
            "Nombre total de photos: {}",
            self.photos.len()
        )));

        // Count by category
        let mut category_counts = std::collections::HashMap::new();
        for photo in &self.photos {
            let category = photo
                .photo_category
                .as_ref()
                .map(|c| format!("{:?}", c))
                .unwrap_or_else(|| "Non catégorisé".to_string());
            *category_counts.entry(category).or_insert(0) += 1;
        }

        for (category, count) in category_counts {
            doc.push(elements::Paragraph::new(&format!(
                "{}: {}",
                category, count
            )));
        }

        // GPS data summary
        let with_gps = self
            .photos
            .iter()
            .filter(|p| p.gps_location_lat.is_some())
            .count();
        if with_gps > 0 {
            doc.push(elements::Paragraph::new(&format!(
                "Photos avec géolocalisation: {}",
                with_gps
            )));
        }

        doc.push(elements::Break::new(1.0));
    }

    /// Add customer validation section
    fn add_customer_validation(&self, doc: &mut Document) {
        doc.push(
            elements::Paragraph::new("VALIDATION CLIENT")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        if let Some(comments) = &self.intervention.customer_comments {
            doc.push(elements::Paragraph::new("Commentaires:").styled(style::Style::new().bold()));
            doc.push(elements::Paragraph::new(comments));
        }

        if self.intervention.customer_signature.is_some() {
            doc.push(elements::Paragraph::new("[OK] Signée électroniquement"));
        }

        doc.push(elements::Break::new(1.0));
    }

    /// Add footer
    fn add_footer(&self, doc: &mut Document) {
        doc.push(elements::Break::new(2.0));

        doc.push(
            elements::Paragraph::new(&format!(
                "Rapport généré le: {}",
                Utc::now().format("%d/%m/%Y %H:%M:%S")
            ))
            .aligned(Alignment::Center),
        );

        doc.push(
            elements::Paragraph::new("Application RPMA PPF Intervention")
                .aligned(Alignment::Center),
        );
    }

    /// Render step data section from collected_data/step_data JSON.
    ///
    /// Extracts known meaningful keys (checklist, defects, environment, zones,
    /// quality, issues) and renders them as labeled sub-sections.  Remaining
    /// unknown keys are rendered as flat key-value pairs.
    fn render_step_data_section(doc: &mut Document, data: &serde_json::Value) {
        if data.is_null() {
            return;
        }

        if let Some(obj) = data.as_object() {
            if obj.is_empty() {
                return;
            }

            doc.push(
                elements::Paragraph::new("  Données collectées:")
                    .styled(style::Style::new().italic()),
            );

            // Known structured keys
            let structured_keys = [
                "checklist",
                "defects",
                "environment",
                "zones",
                "installation_zones",
                "quality",
                "quality_scores",
                "issues",
            ];

            for key in &structured_keys {
                if let Some(value) = obj.get(*key) {
                    if !value.is_null() {
                        let label = Self::humanize_key(key);
                        doc.push(
                            elements::Paragraph::new(&format!("    {}:", label))
                                .styled(style::Style::new().italic()),
                        );
                        Self::render_json_flat(doc, value, 3);
                    }
                }
            }

            // Remaining keys
            for (key, value) in obj {
                if structured_keys.contains(&key.as_str()) || value.is_null() {
                    continue;
                }
                let label = Self::humanize_key(key);
                match value {
                    serde_json::Value::Object(_) | serde_json::Value::Array(_) => {
                        doc.push(
                            elements::Paragraph::new(&format!("    {}:", label))
                                .styled(style::Style::new().italic()),
                        );
                        Self::render_json_flat(doc, value, 3);
                    }
                    _ => {
                        doc.push(elements::Paragraph::new(&format!(
                            "    {}: {}",
                            label,
                            Self::json_value_to_string(value)
                        )));
                    }
                }
            }
        } else {
            // Non-object data (array or scalar)
            doc.push(
                elements::Paragraph::new("  Données collectées:")
                    .styled(style::Style::new().italic()),
            );
            Self::render_json_flat(doc, data, 2);
        }
    }

    /// Render a JSON value as flat indented text in the document.
    fn render_json_flat(doc: &mut Document, value: &serde_json::Value, indent_level: usize) {
        let indent = "  ".repeat(indent_level);
        match value {
            serde_json::Value::Object(obj) => {
                for (k, v) in obj {
                    if v.is_null() {
                        continue;
                    }
                    let label = Self::humanize_key(k);
                    match v {
                        serde_json::Value::Object(_) | serde_json::Value::Array(_) => {
                            doc.push(elements::Paragraph::new(&format!("{}{}:", indent, label)));
                            Self::render_json_flat(doc, v, indent_level + 1);
                        }
                        _ => {
                            doc.push(elements::Paragraph::new(&format!(
                                "{}{}: {}",
                                indent,
                                label,
                                Self::json_value_to_string(v)
                            )));
                        }
                    }
                }
            }
            serde_json::Value::Array(arr) => {
                for item in arr {
                    if item.is_null() {
                        continue;
                    }
                    match item {
                        serde_json::Value::Object(_) => {
                            Self::render_json_flat(doc, item, indent_level);
                        }
                        _ => {
                            doc.push(elements::Paragraph::new(&format!(
                                "{}- {}",
                                indent,
                                Self::json_value_to_string(item)
                            )));
                        }
                    }
                }
            }
            _ => {
                doc.push(elements::Paragraph::new(&format!(
                    "{}{}",
                    indent,
                    Self::json_value_to_string(value)
                )));
            }
        }
    }

    /// Convert a JSON value to a human-readable string.
    fn json_value_to_string(value: &serde_json::Value) -> String {
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
            _ => value.to_string(),
        }
    }

    /// Convert a snake_case or camelCase key to a human-readable label.
    fn humanize_key(key: &str) -> String {
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

    /// Convert score (0-100) to star rating string
    fn score_to_stars(score: i32) -> String {
        let stars = (score as f32 / 20.0).round() as i32; // Convert to 0-5 scale
        "*".repeat(stars as usize)
    }

    /// Convert step status to French label
    fn step_status_to_text(status: &StepStatus) -> &'static str {
        match status {
            StepStatus::Completed => "Terminé",
            StepStatus::InProgress => "En cours",
            StepStatus::Pending => "En attente",
            StepStatus::Paused => "En pause",
            StepStatus::Failed => "Échec",
            StepStatus::Skipped => "Ignoré",
            StepStatus::Rework => "Retravail",
        }
    }

    /// Load the best available font family for PDF generation.
    ///
    /// Search order:
    ///   1. `fonts/` directory next to the running binary (bundled LiberationSans)
    ///   2. `fonts/` two levels up from the binary (covers `target/debug/` builds)
    ///   3. Windows system fonts (`C:\Windows\Fonts`) with the correct Windows TTF filenames
    ///      copied to a temp dir with genpdf-expected naming.
    ///   4. Common Linux font directories.
    ///   5. macOS system fonts.
    fn load_fonts() -> AppResult<fonts::FontFamily<fonts::FontData>> {
        // 1 & 2 — bundled fonts next to or near the executable
        if let Ok(exe_path) = std::env::current_exe() {
            // Level 1: next to the binary (production install)
            if let Some(exe_dir) = exe_path.parent() {
                let candidate = exe_dir.join("fonts");
                if let Ok(family) = fonts::from_files(&candidate, "LiberationSans", None) {
                    tracing::info!("Loaded bundled fonts from {:?}", candidate);
                    return Ok(family);
                }
                // Level 2: two levels up — covers `target/debug/` or `target/release/`
                if let Some(parent2) = exe_dir.parent() {
                    if let Some(parent3) = parent2.parent() {
                        let candidate2 = parent3.join("fonts");
                        if let Ok(family) = fonts::from_files(&candidate2, "LiberationSans", None) {
                            tracing::info!("Loaded bundled fonts from {:?}", candidate2);
                            return Ok(family);
                        }
                        // Also try src-tauri/fonts (one more level up in workspace layout)
                        if let Some(parent4) = parent3.parent() {
                            let candidate3 = parent4.join("src-tauri").join("fonts");
                            if let Ok(family) = fonts::from_files(&candidate3, "LiberationSans", None) {
                                tracing::info!("Loaded bundled fonts from {:?}", candidate3);
                                return Ok(family);
                            }
                        }
                    }
                }
            }
        }

        // 3 — Windows: copy arial* fonts to a temp dir with genpdf-expected names
        #[cfg(target_os = "windows")]
        {
            let windows_fonts = std::path::Path::new("C:\\Windows\\Fonts");
            if windows_fonts.is_dir() {
                // Try to create a temp dir with the renamed fonts
                if let Ok(tmp) = std::env::temp_dir().join("rpma_fonts").try_exists().map(|_| std::env::temp_dir().join("rpma_fonts")) {
                    let _ = std::fs::create_dir_all(&tmp);
                    let mapping = [
                        ("arial.ttf",   "LiberationSans-Regular.ttf"),
                        ("arialbd.ttf", "LiberationSans-Bold.ttf"),
                        ("ariali.ttf",  "LiberationSans-Italic.ttf"),
                        ("arialbi.ttf", "LiberationSans-BoldItalic.ttf"),
                    ];
                    let mut all_ok = true;
                    for (src, dst) in &mapping {
                        let dst_path = tmp.join(dst);
                        if !dst_path.exists() {
                            if std::fs::copy(windows_fonts.join(src), &dst_path).is_err() {
                                all_ok = false;
                                break;
                            }
                        }
                    }
                    if all_ok {
                        if let Ok(family) = fonts::from_files(&tmp, "LiberationSans", None) {
                            tracing::info!("Loaded fonts from Windows temp dir {:?}", tmp);
                            return Ok(family);
                        }
                    }
                }
            }
        }

        // 4 — Linux system fonts
        for linux_dir in &["/usr/share/fonts/truetype/liberation", "/usr/share/fonts", "/usr/local/share/fonts"] {
            if let Ok(family) = fonts::from_files(linux_dir, "LiberationSans", None) {
                tracing::info!("Loaded fonts from {:?}", linux_dir);
                return Ok(family);
            }
        }

        // 5 — macOS system fonts
        for mac_dir in &["/Library/Fonts", "/System/Library/Fonts/Supplemental", "/System/Library/Fonts"] {
            if let Ok(family) = fonts::from_files(mac_dir, "Arial", None) {
                tracing::info!("Loaded fonts from {:?}", mac_dir);
                return Ok(family);
            }
        }

        Err(crate::commands::AppError::Internal(
            "Failed to load fonts for PDF generation. \
             Please ensure the bundled fonts/ directory is present next to the application executable."
                .to_string(),
        ))
    }

    /// Test function to create a minimal PDF for debugging
    pub async fn test_generate_minimal(output_path: &Path) -> AppResult<()> {
        tracing::info!("Testing minimal PDF generation");

        let font_family = Self::load_fonts()?;

        let mut doc = Document::new(font_family);
        doc.set_title("Test PDF");

        let mut decorator = SimplePageDecorator::new();
        decorator.set_margins(20);
        doc.set_page_decorator(decorator);

        // Add minimal content
        doc.push(elements::Paragraph::new("Test PDF Generation"));
        doc.push(elements::Break::new(1.0));
        doc.push(elements::Paragraph::new(
            "This is a test PDF to verify genpdf works.",
        ));

        // Ensure output directory exists
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                crate::commands::AppError::Internal(format!(
                    "Failed to create output directory: {}",
                    e
                ))
            })?;
        }

        doc.render_to_file(output_path).map_err(|e| {
            crate::commands::AppError::Internal(format!("Failed to render test PDF: {}", e))
        })?;

        tracing::info!("Successfully generated test PDF");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::contracts::common::*;
    use crate::shared::services::cross_domain::{Intervention, InterventionStatus};
    use serde_json::json;

    /// Build a minimal Intervention with required fields and all optional fields set to None.
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
            client_name: None,
            client_email: None,
            client_phone: None,
            technician_id: Some("tech-001".to_string()),
            technician_name: Some("Jean Dupont".to_string()),
            intervention_type: crate::domains::interventions::domain::models::intervention::InterventionType::Ppf,
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
            temperature_celsius: Some(22.5),
            humidity_percentage: Some(45.0),
            start_location_lat: None,
            start_location_lon: None,
            start_location_accuracy: None,
            end_location_lat: None,
            end_location_lon: None,
            end_location_accuracy: None,
            customer_satisfaction: Some(9),
            quality_score: Some(88),
            final_observations: Some(vec!["Travail soigné".to_string()]),
            customer_signature: Some("base64sig".to_string()),
            customer_comments: Some("Très satisfait".to_string()),
            metadata: None,
            notes: None,
            device_info: None,
            created_at: now,
            updated_at: now,
            started_at: TimestampString::new(Some(now)),
            completed_at: TimestampString::new(Some(now)),
        }
    }

    /// Build a set of 4 workflow steps (Inspection, Préparation, Installation, Finalisation).
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
            "Peinture en bon état général".to_string(),
        ]);
        inspection.collected_data = Some(json!({
            "checklist": {"wash": true, "clay_bar": true, "ipa_wipe": true},
            "defects": ["micro-rayures capot"],
            "environment": {"temperature": 22.5, "humidity": 45}
        }));
        inspection.validation_score = Some(90);

        let preparation = InterventionStep::new(
            "test-intervention-001".to_string(),
            2,
            "Préparation".to_string(),
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
        installation.collected_data = Some(json!({
            "zones": ["Capot", "Pare-chocs avant", "Ailes avant"],
            "quality_scores": {"capot": 95, "pare_chocs": 90, "ailes": 92}
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

    #[test]
    fn test_humanize_key() {
        assert_eq!(
            InterventionPdfReport::humanize_key("checklist"),
            "Checklist"
        );
        assert_eq!(
            InterventionPdfReport::humanize_key("quality_scores"),
            "Quality Scores"
        );
        assert_eq!(
            InterventionPdfReport::humanize_key("installation_zones"),
            "Installation Zones"
        );
        assert_eq!(InterventionPdfReport::humanize_key(""), "");
    }

    #[test]
    fn test_json_value_to_string() {
        assert_eq!(
            InterventionPdfReport::json_value_to_string(&json!("hello")),
            "hello"
        );
        assert_eq!(
            InterventionPdfReport::json_value_to_string(&json!(true)),
            "Oui"
        );
        assert_eq!(
            InterventionPdfReport::json_value_to_string(&json!(false)),
            "Non"
        );
        assert_eq!(
            InterventionPdfReport::json_value_to_string(&json!(42)),
            "42"
        );
        assert_eq!(
            InterventionPdfReport::json_value_to_string(&json!(null)),
            "-"
        );
    }

    #[test]
    fn test_score_to_stars() {
        assert_eq!(InterventionPdfReport::score_to_stars(100), "*****");
        assert_eq!(InterventionPdfReport::score_to_stars(80), "****");
        assert_eq!(InterventionPdfReport::score_to_stars(0), "");
    }

    #[test]
    fn test_step_status_to_text_all_variants() {
        assert_eq!(
            InterventionPdfReport::step_status_to_text(&StepStatus::Completed),
            "Terminé"
        );
        assert_eq!(
            InterventionPdfReport::step_status_to_text(&StepStatus::Pending),
            "En attente"
        );
        assert_eq!(
            InterventionPdfReport::step_status_to_text(&StepStatus::InProgress),
            "En cours"
        );
        assert_eq!(
            InterventionPdfReport::step_status_to_text(&StepStatus::Failed),
            "Échec"
        );
    }

    #[test]
    fn test_report_new_with_all_null_optional_fields() {
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
        intervention.ppf_zones_config = None;
        intervention.actual_duration = None;
        intervention.estimated_duration = None;

        let report = InterventionPdfReport::new(
            intervention,
            Vec::new(),
            Vec::new(),
            Vec::new(),
            None,
        );

        // Must not panic — all None fields handled safely
        assert!(report.steps.is_empty());
    }

    #[test]
    fn test_report_includes_all_four_steps() {
        let intervention = build_test_intervention();
        let steps = build_test_steps();

        assert_eq!(steps.len(), 4);
        assert_eq!(steps[0].step_name, "Inspection");
        assert_eq!(steps[1].step_name, "Préparation");
        assert_eq!(steps[1].step_status, StepStatus::Pending);
        assert_eq!(steps[2].step_name, "Installation");
        assert_eq!(steps[3].step_name, "Finalisation");

        let report = InterventionPdfReport::new(
            intervention,
            steps,
            Vec::new(),
            Vec::new(),
            None,
        );

        assert_eq!(report.steps.len(), 4);
    }

    #[test]
    fn test_step_detail_data_present() {
        let steps = build_test_steps();

        // Inspection step has collected_data with checklist, defects, environment
        let inspection = &steps[0];
        assert!(inspection.collected_data.is_some());
        let data = inspection.collected_data.as_ref().unwrap();
        assert!(data.get("checklist").is_some());
        assert!(data.get("defects").is_some());
        assert!(data.get("environment").is_some());

        // Installation step has zones and quality_scores
        let installation = &steps[2];
        assert!(installation.collected_data.is_some());
        let data = installation.collected_data.as_ref().unwrap();
        assert!(data.get("zones").is_some());
        assert!(data.get("quality_scores").is_some());
    }

    #[tokio::test]
    async fn test_generate_full_report_no_crash() {
        // Skip if fonts are not available (CI environments)
        if InterventionPdfReport::load_fonts().is_err() {
            eprintln!("Skipping PDF generation test: fonts not available");
            return;
        }

        let intervention = build_test_intervention();
        let steps = build_test_steps();

        let report = InterventionPdfReport::new(
            intervention,
            steps,
            Vec::new(),
            Vec::new(),
            None,
        );

        let tmp_dir = std::env::temp_dir().join("rpma_test_pdf");
        std::fs::create_dir_all(&tmp_dir).unwrap();
        let output_path = tmp_dir.join("test_full_report.pdf");

        let result = report.generate(&output_path).await;
        assert!(result.is_ok(), "PDF generation failed: {:?}", result.err());

        // Verify file was created and has content
        let metadata = std::fs::metadata(&output_path).unwrap();
        assert!(metadata.len() > 0, "Generated PDF is empty");

        // Clean up
        let _ = std::fs::remove_file(&output_path);
    }

    #[tokio::test]
    async fn test_generate_report_with_all_nulls_no_crash() {
        if InterventionPdfReport::load_fonts().is_err() {
            eprintln!("Skipping PDF generation test: fonts not available");
            return;
        }

        let mut intervention = build_test_intervention();
        intervention.technician_name = None;
        intervention.customer_signature = None;
        intervention.customer_satisfaction = None;
        intervention.quality_score = None;
        intervention.final_observations = None;
        intervention.customer_comments = None;

        let report = InterventionPdfReport::new(
            intervention,
            Vec::new(),
            Vec::new(),
            Vec::new(),
            None,
        );

        let tmp_dir = std::env::temp_dir().join("rpma_test_pdf");
        std::fs::create_dir_all(&tmp_dir).unwrap();
        let output_path = tmp_dir.join("test_null_report.pdf");

        let result = report.generate(&output_path).await;
        assert!(result.is_ok(), "PDF generation with nulls failed: {:?}", result.err());

        let _ = std::fs::remove_file(&output_path);
    }

    #[tokio::test]
    async fn test_generate_report_with_pending_step() {
        if InterventionPdfReport::load_fonts().is_err() {
            eprintln!("Skipping PDF generation test: fonts not available");
            return;
        }

        let mut intervention = build_test_intervention();
        intervention.status = InterventionStatus::InProgress;

        // Only a single pending step
        let pending_step = InterventionStep::new(
            "test-intervention-001".to_string(),
            1,
            "Préparation".to_string(),
            crate::domains::interventions::domain::models::step::StepType::Preparation,
        );

        let report = InterventionPdfReport::new(
            intervention,
            vec![pending_step],
            Vec::new(),
            Vec::new(),
            None,
        );

        let tmp_dir = std::env::temp_dir().join("rpma_test_pdf");
        std::fs::create_dir_all(&tmp_dir).unwrap();
        let output_path = tmp_dir.join("test_pending_report.pdf");

        let result = report.generate(&output_path).await;
        assert!(result.is_ok(), "PDF with pending step failed: {:?}", result.err());

        let _ = std::fs::remove_file(&output_path);
    }
}
