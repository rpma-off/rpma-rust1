//! Application-layer facade for the Documents bounded context.
//!
//! Consolidates photo storage and report generation under a single entry point.
//! IPC handlers must use this facade and must not instantiate `PhotoService`,
//! `ReportRepository`, or any other documents service directly.

use std::sync::Arc;

use crate::db::Database;
use crate::shared::ipc::errors::AppError;
use crate::shared::contracts::auth::UserSession;

use super::photo_handler::{
    DocumentsCommand, DocumentsResponse, DocumentsServices, PhotoService,
    DocumentsFacade as PhotoFacade,
};
use super::models::InterventionReport;

/// Facade for the Documents bounded context.
///
/// Provides a single entry point for photo storage and report-record CRUD.
/// IPC handlers create this facade from `AppState` and call its methods.
#[derive(Debug)]
pub struct DocumentsFacade {
    inner: PhotoFacade,
}

impl DocumentsFacade {
    /// Create a new facade with the given photo service.
    pub fn new(photo_service: Arc<PhotoService>) -> Self {
        Self {
            inner: PhotoFacade::new(photo_service),
        }
    }

    /// Returns `true` if the underlying services are available.
    pub fn is_ready(&self) -> bool {
        self.inner.is_ready()
    }

    /// Access the underlying photo service.
    pub fn photo_service(&self) -> &Arc<PhotoService> {
        self.inner.photo_service()
    }

    /// Validate a photo file extension before upload.
    pub fn validate_photo_extension(&self, filename: &str) -> Result<(), AppError> {
        self.inner.validate_photo_extension(filename)
    }

    /// Execute a photo-related document command.
    pub async fn execute(
        &self,
        command: DocumentsCommand,
        user: &UserSession,
        services: &DocumentsServices,
    ) -> Result<DocumentsResponse, AppError> {
        self.inner.execute(command, user, services).await
    }

    // ── Report operations ─────────────────────────────────────────────────────
    // Report records are plain DB rows; these methods accept `Arc<Database>`
    // instead of a long-lived service, matching how the repository is used.

    /// Find a report record by its ID.
    pub fn get_report(
        &self,
        db: Arc<Database>,
        id: &str,
    ) -> Result<Option<InterventionReport>, AppError> {
        super::report_handler::ReportRepository::new(db).find_by_id(id)
    }

    /// Find the most recent report for a given intervention.
    pub fn get_report_by_intervention(
        &self,
        db: Arc<Database>,
        intervention_id: &str,
    ) -> Result<Option<InterventionReport>, AppError> {
        super::report_handler::ReportRepository::new(db)
            .find_by_intervention_id(intervention_id)
    }

    /// List report records with pagination.
    pub fn list_reports(
        &self,
        db: Arc<Database>,
        limit: i32,
        offset: i32,
    ) -> Result<Vec<InterventionReport>, AppError> {
        super::report_handler::ReportRepository::new(db).list(limit, offset)
    }

    /// Generate a unique report number.
    pub fn generate_report_number(&self, db: Arc<Database>) -> Result<String, AppError> {
        super::report_handler::ReportRepository::new(db).generate_report_number()
    }

    /// Persist a new report record to the database.
    pub fn save_report(
        &self,
        db: Arc<Database>,
        report: &InterventionReport,
    ) -> Result<(), AppError> {
        super::report_handler::ReportRepository::new(db).save(report)
    }
}
