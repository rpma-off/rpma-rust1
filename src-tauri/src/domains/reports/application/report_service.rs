use crate::commands::AppResult;
use crate::db::Database;
use crate::domains::documents::application::report_export as report_export_service;
use crate::domains::reports::domain::models::intervention_report::InterventionReport;
use crate::domains::reports::domain::ports::ReportRepositoryPort;
use crate::domains::reports::infrastructure::report_repository::ReportRepository;
use crate::shared::contracts::auth::UserSession;
use crate::shared::services::document_storage::DocumentStorageService;
use chrono::Utc;
use std::path::Path;
use std::sync::Arc;

/// Application service that orchestrates report generation, persistence, and retrieval.
pub struct ReportService {
    repository: Box<dyn ReportRepositoryPort>,
    db: Arc<Database>,
    app_data_dir: std::path::PathBuf,
}

impl ReportService {
    /// TODO: document
    pub fn new(db: Arc<Database>, app_data_dir: std::path::PathBuf) -> Self {
        let repository = Box::new(ReportRepository::new(db.clone()));
        Self {
            repository,
            db,
            app_data_dir,
        }
    }

    /// Generate a report for an intervention: create PDF, persist metadata, return report.
    #[tracing::instrument(skip(self))]
    pub async fn generate_report(
        &self,
        intervention_id: &str,
        current_user: &UserSession,
        intervention_service: Option<&crate::shared::services::cross_domain::InterventionService>,
        client_service: Option<&crate::shared::services::cross_domain::ClientService>,
    ) -> AppResult<InterventionReport> {
        // 1. Fetch intervention data
        let intervention_data = report_export_service::get_intervention_with_details(
            intervention_id,
            &self.db,
            intervention_service,
            client_service,
        )
        .await?;

        // 2. Check export permissions
        report_export_service::check_intervention_export_permissions(
            intervention_data.intervention.technician_id.clone(),
            current_user,
        )?;

        // 3. Generate report number
        let report_number = self.repository.generate_report_number()?;

        // 4. Generate PDF file
        let file_name = DocumentStorageService::generate_filename(
            &format!("report_{}", report_number.replace('-', "_")),
            "pdf",
        );
        let output_path = DocumentStorageService::get_document_path(&self.app_data_dir, &file_name);

        let pdf_report =
            crate::domains::documents::application::report_pdf::InterventionPdfReport::new(
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

        // 6. Create report entity
        let now = Utc::now();
        let now_millis = now.timestamp_millis();
        let report = InterventionReport {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            intervention_id: intervention_id.to_string(),
            report_number,
            generated_at: now,
            technician_id: current_user.user_id.clone().into(),
            technician_name: current_user.username.clone().into(),
            file_path: Some(output_path.to_string_lossy().to_string()),
            file_name: Some(file_name),
            file_size,
            format: "pdf".to_string(),
            status: "generated".to_string(),
            created_at: now_millis,
            updated_at: now_millis,
        };

        // 7. Persist to database
        self.repository.save(&report)?;

        tracing::info!(
            report_number = %report.report_number,
            intervention_id = %intervention_id,
            "Intervention report generated"
        );

        Ok(report)
    }

    /// Get a report by its ID.
    pub fn get_report(&self, report_id: &str) -> AppResult<Option<InterventionReport>> {
        self.repository.find_by_id(report_id)
    }

    /// Get the latest report for an intervention.
    pub fn get_report_by_intervention(
        &self,
        intervention_id: &str,
    ) -> AppResult<Option<InterventionReport>> {
        self.repository.find_by_intervention_id(intervention_id)
    }

    /// List all reports with pagination.
    pub fn list_reports(&self, limit: i32, offset: i32) -> AppResult<Vec<InterventionReport>> {
        self.repository.list(limit, offset)
    }

    /// Check if a report PDF file exists on disk.
    pub fn report_file_exists(&self, report: &InterventionReport) -> bool {
        report
            .file_path
            .as_ref()
            .map(|p| Path::new(p).exists())
            .unwrap_or(false)
    }
}
