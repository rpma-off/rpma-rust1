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
    db: Arc<Database>,
}

impl DocumentsFacade {
    /// Create a new facade with the given photo service and database.
    pub fn new(photo_service: Arc<PhotoService>, db: Arc<Database>) -> Self {
        Self {
            inner: PhotoFacade::new(photo_service),
            db,
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

    /// Find a report record by its ID.
    pub fn get_report(&self, id: &str) -> Result<Option<InterventionReport>, AppError> {
        super::report_handler::ReportRepository::new(self.db.clone()).find_by_id(id)
    }

    /// Find the most recent report for a given intervention.
    pub fn get_report_by_intervention(
        &self,
        intervention_id: &str,
    ) -> Result<Option<InterventionReport>, AppError> {
        super::report_handler::ReportRepository::new(self.db.clone())
            .find_by_intervention_id(intervention_id)
    }

    /// List report records with pagination.
    pub fn list_reports(&self, limit: i32, offset: i32) -> Result<Vec<InterventionReport>, AppError> {
        super::report_handler::ReportRepository::new(self.db.clone()).list(limit, offset)
    }

    /// Generate a unique report number.
    pub fn generate_report_number(&self) -> Result<String, AppError> {
        super::report_handler::ReportRepository::new(self.db.clone()).generate_report_number()
    }

    /// Persist a new report record to the database.
    pub fn save_report(&self, report: &InterventionReport) -> Result<(), AppError> {
        super::report_handler::ReportRepository::new(self.db.clone()).save(report)
    }
}
