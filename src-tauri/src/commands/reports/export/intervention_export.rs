//! Intervention-specific export operations
//!
//! This module handles exporting individual intervention reports
//! and saving them to user-specified file paths.

use crate::commands::{AppResult, AppState};
use crate::models::reports::*;

use crate::services::document_storage::DocumentStorageService;
use crate::services::pdf_generation::PdfGenerationService;
use chrono::Utc;
use std::path::Path;
use tracing::{debug, error, info, instrument};

use super::{auth, file_operations, validation};

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

    // Get complete intervention data
    info!("Fetching intervention data for ID: {}", intervention_id);
    let intervention_data = match get_intervention_with_details(
        &intervention_id,
        &state.db,
        Some(&state.intervention_service),
        Some(&state.client_service),
    )
    .await
    {
        Ok(data) => data,
        Err(e) => {
            tracing::error!(
                "Failed to get intervention data for ID {}: {}",
                intervention_id,
                e
            );
            info!("Returning error from get_intervention_with_details");
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

    // Generate detailed PDF report
    info!(
        "Generating PDF report for intervention: {}",
        intervention_id
    );
    let report_result = match generate_intervention_pdf_report(
        &intervention_data,
        &state.db,
        &state.app_data_dir,
    )
    .await
    {
        Ok(result) => {
            info!("Individual intervention report generated successfully: {} - file_path: {:?}, download_url: {:?}, file_size: {:?}", intervention_id, result.file_path, result.download_url, result.file_size);
            debug!(
                "Returning InterventionReportResult: success={}, format={}",
                result.success, result.format
            );
            result
        }
        Err(e) => {
            error!(
                "Failed to generate intervention PDF report for {}: {:?}",
                intervention_id, e
            );
            // Attempt fallback text report generation
            tracing::warn!(
                "Attempting fallback text report generation for intervention: {}",
                intervention_id
            );
            match generate_fallback_text_report(&intervention_data, &state.app_data_dir).await {
                Ok(fallback_result) => {
                    info!(
                        "Fallback text report generated successfully for intervention: {}",
                        intervention_id
                    );
                    return Ok(fallback_result);
                }
                Err(fallback_e) => {
                    error!(
                        "Fallback text report also failed for intervention {}: {:?}",
                        intervention_id, fallback_e
                    );
                    return Err(e); // Return original error
                }
            }
        }
    };

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

    // Get complete intervention data
    let intervention_data = match get_intervention_with_details(
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

/// Get complete intervention data with all related information.
///
/// When called from command handlers, pass the shared services from application state
/// to avoid creating redundant service/repository instances. The services are optional
/// to maintain backward compatibility with callers that only have a `db` reference.
pub async fn get_intervention_with_details(
    intervention_id: &str,
    db: &crate::db::Database,
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
            owned_intervention_service = crate::services::intervention::InterventionService::new(
                std::sync::Arc::new(db.clone()),
            );
            &owned_intervention_service
        }
    };

    // Use provided client service or create a new one as fallback via service layer
    let owned_client_service;
    let client_svc = match client_service {
        Some(svc) => svc,
        None => {
            use crate::repositories::{Cache, ClientRepository};
            let cache = std::sync::Arc::new(Cache::new(1000));
            let client_repo = std::sync::Arc::new(ClientRepository::new(
                std::sync::Arc::new(db.clone()),
                cache,
            ));
            owned_client_service = crate::services::client::ClientService::new(client_repo);
            &owned_client_service
        }
    };

    debug!("get_intervention_with_details: Using intervention service, calling get_intervention");
    let intervention_opt = intervention_svc
        .get_intervention(intervention_id)
        .map_err(|e| {
            crate::commands::errors::AppError::Database(format!(
                "Failed to get intervention: {}",
                e
            ))
        })?;

    debug!(
        "get_intervention_with_details: get_intervention returned: {:?}",
        intervention_opt.is_some()
    );
    let intervention = intervention_opt.ok_or_else(|| {
        let _ = std::panic::catch_unwind(|| {
            tracing::error!(
                "get_intervention_with_details: Intervention {} not found in database",
                intervention_id
            );
        });

        crate::commands::errors::AppError::NotFound(format!(
            "Intervention {} not found. This intervention may have been deleted or never existed.",
            intervention_id
        ))
    })?;

    let _ = std::panic::catch_unwind(|| {
        info!(
            "get_intervention_with_details: Found intervention - id: {}",
            intervention.id
        );
    });

    // Get workflow steps with collected data
    let _ = std::panic::catch_unwind(|| {
        info!(
            "get_intervention_with_details: Retrieving workflow steps for intervention {}",
            intervention_id
        );
    });
    let workflow_steps = intervention_svc
        .get_intervention_steps(intervention_id)
        .map_err(|e| {
            crate::commands::errors::AppError::Database(format!(
                "Failed to get workflow steps: {}",
                e
            ))
        })?;
    let _ = std::panic::catch_unwind(|| {
        info!(
            "get_intervention_with_details: Retrieved {} workflow steps",
            workflow_steps.len()
        );
    });

    // Get all photos for this intervention
    let _ = std::panic::catch_unwind(|| {
        info!(
            "get_intervention_with_details: Retrieving photos for intervention {}",
            intervention_id
        );
    });
    let photos = intervention_svc
        .get_intervention_photos(intervention_id)
        .map_err(|e| {
            crate::commands::errors::AppError::Database(format!(
                "Failed to get intervention photos: {}",
                e
            ))
        })?;
    let _ = std::panic::catch_unwind(|| {
        info!(
            "get_intervention_with_details: Retrieved {} photos for intervention {}",
            photos.len(),
            intervention_id
        );
    });

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

    let _ = std::panic::catch_unwind(|| {
        info!("get_intervention_with_details: Data completeness - steps: {}, steps_with_measurements: {}, steps_with_observations: {}, photos_with_gps: {}, photos_with_quality: {}",
            workflow_steps.len(), steps_with_measurements, steps_with_observations, photos_with_gps, photos_with_quality);
    });

    // Get client details if available
    let client = if let Some(client_id) = &intervention.client_id {
        let _ = std::panic::catch_unwind(|| {
            info!(
                "get_intervention_with_details: Retrieving client data for client_id: {}",
                client_id
            );
        });
        client_svc.get_client(client_id).await.map_err(|e| {
            tracing::error!(error = %e, client_id = %client_id, "Failed to get client for intervention export");
            crate::commands::errors::AppError::Database(
                "Failed to get client".to_string(),
            )
        })?
    } else {
        let _ = std::panic::catch_unwind(|| {
            info!("get_intervention_with_details: No client_id associated with intervention");
        });
        None
    };

    // Validate data completeness
    if workflow_steps.is_empty() {
        tracing::warn!(
            "get_intervention_with_details: No workflow steps found for intervention {}",
            intervention_id
        );
    }

    let data_completeness = CompleteInterventionData {
        intervention,
        workflow_steps,
        photos,
        client,
    };

    let _ = std::panic::catch_unwind(|| {
        info!("get_intervention_with_details: Successfully collected complete intervention data for {}", intervention_id);
    });
    Ok(data_completeness)
}

/// Generate PDF report for intervention
async fn generate_intervention_pdf_report(
    intervention_data: &CompleteInterventionData,
    _db: &crate::db::Database,
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
async fn generate_fallback_text_report(
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
        crate::commands::AppError::Internal(format!("Failed to write fallback text file: {}", e))
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
