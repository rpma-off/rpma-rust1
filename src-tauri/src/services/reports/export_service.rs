//! Export service
//!
//! This service handles file export operations and format conversions.

use crate::commands::{AppResult, AppState};
use crate::db::Database;
use crate::models::reports::*;
use crate::services::document_storage::DocumentStorageService;
use crate::services::pdf_generation::PdfGenerationService;
use chrono::Utc;
use std::path::Path;
use tracing::debug;

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
        // TODO: Implement actual export logic based on format
        Ok(ReportResponse {
            report_id: format!("{}_{}", report_type, Utc::now().timestamp()),
            status: ReportStatus::Completed,
            progress: 100.0,
            estimated_completion: Some(Utc::now()),
            result: None,
        })
    }

    /// Export intervention report
    pub async fn export_intervention_report(
        _intervention_id: &str,
        _session_token: &str,
        _state: &AppState<'_>,
    ) -> AppResult<InterventionReportResult> {
        // TODO: Implement actual intervention export logic
        // For now, delegate to existing functionality or provide placeholder
        Err(crate::commands::AppError::Internal(
            "Not implemented yet - needs migration from old code".to_string(),
        ))
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

        Ok(InterventionReportResult {
            success: true,
            download_url: None,
            file_path: Some(output_path.to_string_lossy().to_string()),
            file_name: Some(file_name),
            format: "pdf".to_string(),
            file_size: Some(file_size),
            generated_at: Utc::now(),
        })
    }

    /// Generate fallback text report
    pub async fn generate_fallback_text_report(
        _intervention_data: &CompleteInterventionData,
        _base_dir: &Path,
    ) -> AppResult<InterventionReportResult> {
        // TODO: Implement fallback text report generation
        Ok(InterventionReportResult {
            success: false,
            download_url: None,
            file_path: None,
            file_name: None,
            format: "text".to_string(),
            file_size: None,
            generated_at: Utc::now(),
        })
    }
}
