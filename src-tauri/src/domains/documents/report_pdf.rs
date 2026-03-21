//! PDF Report Generation Service — HTML → PDF pipeline
//!
//! Uses an HTML template ([`super::report_template::render_report_html`]) rendered to a
//! self-contained HTML file, then converted to PDF by a headless Chromium browser
//! (Edge on Windows, Chrome on Linux/macOS) via [`headless_chrome`].
//!
//! The view model is built by [`build_intervention_report_view_model`] before rendering.

use crate::commands::{AppError, AppResult};
use crate::shared::services::cross_domain::{Client, InterventionStep, Photo};

use super::report_template::render_report_html;
use super::report_view_model::build_intervention_report_view_model;

use headless_chrome::{Browser, LaunchOptions};
use std::path::Path;

/// Comprehensive PDF report generator for PPF interventions.
pub struct InterventionPdfReport {
    intervention: crate::shared::services::cross_domain::Intervention,
    pub steps: Vec<InterventionStep>,
    photos: Vec<Photo>,
    materials: Vec<crate::shared::services::cross_domain::MaterialConsumption>,
    client: Option<Client>,
}

impl InterventionPdfReport {
    /// Create a new PDF report instance.
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

    /// Generate the PDF report and write it to `output_path`.
    ///
    /// Pipeline:
    /// 1. Build `ReportViewModel` from raw data.
    /// 2. Render HTML template (inline CSS, no external resources).
    /// 3. Write HTML to a temp file.
    /// 4. Launch headless browser (Edge / Chrome), navigate to the temp file.
    /// 5. Print to PDF and write bytes to `output_path`.
    /// 6. Delete the temp HTML file.
    pub async fn generate(&self, output_path: &Path) -> AppResult<()> {
        tracing::info!(
            "Starting PDF generation for intervention: {}",
            self.intervention.id
        );

        // 1. Build view model
        let vm = build_intervention_report_view_model(
            &self.intervention,
            &self.steps,
            &self.photos,
            &self.materials,
            self.client.as_ref(),
        );

        // 2. Render HTML
        let html = render_report_html(&vm);

        // 3. Write HTML to temp file — use a unique suffix to avoid collisions in parallel tests
        let unique_id = uuid::Uuid::new_v4().to_string();
        let tmp_html = std::env::temp_dir()
            .join(format!("rpma_report_{}_{}.html", &self.intervention.id, unique_id));
        std::fs::write(&tmp_html, &html)
            .map_err(|e| AppError::Internal(format!("Failed to write temp HTML: {}", e)))?;

        // 4 & 5. Launch browser and convert to PDF
        let result = Self::html_to_pdf(&tmp_html, output_path);

        // 6. Always remove temp file even if PDF conversion failed
        let _ = std::fs::remove_file(&tmp_html);

        result
    }

    /// Launch a headless browser, open the HTML file, and print to PDF.
    fn html_to_pdf(html_path: &Path, output_path: &Path) -> AppResult<()> {
        // Build a file:// URL with forward slashes (required on Windows too)
        let file_url = format!("file:///{}", html_path.to_string_lossy().replace('\\', "/"));

        tracing::info!("Launching headless browser for PDF: {}", file_url);

        let launch_opts = LaunchOptions::default_builder()
            .headless(true)
            .build()
            .map_err(|e| {
                AppError::Internal(format!("Failed to build browser launch options: {}", e))
            })?;

        let browser = Browser::new(launch_opts).map_err(|e| {
            AppError::Internal(format!(
                "Failed to launch headless browser (is Chrome/Edge installed?): {}",
                e
            ))
        })?;

        let tab = browser
            .new_tab()
            .map_err(|e| AppError::Internal(format!("Failed to open browser tab: {}", e)))?;

        tab.navigate_to(&file_url)
            .map_err(|e| AppError::Internal(format!("Navigation failed: {}", e)))?
            .wait_until_navigated()
            .map_err(|e| AppError::Internal(format!("Page load timed out: {}", e)))?;

        let pdf_bytes = tab
            .print_to_pdf(None)
            .map_err(|e| AppError::Internal(format!("PDF print failed: {}", e)))?;

        // Write output PDF
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                AppError::Internal(format!("Failed to create output directory: {}", e))
            })?;
        }
        std::fs::write(output_path, pdf_bytes)
            .map_err(|e| AppError::Internal(format!("Failed to write PDF: {}", e)))?;

        tracing::info!("Successfully generated PDF report at {:?}", output_path);
        Ok(())
    }

    /// Returns `true` if a headless browser (Chrome or Edge) can be found on this system.
    ///
    /// Used in tests to skip PDF-generation tests in CI environments without a browser.
    pub fn browser_available() -> bool {
        let opts = LaunchOptions::default_builder().build();
        match opts {
            Ok(o) => Browser::new(o).is_ok(),
            Err(_) => false,
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::super::report_view_model;
    use super::*;
    use crate::shared::contracts::common::*;
    use crate::shared::services::cross_domain::{
        Intervention, InterventionStatus, InterventionStep,
    };
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
            client_name: None,
            client_email: None,
            client_phone: None,
            technician_id: Some("tech-001".to_string()),
            technician_name: Some("Jean Dupont".to_string()),
            intervention_type: crate::shared::services::cross_domain::InterventionType::Ppf,
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

    fn build_test_steps() -> Vec<InterventionStep> {
        use crate::shared::services::cross_domain::{StepStatus, StepType};

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
        assert_eq!(report_view_model::humanize_key("checklist"), "Checklist");
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
        assert_eq!(report_view_model::score_to_stars(100), "*****");
        assert_eq!(report_view_model::score_to_stars(80), "****");
        assert_eq!(report_view_model::score_to_stars(0), "");
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

        let report =
            InterventionPdfReport::new(intervention, Vec::new(), Vec::new(), Vec::new(), None);

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
        assert_eq!(
            steps[1].step_status,
            crate::shared::services::cross_domain::StepStatus::Pending
        );
        assert_eq!(steps[2].step_name, "Installation");
        assert_eq!(steps[3].step_name, "Finalisation");

        let report = InterventionPdfReport::new(intervention, steps, Vec::new(), Vec::new(), None);

        assert_eq!(report.steps.len(), 4);
    }

    #[test]
    fn test_step_detail_data_present() {
        let steps = build_test_steps();

        let inspection = &steps[0];
        assert!(inspection.collected_data.is_some());
        let data = inspection.collected_data.as_ref().unwrap();
        assert!(data.get("checklist").is_some());
        assert!(data.get("defects").is_some());
        assert!(data.get("environment").is_some());

        let installation = &steps[2];
        assert!(installation.collected_data.is_some());
        let data = installation.collected_data.as_ref().unwrap();
        assert!(data.get("zones").is_some());
        assert!(data.get("quality_scores").is_some());
    }

    #[tokio::test]
    async fn test_generate_full_report_no_crash() {
        if !InterventionPdfReport::browser_available() {
            eprintln!("Skipping PDF generation test: headless browser not available");
            return;
        }

        let intervention = build_test_intervention();
        let steps = build_test_steps();

        let report = InterventionPdfReport::new(intervention, steps, Vec::new(), Vec::new(), None);

        let tmp_dir = std::env::temp_dir().join("rpma_test_pdf");
        std::fs::create_dir_all(&tmp_dir).unwrap();
        let output_path = tmp_dir.join("test_full_report.pdf");

        let result = report.generate(&output_path).await;
        assert!(result.is_ok(), "PDF generation failed: {:?}", result.err());

        let metadata = std::fs::metadata(&output_path).unwrap();
        assert!(metadata.len() > 0, "Generated PDF is empty");

        let _ = std::fs::remove_file(&output_path);
    }

    #[tokio::test]
    async fn test_generate_report_with_all_nulls_no_crash() {
        if !InterventionPdfReport::browser_available() {
            eprintln!("Skipping PDF generation test: headless browser not available");
            return;
        }

        let mut intervention = build_test_intervention();
        intervention.technician_name = None;
        intervention.customer_signature = None;
        intervention.customer_satisfaction = None;
        intervention.quality_score = None;
        intervention.final_observations = None;
        intervention.customer_comments = None;

        let report =
            InterventionPdfReport::new(intervention, Vec::new(), Vec::new(), Vec::new(), None);

        let tmp_dir = std::env::temp_dir().join("rpma_test_pdf");
        std::fs::create_dir_all(&tmp_dir).unwrap();
        let output_path = tmp_dir.join("test_null_report.pdf");

        let result = report.generate(&output_path).await;
        assert!(
            result.is_ok(),
            "PDF generation with nulls failed: {:?}",
            result.err()
        );

        let _ = std::fs::remove_file(&output_path);
    }

    #[tokio::test]
    async fn test_generate_report_with_pending_step() {
        if !InterventionPdfReport::browser_available() {
            eprintln!("Skipping PDF generation test: headless browser not available");
            return;
        }

        let mut intervention = build_test_intervention();
        intervention.status = InterventionStatus::InProgress;

        let pending_step = InterventionStep::new(
            "test-intervention-001".to_string(),
            1,
            "Preparation".to_string(),
            crate::shared::services::cross_domain::StepType::Preparation,
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
        let output_path = tmp_dir.join("test_pending_step_report.pdf");

        let result = report.generate(&output_path).await;
        assert!(
            result.is_ok(),
            "PDF generation with pending step failed: {:?}",
            result.err()
        );

        let _ = std::fs::remove_file(&output_path);
    }
}
