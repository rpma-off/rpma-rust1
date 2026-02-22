//! Intervention-specific export operations
//!
//! This module handles exporting individual intervention reports
//! and saving them to user-specified file paths.
//! Business logic is delegated to ExportReportService.

use crate::commands::{AppResult, AppState};
use crate::domains::reports::domain::models::reports::*;

use tracing::{debug, error, info, instrument};

use super::{auth, file_operations, validation};

/// Re-export for backward compatibility Ã¢â‚¬â€ delegates to service layer.
pub use crate::domains::reports::infrastructure::reports::export_service::ExportReportService;

/// Get complete intervention data with all related information.
///
/// Thin wrapper that delegates to ExportReportService.
pub async fn get_intervention_with_details(
    intervention_id: &str,
    db: &crate::db::Database,
    intervention_service: Option<&crate::domains::interventions::infrastructure::intervention::InterventionService>,
    client_service: Option<&crate::domains::clients::infrastructure::client::ClientService>,
) -> AppResult<CompleteInterventionData> {
    ExportReportService::get_intervention_with_details(
        intervention_id,
        db,
        intervention_service,
        client_service,
    )
    .await
}

/// Export individual intervention report
#[instrument(skip(state))]
pub async fn export_intervention_report(
    intervention_id: String,
    session_token: String,
    state: AppState<'_>,
) -> AppResult<InterventionReportResult> {
    info!(
        "Individual intervention report export requested: {}",
        intervention_id
    );

    let current_user = auth::authenticate_for_export(&session_token, &state).await?;
    info!("Authentication successful for user: {}", current_user.email);

    // Get complete intervention data via service
    info!("Fetching intervention data for ID: {}", intervention_id);
    let intervention_data = match ExportReportService::get_intervention_with_details(
        &intervention_id,
        &state.db,
        Some(&state.intervention_service),
        Some(&state.client_service),
    )
    .await
    {
        Ok(data) => data,
        Err(e) => {
            error!(
                "Failed to get intervention data for ID {}: {}",
                intervention_id, e
            );
            return Err(e);
        }
    };
    info!(
        "Intervention data retrieved successfully - technician_id: {:?}",
        intervention_data.intervention.technician_id
    );

    // Check permissions
    auth::check_intervention_export_permissions(
        intervention_data.intervention.technician_id.clone(),
        &current_user,
    )?;

    // Delegate report generation (with fallback) to the service layer
    let report_result = ExportReportService::export_intervention_report_with_fallback(
        &intervention_data,
        &state.db,
        &state.app_data_dir,
    )
    .await?;

    Ok(report_result)
}

/// Save intervention report to specified file path
#[instrument(skip(state))]
pub async fn save_intervention_report(
    intervention_id: String,
    file_path: String,
    session_token: String,
    state: AppState<'_>,
) -> AppResult<String> {
    info!(
        "Save intervention report requested: {} to path: {}",
        intervention_id, file_path
    );

    let current_user = auth::authenticate_for_export(&session_token, &state).await?;

    // Get complete intervention data via service
    let intervention_data = match ExportReportService::get_intervention_with_details(
        &intervention_id,
        &state.db,
        Some(&state.intervention_service),
        Some(&state.client_service),
    )
    .await
    {
        Ok(data) => data,
        Err(e) => {
            error!("Failed to get intervention data for save: {}", e);
            return Err(e);
        }
    };

    // Check permissions
    auth::check_intervention_export_permissions(
        intervention_data.intervention.technician_id.clone(),
        &current_user,
    )?;

    // Validate data integrity and path
    validation::validate_intervention_data_integrity(&intervention_data)?;
    file_operations::validate_save_path(&file_path)?;

    // Save the report using file operations module
    file_operations::save_pdf_to_path(
        &intervention_data,
        &file_path,
        &state.db,
        &state.app_data_dir,
    )
    .await
}
