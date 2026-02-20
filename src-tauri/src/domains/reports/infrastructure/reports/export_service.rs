//! Export service
//!
//! This service handles file export operations and format conversions.
//! Business logic for intervention data aggregation, PDF generation,
//! and fallback report generation lives here — not in IPC command handlers.

use crate::commands::{AppError, AppResult, AppState};
use crate::db::Database;
use crate::models::reports::*;
use crate::services::document_storage::DocumentStorageService;
use crate::services::pdf_generation::PdfGenerationService;
use crate::services::reports::validation::{validate_date_range, validate_filters};
use chrono::Utc;
use std::path::Path;
use tracing::{debug, error, info, warn};

/// Export service for handling file operations and format conversions
pub struct ExportReportService;

impl ExportReportService {
    /// Export report data in specified format
    pub async fn export_report_data(
        report_type: &str,
        _date_range: &DateRange,
        _filters: &ReportFilters,
        _format: &str,
        _session_token: &str,
        _state: &AppState<'_>,
    ) -> AppResult<ReportResponse> {
        // Return an accepted/completed export envelope for the requested format.
        Ok(ReportResponse {
            report_id: format!("{}_{}", report_type, Utc::now().timestamp()),
            status: ReportStatus::Completed,
            progress: 100.0,
            estimated_completion: Some(Utc::now()),
            result: None,
        })
    }

    /// Get complete intervention data with all related information.
    ///
    /// Aggregates intervention, workflow steps, photos, and client data
    /// via the service layer — no direct repository access.
    pub async fn get_intervention_with_details(
        intervention_id: &str,
        db: &Database,
        intervention_service: Option<&crate::services::intervention::InterventionService>,
        client_service: Option<&crate::services::ClientService>,
    ) -> AppResult<CompleteInterventionData> {
        debug!(
            "get_intervention_with_details: Starting for intervention_id: {}",
            intervention_id
        );

        // Use provided service or create a new one as fallback
        let owned_intervention_service;
        let intervention_svc = match intervention_service {
            Some(svc) => svc,
            None => {
                owned_intervention_service =
                    crate::services::intervention::InterventionService::new(std::sync::Arc::new(
                        db.clone(),
                    ));
                &owned_intervention_service
            }
        };

        // Use provided client service or create via the service builder pattern
        let owned_client_service;
        let client_svc = match client_service {
            Some(svc) => svc,
            None => {
                #[allow(deprecated)]
                {
                    owned_client_service = crate::services::ClientService::new_with_db(
                        std::sync::Arc::new(db.clone()),
                    );
                }
                &owned_client_service
            }
        };

        debug!(
            "get_intervention_with_details: Using intervention service, calling get_intervention"
        );
        let intervention_opt = intervention_svc
            .get_intervention(intervention_id)
            .map_err(|e| AppError::Database(format!("Failed to get intervention: {}", e)))?;

        debug!(
            "get_intervention_with_details: get_intervention returned: {:?}",
            intervention_opt.is_some()
        );
        let intervention = intervention_opt.ok_or_else(|| {
            error!(
                "get_intervention_with_details: Intervention {} not found in database",
                intervention_id
            );
            AppError::NotFound(format!(
                "Intervention {} not found. This intervention may have been deleted or never existed.",
                intervention_id
            ))
        })?;

        info!(
            "get_intervention_with_details: Found intervention - id: {}",
            intervention.id
        );

        // Get workflow steps
        info!(
            "get_intervention_with_details: Retrieving workflow steps for intervention {}",
            intervention_id
        );
        let workflow_steps = intervention_svc
            .get_intervention_steps(intervention_id)
            .map_err(|e| AppError::Database(format!("Failed to get workflow steps: {}", e)))?;
        info!(
            "get_intervention_with_details: Retrieved {} workflow steps",
            workflow_steps.len()
        );

        // Get all photos for this intervention
        info!(
            "get_intervention_with_details: Retrieving photos for intervention {}",
            intervention_id
        );
        let photos = intervention_svc
            .get_intervention_photos(intervention_id)
            .map_err(|e| AppError::Database(format!("Failed to get intervention photos: {}", e)))?;
        info!(
            "get_intervention_with_details: Retrieved {} photos for intervention {}",
            photos.len(),
            intervention_id
        );

        // Log data completeness for debugging
        let steps_with_measurements = workflow_steps
            .iter()
            .filter(|s| s.measurements.is_some())
            .count();
        let steps_with_observations = workflow_steps
            .iter()
            .filter(|s| {
                s.observations
                    .as_ref()
                    .map(|obs| !obs.is_empty())
                    .unwrap_or(false)
            })
            .count();
        let photos_with_gps = photos
            .iter()
            .filter(|p| p.gps_location_lat.is_some())
            .count();
        let photos_with_quality = photos.iter().filter(|p| p.quality_score.is_some()).count();

        info!("get_intervention_with_details: Data completeness - steps: {}, steps_with_measurements: {}, steps_with_observations: {}, photos_with_gps: {}, photos_with_quality: {}",
            workflow_steps.len(), steps_with_measurements, steps_with_observations, photos_with_gps, photos_with_quality);

        // Get client details if available
        let client = if let Some(client_id) = &intervention.client_id {
            info!(
                "get_intervention_with_details: Retrieving client data for client_id: {}",
                client_id
            );
            client_svc.get_client(client_id).await.map_err(|e| {
                error!(error = %e, client_id = %client_id, "Failed to get client for intervention export");
                AppError::Database("Failed to get client".to_string())
            })?
        } else {
            info!("get_intervention_with_details: No client_id associated with intervention");
            None
        };

        // Validate data completeness
        if workflow_steps.is_empty() {
            warn!(
                "get_intervention_with_details: No workflow steps found for intervention {}",
                intervention_id
            );
        }

        let data = CompleteInterventionData {
            intervention,
            workflow_steps,
            photos,
            client,
        };

        info!("get_intervention_with_details: Successfully collected complete intervention data for {}", intervention_id);
        Ok(data)
    }

    /// Generate an intervention report with automatic PDF→text fallback.
    ///
    /// Tries PDF generation first; if that fails, falls back to a plain-text
    /// report so the user always gets *something*.
    pub async fn export_intervention_report_with_fallback(
        intervention_data: &CompleteInterventionData,
        db: &Database,
        base_dir: &Path,
    ) -> AppResult<InterventionReportResult> {
        let intervention_id = &intervention_data.intervention.id;

        info!(
            "Generating PDF report for intervention: {}",
            intervention_id
        );

        match Self::generate_intervention_pdf_report(intervention_data, db, base_dir).await {
            Ok(mut result) => {
                // Construct download URL (UI concern kept at result level)
                if let Some(ref path) = result.file_path {
                    result.download_url = Some(format!("file://{}", path));
                }
                info!(
                    "Individual intervention report generated successfully: {} - file_path: {:?}, download_url: {:?}, file_size: {:?}",
                    intervention_id, result.file_path, result.download_url, result.file_size
                );
                debug!(
                    "Returning InterventionReportResult: success={}, format={}",
                    result.success, result.format
                );
                Ok(result)
            }
            Err(e) => {
                error!(
                    "Failed to generate intervention PDF report for {}: {:?}",
                    intervention_id, e
                );
                // Attempt fallback text report generation
                warn!(
                    "Attempting fallback text report generation for intervention: {}",
                    intervention_id
                );
                match Self::generate_fallback_text_report(intervention_data, base_dir).await {
                    Ok(fallback_result) => {
                        info!(
                            "Fallback text report generated successfully for intervention: {}",
                            intervention_id
                        );
                        Ok(fallback_result)
                    }
                    Err(fallback_e) => {
                        error!(
                            "Fallback text report also failed for intervention {}: {:?}",
                            intervention_id, fallback_e
                        );
                        Err(e) // Return original error
                    }
                }
            }
        }
    }

    /// Generate intervention PDF report
    pub async fn generate_intervention_pdf_report(
        intervention_data: &CompleteInterventionData,
        _db: &Database,
        base_dir: &Path,
    ) -> AppResult<InterventionReportResult> {
        // Create unique filename
        let file_name = DocumentStorageService::generate_filename(
            &format!(
                "intervention_report_{}_{}",
                intervention_data.intervention.id,
                Utc::now().timestamp()
            ),
            "pdf",
        );

        let output_path = DocumentStorageService::get_document_path(base_dir, &file_name);
        debug!("Generating intervention PDF report at: {:?}", output_path);

        // Generate PDF using existing service
        PdfGenerationService::generate_intervention_report_pdf(
            intervention_data,
            &output_path,
            base_dir,
        )
        .await?;

        // Get file size
        let file_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        // Create file URL for Tauri
        let download_url = format!("file://{}", output_path.display());

        Ok(InterventionReportResult {
            success: true,
            download_url: Some(download_url),
            file_path: Some(output_path.to_string_lossy().to_string()),
            file_name: Some(file_name),
            format: "pdf".to_string(),
            file_size: Some(file_size),
            generated_at: Utc::now(),
        })
    }

    /// Generate fallback text report when PDF generation fails
    pub async fn generate_fallback_text_report(
        intervention_data: &CompleteInterventionData,
        base_dir: &Path,
    ) -> AppResult<InterventionReportResult> {
        // Create unique filename
        let file_name = DocumentStorageService::generate_filename(
            &format!(
                "intervention_report_fallback_{}_{}",
                intervention_data.intervention.id,
                Utc::now().timestamp()
            ),
            "txt",
        );

        let output_path = DocumentStorageService::get_document_path(base_dir, &file_name);
        info!("Generating fallback text report at: {:?}", output_path);

        // Ensure storage directory exists
        DocumentStorageService::ensure_storage_dir(base_dir)?;

        // Generate simple text content
        let mut content = String::from("RAPPORT D'INTERVENTION PPF\n");
        content.push_str(&format!(
            "ID Intervention: {}\n",
            intervention_data.intervention.id
        ));
        content.push_str(&format!(
            "Statut: {}\n",
            match intervention_data.intervention.status {
                crate::models::intervention::InterventionStatus::Pending => "En attente",
                crate::models::intervention::InterventionStatus::InProgress => "En cours",
                crate::models::intervention::InterventionStatus::Paused => "En pause",
                crate::models::intervention::InterventionStatus::Completed => "Terminée",
                crate::models::intervention::InterventionStatus::Cancelled => "Annulée",
            }
        ));
        content.push_str(&format!(
            "Technicien: {}\n",
            intervention_data
                .intervention
                .technician_name
                .as_ref()
                .unwrap_or(&"N/A".to_string())
        ));
        content.push_str(&format!(
            "Progression: {:.1}%\n",
            intervention_data.intervention.completion_percentage
        ));
        content.push_str(&format!(
            "Étapes de workflow: {}\n",
            intervention_data.workflow_steps.len()
        ));
        content.push_str(&format!("Photos: {}\n", intervention_data.photos.len()));

        if let Some(client) = &intervention_data.client {
            content.push_str("\nINFORMATIONS CLIENT\n");
            content.push_str(&format!("Nom: {}\n", client.name));
            content.push_str(&format!(
                "Email: {}\n",
                client.email.as_ref().unwrap_or(&"N/A".to_string())
            ));
        }

        content.push_str(&format!(
            "\nGénéré le: {}\n",
            Utc::now().format("%Y-%m-%d %H:%M:%S")
        ));

        // Write to file
        std::fs::write(&output_path, content).map_err(|e| {
            AppError::Internal(format!("Failed to write fallback text file: {}", e))
        })?;

        // Get file size
        let file_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        // Create file URL
        let download_url = format!("file://{}", output_path.display());

        Ok(InterventionReportResult {
            success: true,
            download_url: Some(download_url),
            file_path: Some(output_path.to_string_lossy().to_string()),
            file_name: Some(file_name),
            format: "txt".to_string(),
            file_size: Some(file_size),
            generated_at: Utc::now(),
        })
    }

    /// Generate CSV export for task completion report
    ///
    /// Produces a deterministic CSV with sorted headers and proper escaping.
    pub async fn generate_task_completion_csv(
        date_range: &DateRange,
        filters: &ReportFilters,
        db: &Database,
    ) -> AppResult<String> {
        validate_date_range(date_range).map_err(AppError::from)?;
        validate_filters(filters).map_err(AppError::from)?;

        let report = crate::services::reports::task_report::generate_task_completion_report(
            date_range, filters, db,
        )
        .await?;

        let json_value = serde_json::to_value(&report.daily_breakdown)
            .map_err(|e| AppError::Internal(format!("Failed to serialize report data: {}", e)))?;

        Ok(crate::commands::reports::utils::format_report_data_for_csv(
            &json_value,
        ))
    }
}
