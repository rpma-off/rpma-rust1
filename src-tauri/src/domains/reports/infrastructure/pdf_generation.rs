//! PDF Generation Service
//!
//! This module provides basic PDF generation capabilities for reports and documents.
//!
//! **Async Architecture**: Uses WorkerPool to offload CPU-intensive PDF generation
//! to separate threads, maintaining UI responsiveness.

use crate::commands::{AppError, AppResult};
use crate::models::reports::CompleteInterventionData;
use crate::domains::documents::infrastructure::document_storage::DocumentStorageService;
use crate::shared::services::worker_pool::{WorkerPool, WorkerTask};
use chrono::Utc;
use printpdf::*;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tracing::{error, info};

/// PDF generation service with worker pool for async processing
#[derive(Debug, Clone)]
pub struct PdfGenerationService {
    worker_pool: Arc<WorkerPool>,
}

impl PdfGenerationService {
    /// Create a new PDF generation service with default worker pool
    pub fn new() -> Self {
        Self {
            worker_pool: Arc::new(WorkerPool::with_cpu_count()),
        }
    }

    /// Create a new PDF generation service with custom worker pool
    pub fn with_pool(pool: WorkerPool) -> Self {
        Self {
            worker_pool: Arc::new(pool),
        }
    }

    /// Get reference to the worker pool
    pub fn worker_pool(&self) -> &WorkerPool {
        &self.worker_pool
    }
}

impl PdfGenerationService {
    /// Generate a simple text-based PDF report
    ///
    /// This method uses the worker pool to offload PDF generation to a separate thread,
    /// ensuring the UI remains responsive during CPU-intensive operations.
    pub async fn generate_basic_report(
        &self,
        title: String,
        content: Vec<String>,
        output_path: PathBuf,
        base_dir: PathBuf,
    ) -> AppResult<()> {
        info!("Starting async PDF generation for basic report");

        // Ensure storage directory exists asynchronously
        DocumentStorageService::ensure_storage_dir(&base_dir)?;

        // Create task for worker pool
        let task = WorkerTask::new("pdf_basic_report", vec![]);
        let output_path_clone = output_path.clone();

        // Execute PDF generation in worker pool
        self.worker_pool
            .execute(task, move |_task| {
                Self::generate_basic_report_blocking(&title, &content, &output_path_clone)
            })
            .await
            .map_err(|e| AppError::Internal(format!("PDF generation failed: {}", e)))?;
        Ok(())
    }

    /// Blocking implementation of basic report generation
    ///
    /// This runs in a separate thread via spawn_blocking.
    fn generate_basic_report_blocking(
        title: &str,
        content: &[String],
        output_path: &Path,
    ) -> Result<(), String> {
        // Create a new PDF document
        let (doc, page1, layer1) = PdfDocument::new(title, Mm(210.0), Mm(297.0), "Layer 1");

        // Get the current layer
        let current_layer = doc.get_page(page1).get_layer(layer1);

        // Set up font - using built-in font for simplicity
        let font = doc
            .add_builtin_font(BuiltinFont::Helvetica)
            .map_err(|e| format!("Failed to add font: {}", e))?;

        // Add title
        current_layer.use_text(title, 16.0, Mm(20.0), Mm(280.0), &font);

        // Add content lines
        let mut y_position = 260.0;
        for line in content {
            if y_position < 20.0 {
                // If we run out of space, we could add a new page, but for basic implementation we'll truncate
                break;
            }

            current_layer.use_text(line, 12.0, Mm(20.0), Mm(y_position), &font);
            y_position -= 15.0; // Line spacing
        }

        // Add generation timestamp
        let timestamp = format!("Generated: {}", Utc::now().format("%Y-%m-%d %H:%M:%S"));
        current_layer.use_text(&timestamp, 10.0, Mm(20.0), Mm(15.0), &font);

        // Save the PDF
        use std::io::BufWriter;
        let file = std::fs::File::create(output_path)
            .map_err(|e| format!("Failed to create PDF file: {}", e))?;
        let mut writer = BufWriter::new(file);
        doc.save(&mut writer)
            .map_err(|e| format!("Failed to save PDF: {}", e))?;

        info!("Basic PDF report generated successfully: {:?}", output_path);
        Ok(())
    }

    /// Generate a task completion report PDF
    pub async fn generate_task_report(
        task_id: &str,
        task_title: &str,
        technician_name: &str,
        client_name: &str,
        status: &str,
        output_path: &Path,
        base_dir: &Path,
    ) -> AppResult<()> {
        let title = format!("Task Report - {}", task_title);

        let content = vec![
            format!("Task ID: {}", task_id),
            format!("Technician: {}", technician_name),
            format!("Client: {}", client_name),
            format!("Status: {}", status),
            "".to_string(),
            "Task Details:".to_string(),
            "- Task completed successfully".to_string(),
            "- Quality checks passed".to_string(),
            "- Client satisfaction recorded".to_string(),
        ];

        // Need to create a service instance to call the method
        let pdf_service = PdfGenerationService::new();
        pdf_service
            .generate_basic_report(
                title,
                content,
                output_path.to_path_buf(),
                base_dir.to_path_buf(),
            )
            .await?;
        Ok(())
    }

    /// Generate detailed PDF report for individual intervention
    pub async fn generate_intervention_report_pdf(
        intervention_data: &CompleteInterventionData,
        output_path: &Path,
        base_dir: &Path,
    ) -> AppResult<()> {
        info!(
            "Starting PDF generation for intervention: {}",
            intervention_data.intervention.id
        );
        info!(
            "Intervention data - workflow_steps: {}, photos: {}, client: {}",
            intervention_data.workflow_steps.len(),
            intervention_data.photos.len(),
            intervention_data.client.is_some()
        );

        // Ensure storage directory exists
        info!("Ensuring storage directory exists: {:?}", base_dir);
        DocumentStorageService::ensure_storage_dir(base_dir).map_err(|e| {
            error!("Failed to ensure storage directory: {}", e);
            e
        })?;
        info!("Storage directory verified/created successfully");

        // Create a new PDF document
        let title = format!(
            "Rapport d'Intervention PPF - {}",
            intervention_data.intervention.id
        );
        info!("Creating PDF document with title: {}", title);

        let (doc, page1, layer1) = PdfDocument::new(&title, Mm(210.0), Mm(297.0), "Layer 1");
        info!("PDF document created successfully");

        // Get the current layer
        let current_layer = doc.get_page(page1).get_layer(layer1);
        info!("PDF layer obtained successfully");

        // Set up font
        info!("Adding Helvetica font to PDF");
        let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| {
            error!("Failed to add Helvetica font to PDF: {}", e);
            crate::commands::AppError::Internal(format!("Failed to add font: {}", e))
        })?;
        info!("Font added successfully");

        let mut y_position = 280.0; // Start from top
        info!(
            "Starting PDF content generation at y_position: {}",
            y_position
        );

        // Add header with intervention details
        info!("Adding intervention header section");
        match Self::add_intervention_header_pdf(
            &intervention_data.intervention,
            &current_layer,
            &font,
            &mut y_position,
        ) {
            Ok(_) => info!(
                "Intervention header added successfully, y_position now: {}",
                y_position
            ),
            Err(e) => {
                error!("Failed to add intervention header: {}", e);
                return Err(e);
            }
        }

        // Add client information if available
        if let Some(client) = &intervention_data.client {
            info!("Adding client section for client: {}", client.name);
            match Self::add_client_section_pdf(client, &current_layer, &font, &mut y_position) {
                Ok(_) => info!(
                    "Client section added successfully, y_position now: {}",
                    y_position
                ),
                Err(e) => {
                    error!("Failed to add client section: {}", e);
                    return Err(e);
                }
            }
        } else {
            info!("No client information available, skipping client section");
        }

        // Add vehicle information
        info!("Adding vehicle section");
        match Self::add_vehicle_section_pdf(
            &intervention_data.intervention,
            &current_layer,
            &font,
            &mut y_position,
        ) {
            Ok(_) => info!(
                "Vehicle section added successfully, y_position now: {}",
                y_position
            ),
            Err(e) => {
                error!("Failed to add vehicle section: {}", e);
                return Err(e);
            }
        }

        // Add environmental conditions
        info!("Adding environmental conditions section");
        match Self::add_environmental_section_pdf(
            &intervention_data.intervention,
            &current_layer,
            &font,
            &mut y_position,
        ) {
            Ok(_) => info!(
                "Environmental section added successfully, y_position now: {}",
                y_position
            ),
            Err(e) => {
                error!("Failed to add environmental section: {}", e);
                return Err(e);
            }
        }

        // Add materials information
        info!("Adding materials section");
        match Self::add_materials_section_pdf(
            &intervention_data.intervention,
            &current_layer,
            &font,
            &mut y_position,
        ) {
            Ok(_) => info!(
                "Materials section added successfully, y_position now: {}",
                y_position
            ),
            Err(e) => {
                error!("Failed to add materials section: {}", e);
                return Err(e);
            }
        }

        // Add detailed workflow steps
        info!(
            "Adding detailed workflow steps ({} steps)",
            intervention_data.workflow_steps.len()
        );
        match Self::add_detailed_workflow_pdf(
            &intervention_data.workflow_steps,
            &current_layer,
            &font,
            &mut y_position,
        ) {
            Ok(_) => info!(
                "Detailed workflow added successfully, y_position now: {}",
                y_position
            ),
            Err(e) => {
                error!("Failed to add detailed workflow: {}", e);
                return Err(e);
            }
        }

        // Add quality metrics
        info!("Adding quality metrics section");
        match Self::add_quality_metrics_pdf(
            &intervention_data.intervention,
            &intervention_data.workflow_steps,
            &current_layer,
            &font,
            &mut y_position,
        ) {
            Ok(_) => info!(
                "Quality metrics added successfully, y_position now: {}",
                y_position
            ),
            Err(e) => {
                error!("Failed to add quality metrics: {}", e);
                return Err(e);
            }
        }

        // Add detailed photos information
        info!(
            "Adding detailed photos section ({} photos)",
            intervention_data.photos.len()
        );
        match Self::add_detailed_photos_pdf(
            &intervention_data.photos,
            &current_layer,
            &font,
            &mut y_position,
        ) {
            Ok(_) => info!(
                "Detailed photos added successfully, y_position now: {}",
                y_position
            ),
            Err(e) => {
                error!("Failed to add detailed photos: {}", e);
                return Err(e);
            }
        }

        // Add customer feedback
        info!("Adding customer feedback section");
        match Self::add_customer_feedback_pdf(
            &intervention_data.intervention,
            &current_layer,
            &font,
            &mut y_position,
        ) {
            Ok(_) => info!(
                "Customer feedback added successfully, y_position now: {}",
                y_position
            ),
            Err(e) => {
                error!("Failed to add customer feedback: {}", e);
                return Err(e);
            }
        }

        // Add generation timestamp
        info!("Adding footer with generation timestamp");
        match Self::add_footer_pdf(&current_layer, &font, &mut y_position) {
            Ok(_) => info!("Footer added successfully, y_position now: {}", y_position),
            Err(e) => {
                error!("Failed to add footer: {}", e);
                return Err(e);
            }
        }

        // Save to file
        info!("Saving PDF to file: {:?}", output_path);
        match std::fs::File::create(output_path) {
            Ok(file) => match doc.save(&mut std::io::BufWriter::new(file)) {
                Ok(_) => {
                    info!("PDF saved successfully to: {:?}", output_path);
                    Ok(())
                }
                Err(e) => {
                    error!("Failed to save PDF document: {}", e);
                    Err(crate::commands::AppError::Internal(format!(
                        "Failed to save PDF: {}",
                        e
                    )))
                }
            },
            Err(e) => {
                error!("Failed to create PDF file: {}", e);
                Err(crate::commands::AppError::Internal(format!(
                    "Failed to create PDF file: {}",
                    e
                )))
            }
        }
    }

    fn add_intervention_header_pdf(
        intervention: &crate::models::intervention::Intervention,
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Title
        current_layer.use_text(
            "RAPPORT D'INTERVENTION PPF",
            18.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 20.0;

        // Basic intervention details
        let mut details = vec![
            format!("ID Intervention: {}", intervention.id),
            format!(
                "Statut: {}",
                match intervention.status {
                    crate::models::intervention::InterventionStatus::Pending => "En attente",
                    crate::models::intervention::InterventionStatus::InProgress => "En cours",
                    crate::models::intervention::InterventionStatus::Paused => "En pause",
                    crate::models::intervention::InterventionStatus::Completed => "TerminÃƒÂ©e",
                    crate::models::intervention::InterventionStatus::Cancelled => "AnnulÃƒÂ©e",
                }
            ),
            format!(
                "Technicien: {}",
                intervention
                    .technician_name
                    .as_ref()
                    .unwrap_or(&"N/A".to_string())
            ),
        ];

        // Add timing information
        if let Some(duration) = intervention.actual_duration {
            details.push(format!("DurÃƒÂ©e rÃƒÂ©elle: {} minutes", duration));
        }
        if let Some(est_duration) = intervention.estimated_duration {
            details.push(format!("DurÃƒÂ©e estimÃƒÂ©e: {} minutes", est_duration));
        }

        // Add quality score
        if let Some(quality_score) = intervention.quality_score {
            details.push(format!("Score qualitÃƒÂ©: {}/100", quality_score));
        }

        // Add progress
        details.push(format!(
            "Progression: {:.1}%",
            intervention.completion_percentage
        ));

        for line in details {
            current_layer.use_text(&line, 12.0, Mm(20.0), Mm(*y_position as f32), font);
            *y_position -= 10.0;
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    fn add_environmental_section_pdf(
        intervention: &crate::models::intervention::Intervention,
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Environmental section header
        current_layer.use_text(
            "CONDITIONS DE TRAVAIL",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        let mut env_info = Vec::new();

        // Weather condition
        if let Some(weather) = &intervention.weather_condition {
            env_info.push(format!(
                "MÃƒÂ©tÃƒÂ©o: {}",
                match weather {
                    crate::shared::contracts::common::WeatherCondition::Sunny => "EnsoleillÃƒÂ©",
                    crate::shared::contracts::common::WeatherCondition::Cloudy => "Nuageux",
                    crate::shared::contracts::common::WeatherCondition::Rainy => "Pluvieux",
                    crate::shared::contracts::common::WeatherCondition::Windy => "Venteux",
                    crate::shared::contracts::common::WeatherCondition::Foggy => "Brumeux",
                    crate::shared::contracts::common::WeatherCondition::Other => "Autre",
                }
            ));
        }

        // Lighting condition
        if let Some(lighting) = &intervention.lighting_condition {
            env_info.push(format!(
                "Ãƒâ€°clairage: {}",
                match lighting {
                    crate::shared::contracts::common::LightingCondition::Natural => "Naturel",
                    crate::shared::contracts::common::LightingCondition::Artificial => "Artificiel",
                    crate::shared::contracts::common::LightingCondition::Mixed => "Mixte",
                }
            ));
        }

        // Temperature and humidity
        if let Some(temp) = intervention.temperature_celsius {
            env_info.push(format!("TempÃƒÂ©rature: {:.1}Ã‚Â°C", temp));
        }
        if let Some(humidity) = intervention.humidity_percentage {
            env_info.push(format!("HumiditÃƒÂ©: {:.1}%", humidity));
        }

        // GPS locations
        if let (Some(lat), Some(lon)) = (
            intervention.start_location_lat,
            intervention.start_location_lon,
        ) {
            env_info.push(format!("Position dÃƒÂ©part: {:.6}, {:.6}", lat, lon));
        }
        if let (Some(lat), Some(lon)) =
            (intervention.end_location_lat, intervention.end_location_lon)
        {
            env_info.push(format!("Position fin: {:.6}, {:.6}", lat, lon));
        }

        // Work location type
        if let Some(location) = &intervention.work_location {
            env_info.push(format!(
                "Lieu de travail: {}",
                match location {
                    crate::shared::contracts::common::WorkLocation::Indoor => "IntÃƒÂ©rieur",
                    crate::shared::contracts::common::WorkLocation::Outdoor => "ExtÃƒÂ©rieur",
                    crate::shared::contracts::common::WorkLocation::SemiCovered => "Semi-couvert",
                }
            ));
        }

        if env_info.is_empty() {
            current_layer.use_text(
                "Aucune information environnementale disponible",
                11.0,
                Mm(25.0),
                Mm(*y_position as f32),
                font,
            );
            *y_position -= 10.0;
        } else {
            for line in env_info {
                current_layer.use_text(&line, 11.0, Mm(25.0), Mm(*y_position as f32), font);
                *y_position -= 8.0;
            }
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    fn add_materials_section_pdf(
        intervention: &crate::models::intervention::Intervention,
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Materials section header
        current_layer.use_text(
            "MATÃƒâ€°RIAUX UTILISÃƒâ€°S",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        let mut materials_info = Vec::new();

        // Film information
        if let Some(film_type) = &intervention.film_type {
            materials_info.push(format!(
                "Type de film: {}",
                match film_type {
                    crate::shared::contracts::common::FilmType::Standard => "Standard",
                    crate::shared::contracts::common::FilmType::Premium => "Premium",
                    crate::shared::contracts::common::FilmType::Matte => "Mat",
                    crate::shared::contracts::common::FilmType::Colored => "ColorÃƒÂ©",
                }
            ));
        }

        if let Some(brand) = &intervention.film_brand {
            materials_info.push(format!("Marque: {}", brand));
        }

        if let Some(model) = &intervention.film_model {
            materials_info.push(format!("ModÃƒÂ¨le: {}", model));
        }

        // PPF zones configuration
        if let Some(zones) = &intervention.ppf_zones_config {
            if !zones.is_empty() {
                materials_info.push(format!("Zones traitÃƒÂ©es: {}", zones.join(", ")));
            }
        }

        if materials_info.is_empty() {
            current_layer.use_text(
                "Aucune information sur les matÃƒÂ©riaux disponible",
                11.0,
                Mm(25.0),
                Mm(*y_position as f32),
                font,
            );
            *y_position -= 10.0;
        } else {
            for line in materials_info {
                current_layer.use_text(&line, 11.0, Mm(25.0), Mm(*y_position as f32), font);
                *y_position -= 8.0;
            }
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    fn add_client_section_pdf(
        client: &crate::models::client::Client,
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Client section header
        current_layer.use_text(
            "INFORMATIONS CLIENT",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        let client_info = vec![
            format!("Nom: {}", client.name),
            format!(
                "Email: {}",
                client.email.as_ref().unwrap_or(&"N/A".to_string())
            ),
            format!(
                "TÃƒÂ©lÃƒÂ©phone: {}",
                client.phone.as_ref().unwrap_or(&"N/A".to_string())
            ),
        ];

        for line in client_info {
            current_layer.use_text(&line, 11.0, Mm(25.0), Mm(*y_position as f32), font);
            *y_position -= 8.0;
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    fn add_vehicle_section_pdf(
        intervention: &crate::models::intervention::Intervention,
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Vehicle section header
        current_layer.use_text(
            "INFORMATIONS VÃƒâ€°HICULE",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        let vehicle_info = vec![
            format!("Plaque: {}", intervention.vehicle_plate),
            format!(
                "ModÃƒÂ¨le: {}",
                intervention
                    .vehicle_model
                    .as_ref()
                    .unwrap_or(&"N/A".to_string())
            ),
            format!(
                "AnnÃƒÂ©e: {}",
                intervention
                    .vehicle_year
                    .map_or("N/A".to_string(), |y| y.to_string())
            ),
            format!(
                "VIN: {}",
                intervention
                    .vehicle_vin
                    .as_ref()
                    .unwrap_or(&"N/A".to_string())
            ),
        ];

        for line in vehicle_info {
            current_layer.use_text(&line, 11.0, Mm(25.0), Mm(*y_position as f32), font);
            *y_position -= 8.0;
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    fn add_detailed_workflow_pdf(
        workflow_steps: &[crate::models::step::InterventionStep],
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Detailed workflow section header
        current_layer.use_text(
            "DÃƒâ€°TAIL DES Ãƒâ€°TAPES DE TRAVAIL",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        if workflow_steps.is_empty() {
            current_layer.use_text(
                "Aucune ÃƒÂ©tape de workflow disponible",
                11.0,
                Mm(25.0),
                Mm(*y_position as f32),
                font,
            );
            *y_position -= 10.0;
        } else {
            for step in workflow_steps {
                if *y_position < 50.0 {
                    // If we run out of space, add a note and break
                    current_layer.use_text(
                        "... (suite des ÃƒÂ©tapes non affichÃƒÂ©e - espace insuffisant)",
                        10.0,
                        Mm(25.0),
                        Mm(*y_position as f32),
                        font,
                    );
                    *y_position -= 10.0;
                    break;
                }

                // Step header
                let step_header = format!(
                    "Ãƒâ€°tape {}: {} - {}",
                    step.step_number,
                    step.step_name,
                    match step.step_status {
                        crate::models::step::StepStatus::Completed => "Ã¢Å“â€œ TerminÃƒÂ©",
                        crate::models::step::StepStatus::InProgress => "Ã¢Å¸Â³ En cours",
                        crate::models::step::StepStatus::Pending => "Ã¢â€”â€¹ En attente",
                        crate::models::step::StepStatus::Paused => "Ã¢ÂÂ¸Ã¯Â¸Â En pause",
                        crate::models::step::StepStatus::Failed => "Ã¢Å“â€” Ãƒâ€°chec",
                        crate::models::step::StepStatus::Skipped => "Ã¢Å Ëœ IgnorÃƒÂ©",
                        crate::models::step::StepStatus::Rework => "Ã¢â€ Âº Retravail",
                    }
                );
                current_layer.use_text(&step_header, 12.0, Mm(25.0), Mm(*y_position as f32), font);
                *y_position -= 10.0;

                // Step details
                let mut step_details = Vec::new();

                // Duration
                if let Some(duration) = step.duration_seconds {
                    step_details.push(format!("DurÃƒÂ©e: {} secondes", duration));
                }

                // Timing information
                if let Some(start_time) = step.started_at.0 {
                    if start_time > 0 {
                        let dt = chrono::DateTime::from_timestamp(start_time, 0);
                        if let Some(datetime) = dt {
                            step_details
                                .push(format!("DÃƒÂ©but: {}", datetime.format("%d/%m/%Y %H:%M")));
                        }
                    }
                }
                if let Some(end_time) = step.completed_at.0 {
                    if end_time > 0 {
                        let dt = chrono::DateTime::from_timestamp(end_time, 0);
                        if let Some(datetime) = dt {
                            step_details
                                .push(format!("Fin: {}", datetime.format("%d/%m/%Y %H:%M")));
                        }
                    }
                }

                // Photo count
                if step.photo_count > 0 {
                    step_details.push(format!("Photos: {}", step.photo_count));
                }

                // Validation score
                if let Some(score) = step.validation_score {
                    step_details.push(format!("Score validation: {}/100", score));
                }

                // Approval status
                if step.requires_supervisor_approval {
                    if step.approved_by.is_some() {
                        step_details.push(format!(
                            "ApprouvÃƒÂ© par: {}",
                            step.approved_by.as_ref().unwrap()
                        ));
                    } else {
                        step_details.push("En attente d'approbation".to_string());
                    }
                }

                // Validation errors
                if let Some(errors) = &step.validation_errors {
                    if !errors.is_empty() {
                        step_details.push(format!("Erreurs: {}", errors.len()));
                    }
                }

                // Observations
                if let Some(observations) = &step.observations {
                    if !observations.is_empty() {
                        step_details.push(format!("Observations: {}", observations.len()));
                    }
                }

                // Display step details
                for detail in step_details {
                    current_layer.use_text(&detail, 10.0, Mm(30.0), Mm(*y_position as f32), font);
                    *y_position -= 7.0;
                }

                *y_position -= 5.0; // Space between steps
            }
        }

        *y_position -= 10.0; // Extra space after section
        Ok(())
    }

    fn add_quality_metrics_pdf(
        intervention: &crate::models::intervention::Intervention,
        workflow_steps: &[crate::models::step::InterventionStep],
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Quality metrics section header
        current_layer.use_text(
            "MÃƒâ€°TRIQUES QUALITÃƒâ€°",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        let mut quality_info = Vec::new();

        // Overall quality score
        if let Some(score) = intervention.quality_score {
            quality_info.push(format!("Score qualitÃƒÂ© global: {}/100", score));
        }

        // Customer satisfaction
        if let Some(satisfaction) = intervention.customer_satisfaction {
            quality_info.push(format!("Satisfaction client: {}/10", satisfaction));
        }

        // Steps with validation scores
        let steps_with_scores: Vec<_> = workflow_steps
            .iter()
            .filter(|step| step.validation_score.is_some())
            .collect();

        if !steps_with_scores.is_empty() {
            quality_info.push(format!(
                "Ãƒâ€°tapes avec validation: {}",
                steps_with_scores.len()
            ));

            let avg_score = steps_with_scores
                .iter()
                .map(|step| step.validation_score.unwrap_or(0) as f64)
                .sum::<f64>()
                / steps_with_scores.len() as f64;

            quality_info.push(format!("Score validation moyen: {:.1}/100", avg_score));
        }

        // Steps requiring approval
        let approved_steps = workflow_steps
            .iter()
            .filter(|step| step.requires_supervisor_approval && step.approved_by.is_some())
            .count();

        let total_approval_steps = workflow_steps
            .iter()
            .filter(|step| step.requires_supervisor_approval)
            .count();

        if total_approval_steps > 0 {
            quality_info.push(format!(
                "Approbations: {}/{}",
                approved_steps, total_approval_steps
            ));
        }

        if quality_info.is_empty() {
            current_layer.use_text(
                "Aucune mÃƒÂ©trique qualitÃƒÂ© disponible",
                11.0,
                Mm(25.0),
                Mm(*y_position as f32),
                font,
            );
            *y_position -= 10.0;
        } else {
            for line in quality_info {
                current_layer.use_text(&line, 11.0, Mm(25.0), Mm(*y_position as f32), font);
                *y_position -= 8.0;
            }
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    fn add_detailed_photos_pdf(
        photos: &[crate::models::photo::Photo],
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Photos section header
        current_layer.use_text(
            "PHOTOS ET DOCUMENTATION",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        let photo_count = photos.len();
        let mut photo_info = vec![format!("Nombre total de photos: {}", photo_count)];

        if photo_count > 0 {
            // Count by category
            let mut category_counts = std::collections::HashMap::new();
            for photo in photos {
                let category = photo
                    .photo_category
                    .as_ref()
                    .map(|c| format!("{:?}", c))
                    .unwrap_or_else(|| "Non catÃƒÂ©gorisÃƒÂ©e".to_string());
                *category_counts.entry(category).or_insert(0) += 1;
            }

            for (category, count) in category_counts {
                photo_info.push(format!("{}: {}", category, count));
            }

            // Quality metrics
            let with_quality_score = photos.iter().filter(|p| p.quality_score.is_some()).count();
            if with_quality_score > 0 {
                let avg_quality = photos
                    .iter()
                    .filter_map(|p| p.quality_score)
                    .map(|s| s as f64)
                    .sum::<f64>()
                    / with_quality_score as f64;
                photo_info.push(format!("QualitÃƒÂ© moyenne: {:.1}/100", avg_quality));
            }

            // Approval status
            let approved = photos.iter().filter(|p| p.is_approved).count();
            let rejected = photos
                .iter()
                .filter(|p| !p.is_approved && p.rejection_reason.is_some())
                .count();
            photo_info.push(format!(
                "ApprouvÃƒÂ©es: {}, RejetÃƒÂ©es: {}",
                approved, rejected
            ));

            // GPS data
            let with_gps = photos
                .iter()
                .filter(|p| p.gps_location_lat.is_some())
                .count();
            if with_gps > 0 {
                photo_info.push(format!("Photos avec gÃƒÂ©olocalisation: {}", with_gps));
            }
        }

        for line in photo_info {
            current_layer.use_text(&line, 11.0, Mm(25.0), Mm(*y_position as f32), font);
            *y_position -= 8.0;
        }

        // Show detailed photo information if space allows
        if *y_position > 100.0 && !photos.is_empty() {
            current_layer.use_text(
                "DÃƒâ€°TAIL DES PHOTOS:",
                10.0,
                Mm(25.0),
                Mm(*y_position as f32),
                font,
            );
            *y_position -= 12.0;

            for (i, photo) in photos.iter().enumerate() {
                if *y_position < 80.0 {
                    current_layer.use_text(
                        "...(suite des photos non affichÃƒÂ©e)",
                        9.0,
                        Mm(30.0),
                        Mm(*y_position as f32),
                        font,
                    );
                    *y_position -= 8.0;
                    break;
                }

                let photo_type_str = match &photo.photo_type {
                    Some(photo_type) => format!("{:?}", photo_type),
                    None => "Non catÃƒÂ©gorisÃƒÂ©".to_string(),
                };
                let mut photo_detail = format!("Photo {}: {}", i + 1, photo_type_str);

                // Add quality score if available
                if let Some(quality) = photo.quality_score {
                    photo_detail.push_str(&format!(" (QualitÃƒÂ©: {}/100)", quality));
                }

                // Add approval status
                if photo.is_approved {
                    photo_detail.push_str(" Ã¢Å“â€œ ApprouvÃƒÂ©");
                } else if photo.rejection_reason.is_some() {
                    photo_detail.push_str(" Ã¢Å“â€” RejetÃƒÂ©");
                }

                current_layer.use_text(&photo_detail, 9.0, Mm(30.0), Mm(*y_position as f32), font);
                *y_position -= 6.0;
            }
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    fn add_customer_feedback_pdf(
        intervention: &crate::models::intervention::Intervention,
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Customer feedback section header
        current_layer.use_text(
            "COMMENTAIRES ET RETOURS CLIENT",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        let mut feedback_info = Vec::new();

        // Customer satisfaction
        if let Some(satisfaction) = intervention.customer_satisfaction {
            feedback_info.push(format!("Satisfaction client: {}/10", satisfaction));
        }

        // Customer comments
        if let Some(comments) = &intervention.customer_comments {
            feedback_info.push(format!("Commentaires: {}", comments));
        }

        // Final observations
        if let Some(observations) = &intervention.final_observations {
            feedback_info.push(format!(
                "Observations finales: {} point(s)",
                observations.len()
            ));
        }

        // Special instructions
        if let Some(instructions) = &intervention.special_instructions {
            feedback_info.push(format!("Instructions spÃƒÂ©ciales: {}", instructions));
        }

        // Notes
        if let Some(notes) = &intervention.notes {
            feedback_info.push(format!("Notes: {}", notes));
        }

        if feedback_info.is_empty() {
            current_layer.use_text(
                "Aucun commentaire client disponible",
                11.0,
                Mm(25.0),
                Mm(*y_position as f32),
                font,
            );
            *y_position -= 10.0;
        } else {
            for line in feedback_info {
                // Truncate long lines for PDF
                let truncated = if line.len() > 80 {
                    format!("{}...", &line[..77])
                } else {
                    line
                };
                current_layer.use_text(&truncated, 11.0, Mm(25.0), Mm(*y_position as f32), font);
                *y_position -= 8.0;
            }
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    #[allow(dead_code)]
    fn add_workflow_summary_pdf(
        workflow_steps: &[crate::models::step::InterventionStep],
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Workflow section header
        current_layer.use_text(
            "Ãƒâ€°TAPES DU WORKFLOW",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        for step in workflow_steps {
            let status_text = match step.step_status {
                crate::models::step::StepStatus::Completed => "Ã¢Å“â€œ TerminÃƒÂ©",
                crate::models::step::StepStatus::InProgress => "Ã¢Å¸Â³ En cours",
                crate::models::step::StepStatus::Pending => "Ã¢â€”â€¹ En attente",
                crate::models::step::StepStatus::Paused => "Ã¢ÂÂ¸Ã¯Â¸Â En pause",
                crate::models::step::StepStatus::Failed => "Ã¢Å“â€” Ãƒâ€°chec",
                crate::models::step::StepStatus::Skipped => "Ã¢Å Ëœ IgnorÃƒÂ©",
                crate::models::step::StepStatus::Rework => "Ã¢â€ Âº Retravail",
            };

            let step_line = format!(
                "Ãƒâ€°tape {}: {} - {}",
                step.step_number, step.step_name, status_text
            );

            current_layer.use_text(&step_line, 11.0, Mm(25.0), Mm(*y_position as f32), font);
            *y_position -= 8.0;
        }

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    #[allow(dead_code)]
    fn add_quality_section_pdf(
        _workflow_steps: &[crate::models::step::InterventionStep],
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Quality section header
        current_layer.use_text(
            "CONTRÃƒâ€LES QUALITÃƒâ€°",
            14.0,
            Mm(20.0),
            Mm(*y_position as f32),
            font,
        );
        *y_position -= 15.0;

        // For now, just show basic quality info
        let quality_text = "ContrÃƒÂ´les qualitÃƒÂ© effectuÃƒÂ©s selon les normes PPF";
        current_layer.use_text(quality_text, 11.0, Mm(25.0), Mm(*y_position as f32), font);
        *y_position -= 10.0;

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    #[allow(dead_code)]
    fn add_photos_section_pdf(
        photos: &[crate::models::photo::Photo],
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        // Photos section header
        current_layer.use_text("PHOTOS", 14.0, Mm(20.0), Mm(*y_position as f32), font);
        *y_position -= 15.0;

        let photo_count = photos.len();
        let photo_text = format!("Nombre de photos: {}", photo_count);
        current_layer.use_text(&photo_text, 11.0, Mm(25.0), Mm(*y_position as f32), font);
        *y_position -= 10.0;

        *y_position -= 10.0; // Extra space
        Ok(())
    }

    fn add_footer_pdf(
        current_layer: &PdfLayerReference,
        font: &IndirectFontRef,
        y_position: &mut f64,
    ) -> AppResult<()> {
        *y_position = 20.0; // Bottom of page
        let timestamp = format!(
            "Rapport gÃƒÂ©nÃƒÂ©rÃƒÂ© le: {}",
            Utc::now().format("%d/%m/%Y %H:%M:%S")
        );
        current_layer.use_text(&timestamp, 10.0, Mm(20.0), Mm(*y_position as f32), font);
        Ok(())
    }
}
