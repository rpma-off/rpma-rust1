//! Comprehensive PDF Report Generation Service
//!
//! This module provides professional PDF report generation for PPF interventions
//! using genpdf library for automatic pagination and better layout management.
//!
//! The template consumes a [`ReportViewModel`] built by
//! [`build_intervention_report_view_model`] — **no** business logic or data
//! merging happens here.

use crate::commands::AppResult;
use crate::shared::services::cross_domain::Client;
use crate::shared::services::cross_domain::InterventionStep;
use crate::shared::services::cross_domain::Photo;

use super::report_view_model::{
    build_intervention_report_view_model, score_to_stars, ReportStep, ReportViewModel,
};

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

        // ---- 1. Build the view model (data layer) ----
        let vm = build_intervention_report_view_model(
            &self.intervention,
            &self.steps,
            &self.photos,
            &self.materials,
            self.client.as_ref(),
        );

        // ---- 2. Render the PDF (template layer) ----
        tracing::info!("Loading fonts for PDF generation");
        let font_family = Self::load_fonts()?;

        let mut doc = Document::new(font_family);
        doc.set_title("Rapport d'Intervention PPF");

        let mut decorator = SimplePageDecorator::new();
        decorator.set_margins(20);
        doc.set_page_decorator(decorator);

        tracing::info!(
            "Adding PDF sections for intervention: {}",
            self.intervention.id
        );

        // Render all report sections from the view model
        Self::render_header(&mut doc, &vm);
        Self::render_summary(&mut doc, &vm);
        Self::render_client_and_vehicle(&mut doc, &vm);
        Self::render_work_conditions(&mut doc, &vm);
        Self::render_materials(&mut doc, &vm);
        Self::render_workflow_steps(&mut doc, &vm);
        Self::render_quality_and_validation(&mut doc, &vm);
        Self::render_photos(&mut doc, &vm);
        Self::render_footer(&mut doc, &vm);

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

// ---------------------------------------------------------------------------
// Pure rendering methods — no data logic, only layout
// ---------------------------------------------------------------------------

impl InterventionPdfReport {
    // -- Helpers for section separators & styled text --

    fn section_title(doc: &mut Document, title: &str) {
        doc.push(elements::Break::new(0.8));
        doc.push(
            elements::Paragraph::new(title)
                .styled(style::Style::new().bold().with_font_size(14)),
        );
        // Thin rule below the title (simulated with a line of underscores)
        doc.push(
            elements::Paragraph::new("________________________________________")
                .styled(style::Style::new().with_font_size(6)),
        );
        doc.push(elements::Break::new(0.3));
    }

    fn label_value(doc: &mut Document, label: &str, value: &str) {
        doc.push(elements::Paragraph::new(&format!("{}: {}", label, value)));
    }

    fn label_value_bold(doc: &mut Document, label: &str, value: &str) {
        doc.push(elements::Paragraph::new(&format!("{}: {}", label, value))
            .styled(style::Style::new().bold()));
    }

    // -- 1. Header / title page --

    fn render_header(doc: &mut Document, vm: &ReportViewModel) {
        doc.push(elements::Break::new(1.5));

        doc.push(
            elements::Paragraph::new(&vm.meta.report_title.to_uppercase())
                .aligned(Alignment::Center)
                .styled(style::Style::new().bold().with_font_size(20)),
        );

        doc.push(elements::Break::new(1.0));

        doc.push(
            elements::Paragraph::new(&format!(
                "Intervention: {}",
                vm.meta.intervention_id
            ))
            .aligned(Alignment::Center)
            .styled(style::Style::new().with_font_size(10)),
        );

        if vm.meta.task_number != vm.display.placeholder_not_specified {
            doc.push(
                elements::Paragraph::new(&format!(
                    "Tache: {}",
                    vm.meta.task_number
                ))
                .aligned(Alignment::Center)
                .styled(style::Style::new().with_font_size(10)),
            );
        }

        doc.push(
            elements::Paragraph::new(&format!(
                "Genere le: {}",
                vm.meta.generated_at
            ))
            .aligned(Alignment::Center)
            .styled(style::Style::new().with_font_size(10)),
        );

        doc.push(elements::Break::new(2.0));
    }

    // -- 2. Summary --

    fn render_summary(doc: &mut Document, vm: &ReportViewModel) {
        Self::section_title(doc, "RESUME DE L'INTERVENTION");

        Self::label_value_bold(
            doc,
            "Statut",
            &format!("{} {}", vm.summary.status_badge, vm.summary.status),
        );
        Self::label_value(doc, "Technicien", &vm.summary.technician_name);
        Self::label_value(doc, "Type", &vm.summary.intervention_type);
        Self::label_value(doc, "Duree estimee", &vm.summary.estimated_duration);
        Self::label_value(doc, "Duree reelle", &vm.summary.actual_duration);
        Self::label_value(
            doc,
            "Progression",
            &format!("{:.1}%", vm.summary.completion_percentage),
        );

        doc.push(elements::Break::new(0.5));
    }

    // -- 3. Client & Vehicle (side-by-side conceptually; genpdf has limited columns) --

    fn render_client_and_vehicle(doc: &mut Document, vm: &ReportViewModel) {
        Self::section_title(doc, "CLIENT");
        Self::label_value(doc, "Nom", &vm.client.name);
        Self::label_value(doc, "Email", &vm.client.email);
        Self::label_value(doc, "Telephone", &vm.client.phone);

        Self::section_title(doc, "VEHICULE");
        Self::label_value(doc, "Plaque", &vm.vehicle.plate);
        Self::label_value(doc, "Marque", &vm.vehicle.make);
        Self::label_value(doc, "Modele", &vm.vehicle.model);
        Self::label_value(doc, "Annee", &vm.vehicle.year);
        Self::label_value(doc, "Couleur", &vm.vehicle.color);
        Self::label_value(doc, "VIN", &vm.vehicle.vin);

        doc.push(elements::Break::new(0.5));
    }

    // -- 4. Work conditions --

    fn render_work_conditions(doc: &mut Document, vm: &ReportViewModel) {
        Self::section_title(doc, "CONDITIONS DE TRAVAIL");
        Self::label_value(doc, "Meteo", &vm.work_conditions.weather);
        Self::label_value(doc, "Eclairage", &vm.work_conditions.lighting);
        Self::label_value(doc, "Lieu", &vm.work_conditions.location);
        Self::label_value(doc, "Temperature", &vm.work_conditions.temperature);
        Self::label_value(doc, "Humidite", &vm.work_conditions.humidity);
        doc.push(elements::Break::new(0.5));
    }

    // -- 5. Materials --

    fn render_materials(doc: &mut Document, vm: &ReportViewModel) {
        Self::section_title(doc, "MATERIAUX UTILISES");
        Self::label_value(doc, "Type de film", &vm.materials.film_type);
        Self::label_value(doc, "Marque", &vm.materials.film_brand);
        Self::label_value(doc, "Modele", &vm.materials.film_model);

        if !vm.materials.consumptions.is_empty() {
            doc.push(
                elements::Paragraph::new(&format!(
                    "Consommations enregistrees: {}",
                    vm.materials.consumptions.len()
                ))
                .styled(style::Style::new().italic()),
            );
            for c in &vm.materials.consumptions {
                doc.push(elements::Paragraph::new(&format!(
                    "  - {} | Qte: {:.2} | Cout: {} | Dechets: {:.2}",
                    c.material_id, c.quantity_used, c.total_cost, c.waste_quantity,
                )));
            }
        }

        doc.push(elements::Break::new(0.5));
    }

    // -- 6. Workflow steps --

    fn render_workflow_steps(doc: &mut Document, vm: &ReportViewModel) {
        Self::section_title(doc, "ETAPES DU WORKFLOW");

        if vm.steps.is_empty() {
            doc.push(elements::Paragraph::new(
                "Aucune etape enregistree pour cette intervention.",
            ));
            doc.push(elements::Break::new(1.0));
            return;
        }

        for step in &vm.steps {
            Self::render_single_step(doc, step);
        }

        doc.push(elements::Break::new(0.5));
    }

    fn render_single_step(doc: &mut Document, step: &ReportStep) {
        // Step header with badge
        let header = format!(
            "Etape {}: {} - {} {}",
            step.number, step.title, step.status_badge, step.status
        );
        doc.push(
            elements::Paragraph::new(&header)
                .styled(style::Style::new().bold().with_font_size(11)),
        );

        // Timing
        if step.started_at != "Non renseigne" {
            Self::label_value(doc, "  Debut", &step.started_at);
        }
        if step.completed_at != "Non renseigne" {
            Self::label_value(doc, "  Fin", &step.completed_at);
        }
        if step.duration != "Non renseigne" {
            Self::label_value(doc, "  Duree", &step.duration);
        }

        // Photos
        if step.photo_count > 0 {
            Self::label_value(doc, "  Photos", &step.photo_count.to_string());
        }

        // Notes
        if step.notes != "Aucune observation" {
            Self::label_value(doc, "  Notes", &step.notes);
        }

        // Checklist
        if !step.checklist.is_empty() {
            doc.push(
                elements::Paragraph::new("  Checklist:")
                    .styled(style::Style::new().italic()),
            );
            for item in &step.checklist {
                let mark = if item.checked { "[X]" } else { "[ ]" };
                doc.push(elements::Paragraph::new(&format!(
                    "    {} {}",
                    mark, item.label
                )));
            }
        }

        // Defects
        if !step.defects.is_empty() {
            doc.push(
                elements::Paragraph::new("  Defauts:")
                    .styled(style::Style::new().italic()),
            );
            for d in &step.defects {
                doc.push(elements::Paragraph::new(&format!("    - {}", d)));
            }
        }

        // Observations
        if !step.observations.is_empty() {
            doc.push(
                elements::Paragraph::new("  Observations:")
                    .styled(style::Style::new().italic()),
            );
            for obs in &step.observations {
                doc.push(elements::Paragraph::new(&format!("    - {}", obs)));
            }
        }

        // Environment
        if !step.environment.is_empty() {
            doc.push(
                elements::Paragraph::new("  Environnement:")
                    .styled(style::Style::new().italic()),
            );
            for kv in &step.environment {
                doc.push(elements::Paragraph::new(&format!(
                    "    {}: {}",
                    kv.key, kv.value
                )));
            }
        }

        // Zones
        if !step.zones.is_empty() {
            Self::label_value(
                doc,
                "  Zones",
                &step.zones.join(", "),
            );
        }

        // Measurements
        if !step.measurements.is_empty() {
            doc.push(
                elements::Paragraph::new("  Mesures:")
                    .styled(style::Style::new().italic()),
            );
            for kv in &step.measurements {
                doc.push(elements::Paragraph::new(&format!(
                    "    {}: {}",
                    kv.key, kv.value
                )));
            }
        }

        // Validation data
        if !step.validation_data.is_empty() {
            doc.push(
                elements::Paragraph::new("  Donnees de validation:")
                    .styled(style::Style::new().italic()),
            );
            for kv in &step.validation_data {
                doc.push(elements::Paragraph::new(&format!(
                    "    {}: {}",
                    kv.key, kv.value
                )));
            }
        }

        // Quality score
        if step.quality_score != "Non evalue" {
            Self::label_value(doc, "  Score qualite", &step.quality_score);
        }

        doc.push(elements::Break::new(0.4));
    }

    // -- 7. Quality & customer validation --

    fn render_quality_and_validation(doc: &mut Document, vm: &ReportViewModel) {
        Self::section_title(doc, "CONTROLE QUALITE ET VALIDATION");

        Self::label_value_bold(doc, "Score qualite global", &vm.quality.global_quality_score);

        if !vm.quality.checkpoints.is_empty() {
            doc.push(
                elements::Paragraph::new("Scores par etape:")
                    .styled(style::Style::new().bold()),
            );
            for cp in &vm.quality.checkpoints {
                doc.push(elements::Paragraph::new(&format!(
                    "  {} ({}): {}",
                    cp.step_name, cp.step_status, cp.score
                )));
            }
        }

        if !vm.quality.final_observations.is_empty() {
            doc.push(
                elements::Paragraph::new("Observations finales:")
                    .styled(style::Style::new().bold()),
            );
            for obs in &vm.quality.final_observations {
                doc.push(elements::Paragraph::new(&format!("  - {}", obs)));
            }
        }

        doc.push(elements::Break::new(0.5));

        // Customer validation
        doc.push(
            elements::Paragraph::new("VALIDATION CLIENT")
                .styled(style::Style::new().bold().with_font_size(12)),
        );
        doc.push(elements::Break::new(0.2));

        Self::label_value(doc, "Satisfaction", &vm.customer_validation.satisfaction);
        Self::label_value(
            doc,
            "Signature",
            if vm.customer_validation.signature_present {
                "[OK] Signee electroniquement"
            } else {
                "Non signee"
            },
        );
        Self::label_value(doc, "Commentaires", &vm.customer_validation.comments);

        doc.push(elements::Break::new(0.5));
    }

    // -- 8. Photos --

    fn render_photos(doc: &mut Document, vm: &ReportViewModel) {
        Self::section_title(doc, "DOCUMENTATION PHOTOS");

        doc.push(elements::Paragraph::new(&format!(
            "Nombre total de photos: {}",
            vm.photos.total_count
        )));

        if !vm.photos.grouped_by_step.is_empty() {
            doc.push(
                elements::Paragraph::new("Par etape:")
                    .styled(style::Style::new().bold()),
            );
            for group in &vm.photos.grouped_by_step {
                doc.push(elements::Paragraph::new(&format!(
                    "  {}: {}",
                    group.label, group.count
                )));
            }
        }

        if !vm.photos.grouped_by_category.is_empty() {
            doc.push(
                elements::Paragraph::new("Par categorie:")
                    .styled(style::Style::new().bold()),
            );
            for group in &vm.photos.grouped_by_category {
                doc.push(elements::Paragraph::new(&format!(
                    "  {}: {}",
                    group.label, group.count
                )));
            }
        }

        doc.push(elements::Break::new(0.5));
    }

    // -- 9. Footer --

    fn render_footer(doc: &mut Document, vm: &ReportViewModel) {
        doc.push(elements::Break::new(2.0));

        doc.push(
            elements::Paragraph::new(&format!(
                "Rapport genere le: {} | ID: {}",
                vm.meta.generated_at, vm.meta.intervention_id
            ))
            .aligned(Alignment::Center)
            .styled(style::Style::new().with_font_size(8)),
        );

        doc.push(
            elements::Paragraph::new("Application RPMA PPF Intervention")
                .aligned(Alignment::Center)
                .styled(style::Style::new().with_font_size(8)),
        );
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
    use super::super::report_view_model;
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

    /// Build a set of 4 workflow steps (Inspection, Preparation, Installation, Finalisation).
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
            "defects": ["micro-rayures capot"],
            "environment": {"temperature": 22.5, "humidity": 45}
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
        // Now delegated to report_view_model::humanize_key
        assert_eq!(
            report_view_model::humanize_key("checklist"),
            "Checklist"
        );
        assert_eq!(
            report_view_model::humanize_key("quality_scores"),
            "Quality Scores"
        );
        assert_eq!(
            report_view_model::humanize_key("installation_zones"),
            "Installation Zones"
        );
        assert_eq!(report_view_model::humanize_key(""), "");
    }

    #[test]
    fn test_score_to_stars() {
        assert_eq!(score_to_stars(100), "*****");
        assert_eq!(score_to_stars(80), "****");
        assert_eq!(score_to_stars(0), "");
    }

    #[test]
    fn test_step_status_to_text_all_variants() {
        use crate::shared::services::cross_domain::StepStatus;
        assert_eq!(
            report_view_model::step_status_label(&StepStatus::Completed),
            "Termine"
        );
        assert_eq!(
            report_view_model::step_status_label(&StepStatus::Pending),
            "En attente"
        );
        assert_eq!(
            report_view_model::step_status_label(&StepStatus::InProgress),
            "En cours"
        );
        assert_eq!(
            report_view_model::step_status_label(&StepStatus::Failed),
            "Echec"
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
        assert_eq!(steps[1].step_name, "Preparation");
        assert_eq!(steps[1].step_status, crate::shared::services::cross_domain::StepStatus::Pending);
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
            "Preparation".to_string(),
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
