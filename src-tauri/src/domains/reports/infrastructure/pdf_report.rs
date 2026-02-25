//! Comprehensive PDF Report Generation Service
//!
//! This module provides professional PDF report generation for PPF interventions
//! using genpdf library for automatic pagination and better layout management.

use crate::commands::AppResult;
use crate::domains::clients::domain::models::client::Client;
use crate::domains::documents::domain::models::photo::Photo;
use crate::domains::interventions::domain::models::intervention::InterventionStatus;
use crate::domains::interventions::domain::models::step::InterventionStep;
use crate::domains::interventions::domain::models::step::StepStatus;
use crate::shared::contracts::common::*;

use chrono::Utc;
use genpdf::{elements, fonts, style, Alignment, Document, Element, SimplePageDecorator};
use std::path::Path;

/// Comprehensive PDF report generator for PPF interventions
pub struct InterventionPdfReport {
    intervention: crate::domains::interventions::domain::models::intervention::Intervention,
    steps: Vec<InterventionStep>,
    photos: Vec<Photo>,
    materials: Vec<crate::domains::inventory::domain::models::material::MaterialConsumption>,
    client: Option<Client>,
}

impl InterventionPdfReport {
    /// Create a new PDF report instance
    pub fn new(
        intervention: crate::domains::interventions::domain::models::intervention::Intervention,
        steps: Vec<InterventionStep>,
        photos: Vec<Photo>,
        materials: Vec<crate::domains::inventory::domain::models::material::MaterialConsumption>,
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

        // Create a new document with system fonts
        tracing::info!("Loading system fonts for PDF generation");
        let font_family = fonts::from_files("./fonts", "LiberationSans", None)
            .or_else(|_| {
                tracing::warn!("Custom fonts not found, trying Windows fonts");
                fonts::from_files("C:\\Windows\\Fonts", "Arial", None)
            })
            .or_else(|_| {
                tracing::warn!("Windows fonts not found, trying Linux fonts");
                fonts::from_files("/usr/share/fonts", "LiberationSans", None)
            })
            .or_else(|_| {
                tracing::warn!("Linux fonts not found, trying macOS fonts");
                fonts::from_files("/System/Library/Fonts", "Arial", None)
            })
            .map_err(|e| {
                crate::commands::AppError::Internal(format!("Failed to load any fonts: {}", e))
            })?;

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

        // Status with emoji
        let status_text = match self.intervention.status {
            InterventionStatus::Completed => "✅ Terminée",
            InterventionStatus::InProgress => "[..] En cours",
            InterventionStatus::Pending => "[..] En attente",
            InterventionStatus::Paused => "[||] En pause",
            InterventionStatus::Cancelled => "[X] Annulee",
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
                WeatherCondition::Sunny => "Ensoleille",
                WeatherCondition::Cloudy => "Nuageux",
                WeatherCondition::Rainy => "Pluvieux",
                WeatherCondition::Windy => "💨 Venteux",
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
                WorkLocation::Indoor => "Interieur",
                WorkLocation::Outdoor => "Exterieur",
                WorkLocation::SemiCovered => "⛺ Semi-couvert",
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

        for step in &self.steps {
            let status_icon = match step.step_status {
                StepStatus::Completed => "✅",
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

            // Duration
            if let Some(duration) = step.duration_seconds {
                doc.push(elements::Paragraph::new(&format!(
                    "Durée: {} secondes",
                    duration
                )));
            }

            // Photo count
            if step.photo_count > 0 {
                doc.push(elements::Paragraph::new(&format!(
                    "Photos: {}",
                    step.photo_count
                )));
            }

            // Quality score with stars
            if let Some(score) = step.validation_score {
                let stars = Self::score_to_stars(score);
                doc.push(elements::Paragraph::new(&format!(
                    "Validation: {} ({}/100)",
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
            elements::Paragraph::new("CONTROLE QUALITE")
                .styled(style::Style::new().bold().with_font_size(16)),
        );

        doc.push(elements::Break::new(0.5));

        if let Some(score) = self.intervention.quality_score {
            let stars = Self::score_to_stars(score);
            doc.push(elements::Paragraph::new(&format!(
                "Score qualité global: {} ({}/100)",
                stars, score
            )));
        }

        if let Some(satisfaction) = self.intervention.customer_satisfaction {
            let stars = Self::score_to_stars(satisfaction * 10); // Convert to 0-100 scale
            doc.push(elements::Paragraph::new(&format!(
                "Satisfaction client: {} ({}/10)",
                stars, satisfaction
            )));
        }

        if let Some(observations) = &self.intervention.final_observations {
            if !observations.is_empty() {
                doc.push(
                    elements::Paragraph::new("Observations finales:")
                        .styled(style::Style::new().bold()),
                );
                for obs in observations {
                    doc.push(elements::Paragraph::new(obs));
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
            doc.push(elements::Paragraph::new("✅ Signée électroniquement"));
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

    /// Helper function to convert score to star rating
    fn score_to_stars(score: i32) -> String {
        let stars = (score as f32 / 20.0).round() as i32; // Convert to 0-5 scale
        "*".repeat(stars as usize)
    }

    /// Helper function to convert step status to text
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

    /// Test function to create a minimal PDF for debugging
    pub async fn test_generate_minimal(output_path: &Path) -> AppResult<()> {
        tracing::info!("Testing minimal PDF generation");

        let font_family = fonts::from_files("./fonts", "LiberationSans", None)
            .or_else(|_| fonts::from_files("C:\\Windows\\Fonts", "Arial", None))
            .or_else(|_| fonts::from_files("/usr/share/fonts", "LiberationSans", None))
            .or_else(|_| fonts::from_files("/System/Library/Fonts", "Arial", None))
            .map_err(|e| {
                crate::commands::AppError::Internal(format!("Failed to load fonts: {}", e))
            })?;

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
