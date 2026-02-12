//! PDF report generation functionality
//!
//! This module provides commands for generating PDF reports
//! and testing PDF generation capabilities.

use crate::commands::{authenticate, AppResult, AppState};
use crate::models::auth::UserRole;
use tracing::{error, info, instrument};

/// Generate comprehensive intervention PDF report
#[tauri::command]
#[instrument(skip(state))]
pub async fn generate_intervention_pdf_report(
    intervention_id: String,
    output_path: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> AppResult<crate::models::reports::InterventionReportResult> {
    info!(
        "Generating comprehensive intervention PDF report for: {}",
        intervention_id
    );

    let current_user = authenticate!(&session_token, &state);

    // Get complete intervention data
    let intervention_data = match crate::commands::reports::export::get_intervention_with_details(
        &intervention_id,
        &state.db,
        Some(&state.intervention_service),
        Some(&state.client_service),
    )
    .await
    {
        Ok(data) => data,
        Err(e) => {
            error!("Failed to get intervention data for PDF report: {}", e);
            return Err(e);
        }
    };

    // Check permissions (technician can only access their own interventions)
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor)
        && intervention_data.intervention.technician_id != Some(current_user.user_id.clone())
    {
        return Err(crate::commands::errors::AppError::Authorization(
            "You can only generate PDF reports for your own interventions".to_string(),
        ));
    }

    // Determine output path
    let output_path = if let Some(custom_path) = output_path {
        std::path::PathBuf::from(custom_path)
    } else {
        // Use downloads directory with filename
        let downloads_dir = dirs::download_dir().unwrap_or_else(|| std::env::temp_dir());
        downloads_dir.join(format!("intervention-report-{}.pdf", intervention_id))
    };

    // Validate data before creating PDF
    tracing::info!("Validating data for PDF generation:");
    tracing::info!("- Intervention: {}", intervention_data.intervention.id);
    tracing::info!("- Steps: {}", intervention_data.workflow_steps.len());
    tracing::info!("- Photos: {}", intervention_data.photos.len());
    tracing::info!("- Client: {}", intervention_data.client.is_some());

    // Create PDF report instance
    tracing::info!("Creating PDF report instance");
    let pdf_report = crate::services::pdf_report::InterventionPdfReport::new(
        intervention_data.intervention.clone(),
        intervention_data.workflow_steps.clone(),
        intervention_data.photos.clone(),
        Vec::new(), // TODO: Get materials data
        intervention_data.client.clone(),
    );

    // Generate the PDF
    tracing::info!("Starting PDF generation to path: {:?}", output_path);
    match pdf_report.generate(&output_path).await {
        Ok(_) => {
            tracing::info!("PDF generation completed successfully");

            // Get file size
            let file_size = match std::fs::metadata(&output_path) {
                Ok(metadata) => Some(metadata.len()),
                Err(e) => {
                    tracing::warn!("Could not get file size: {}", e);
                    None
                }
            };

            // Create download URL for Tauri
            let download_url = format!("file://{}", output_path.display());

            tracing::info!("Returning successful PDF generation result");
            Ok(crate::models::reports::InterventionReportResult {
                success: true,
                download_url: Some(download_url),
                file_path: Some(output_path.to_string_lossy().to_string()),
                file_name: Some(format!("intervention-report-{}.pdf", intervention_id)),
                format: "pdf".to_string(),
                file_size,
                generated_at: chrono::Utc::now(),
            })
        }
        Err(e) => {
            tracing::error!("Failed to generate PDF report: {}", e);
            Err(crate::commands::AppError::Internal(format!(
                "Failed to generate PDF report: {}",
                e
            )))
        }
    }
}

/// Test PDF generation with minimal content
#[tauri::command]
#[instrument(skip(_state))]
pub async fn test_pdf_generation(output_path: String, _state: AppState<'_>) -> AppResult<String> {
    tracing::info!("Testing PDF generation with minimal content");

    let output_path = std::path::PathBuf::from(output_path);

    let result =
        crate::services::pdf_report::InterventionPdfReport::test_generate_minimal(&output_path)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("Test PDF generation successful");
            Ok(format!(
                "Test PDF generated successfully at: {:?}",
                output_path
            ))
        }
        Err(e) => {
            tracing::error!("Test PDF generation failed: {}", e);
            Err(e)
        }
    }
}
