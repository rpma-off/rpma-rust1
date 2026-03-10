use crate::commands::{AppError, AppResult};
use crate::db::Database;
use crate::domains::documents::domain::models::report_export::{
    CompleteInterventionData, InterventionReportResult,
};
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::services::document_storage::DocumentStorageService;
use chrono::Utc;
use std::path::Path;

/// TODO: document
#[tracing::instrument(skip(db))]
pub async fn get_intervention_with_details(
    intervention_id: &str,
    db: &Database,
    intervention_service: Option<&crate::shared::services::cross_domain::InterventionService>,
    client_service: Option<&crate::shared::services::cross_domain::ClientService>,
) -> AppResult<CompleteInterventionData> {
    let owned_intervention_service;
    let intervention_svc = match intervention_service {
        Some(svc) => svc,
        None => {
            owned_intervention_service =
                crate::shared::services::cross_domain::InterventionService::new(
                    std::sync::Arc::new(db.clone()),
                );
            &owned_intervention_service
        }
    };

    let owned_client_service;
    let client_svc = match client_service {
        Some(svc) => svc,
        None => {
            #[allow(deprecated)]
            {
                owned_client_service =
                    crate::shared::services::cross_domain::ClientService::new_with_db(
                        std::sync::Arc::new(db.clone()),
                    );
            }
            &owned_client_service
        }
    };

    let intervention_opt = intervention_svc
        .get_intervention(intervention_id)
        .map_err(|e| AppError::Database(format!("Failed to get intervention: {}", e)))?;

    let intervention = intervention_opt.ok_or_else(|| {
        AppError::NotFound(format!(
            "Intervention {} not found. This intervention may have been deleted or never existed.",
            intervention_id
        ))
    })?;

    let workflow_steps = intervention_svc
        .get_intervention_steps(intervention_id)
        .map_err(|e| AppError::Database(format!("Failed to get workflow steps: {}", e)))?;

    let photos = intervention_svc
        .get_intervention_photos(intervention_id)
        .map_err(|e| AppError::Database(format!("Failed to get intervention photos: {}", e)))?;

    let client = if let Some(client_id) = &intervention.client_id {
        client_svc
            .get_client(client_id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to get client: {}", e)))?
    } else {
        None
    };

    Ok(CompleteInterventionData {
        intervention,
        workflow_steps,
        photos,
        client,
    })
}

/// TODO: document
pub fn check_intervention_export_permissions(
    intervention_technician_id: Option<String>,
    current_user: &UserSession,
) -> AppResult<()> {
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor)
        && intervention_technician_id != Some(current_user.user_id.clone())
    {
        return Err(AppError::Authorization(
            "You can only export reports for your own interventions".to_string(),
        ));
    }
    Ok(())
}

/// TODO: document
#[tracing::instrument(skip(intervention_data, app_data_dir))]
pub async fn export_intervention_report(
    intervention_data: &CompleteInterventionData,
    app_data_dir: &Path,
) -> AppResult<InterventionReportResult> {
    let intervention_id = &intervention_data.intervention.id;
    let file_name = DocumentStorageService::generate_filename(
        &format!(
            "intervention_report_{}_{}",
            intervention_id,
            Utc::now().timestamp()
        ),
        "pdf",
    );
    let output_path = DocumentStorageService::get_document_path(app_data_dir, &file_name);

    let pdf_report =
        crate::domains::documents::application::report_pdf::InterventionPdfReport::new(
            intervention_data.intervention.clone(),
            intervention_data.workflow_steps.clone(),
            intervention_data.photos.clone(),
            Vec::new(),
            intervention_data.client.clone(),
        );
    pdf_report.generate(&output_path).await?;

    let file_size = tokio::fs::metadata(&output_path)
        .await
        .map(|m| m.len())
        .ok();

    Ok(InterventionReportResult {
        success: true,
        download_url: Some(format!("file://{}", output_path.display())),
        file_path: Some(output_path.to_string_lossy().to_string()),
        file_name: Some(file_name),
        format: "pdf".to_string(),
        file_size,
        generated_at: Utc::now(),
    })
}

/// TODO: document
pub async fn save_intervention_report(
    intervention_data: &CompleteInterventionData,
    destination_path: &str,
) -> AppResult<String> {
    if destination_path.trim().is_empty() {
        return Err(AppError::Validation(
            "File path cannot be empty".to_string(),
        ));
    }

    let output_path = std::path::PathBuf::from(destination_path);
    if let Some(parent) = output_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| AppError::Io(format!("Failed to prepare destination directory: {}", e)))?;
    }

    let pdf_report =
        crate::domains::documents::application::report_pdf::InterventionPdfReport::new(
            intervention_data.intervention.clone(),
            intervention_data.workflow_steps.clone(),
            intervention_data.photos.clone(),
            Vec::new(),
            intervention_data.client.clone(),
        );
    pdf_report.generate(&output_path).await?;

    Ok(destination_path.to_string())
}
