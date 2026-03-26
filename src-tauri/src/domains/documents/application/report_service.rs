//! Application service for report generation (ADR-001).
//!
//! Owns the orchestration of the report-generation workflow — fetching
//! intervention data, checking permissions, rendering the PDF, and
//! persisting the record — so that `report_handler.rs` stays a thin IPC
//! adapter.

use std::sync::Arc;

use crate::db::Database;
use crate::domains::documents::{
    facade::DocumentsFacade,
    models::InterventionReport,
    photo_handler::PhotoService,
    report_export as report_export_service,
    report_pdf::InterventionPdfReport,
};
use crate::shared::contracts::auth::UserSession;
use crate::shared::ipc::errors::AppError;
use crate::shared::services::document_storage::DocumentStorageService;

/// Orchestrates the full report-generation workflow for an intervention.
pub struct ReportApplicationService {
    db: Arc<Database>,
    intervention_service:
        Arc<crate::domains::interventions::infrastructure::intervention::InterventionService>,
    client_service: Arc<crate::domains::clients::application::client_service::ClientService>,
    photo_service: Arc<PhotoService>,
}

impl ReportApplicationService {
    pub fn new(
        db: Arc<Database>,
        intervention_service: Arc<
            crate::domains::interventions::infrastructure::intervention::InterventionService,
        >,
        client_service: Arc<
            crate::domains::clients::application::client_service::ClientService,
        >,
        photo_service: Arc<PhotoService>,
    ) -> Self {
        Self {
            db,
            intervention_service,
            client_service,
            photo_service,
        }
    }

    /// Generate a PDF report for the given intervention and persist the record.
    pub async fn generate_report(
        &self,
        intervention_id: &str,
        user: &UserSession,
        app_data_dir: &std::path::Path,
    ) -> Result<InterventionReport, AppError> {
        let facade = DocumentsFacade::new(self.photo_service.clone(), self.db.clone());

        // 1. Fetch intervention data
        let intervention_data = report_export_service::get_intervention_with_details(
            intervention_id,
            &self.db,
            Some(&self.intervention_service),
            Some(&self.client_service),
        )
        .await?;

        // 2. Check export permissions
        report_export_service::check_intervention_export_permissions(
            intervention_data.intervention.technician_id.clone(),
            user,
        )?;

        // 3. Generate report number
        let report_number = facade.generate_report_number()?;

        // 4. Generate PDF file
        let file_name = DocumentStorageService::generate_filename(
            &format!("report_{}", report_number.replace('-', "_")),
            "pdf",
        );
        let output_path = DocumentStorageService::get_document_path(app_data_dir, &file_name);

        let pdf_report = InterventionPdfReport::new(
            intervention_data.intervention.clone(),
            intervention_data.workflow_steps.clone(),
            intervention_data.photos.clone(),
            Vec::new(),
            intervention_data.client.clone(),
        );
        pdf_report.generate(&output_path).await?;

        // 5. Get file size
        let file_size = tokio::fs::metadata(&output_path)
            .await
            .map(|m| m.len())
            .ok();

        // 6. Construct report entity
        let now_millis = chrono::Utc::now().timestamp_millis();
        let report = InterventionReport {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            intervention_id: intervention_id.to_string(),
            report_number: report_number.clone(),
            generated_at: now_millis,
            technician_id: user.user_id.clone().into(),
            technician_name: user.username.clone().into(),
            file_path: Some(output_path.to_string_lossy().to_string()),
            file_name: Some(file_name),
            file_size,
            format: "pdf".to_string(),
            status: "generated".to_string(),
            created_at: now_millis,
            updated_at: now_millis,
        };

        // 7. Persist
        facade.save_report(&report)?;

        Ok(report)
    }
}
