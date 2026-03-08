use crate::commands::AppError;
use crate::domains::reports::application::report_service::ReportService;
use crate::domains::reports::domain::models::intervention_report::InterventionReport;
use crate::domains::reports::domain::models::report_capabilities::ReportCapabilities;
use crate::shared::contracts::auth::{UserRole, UserSession};
use std::sync::Arc;

pub struct ReportsFacade {
    report_service: Arc<ReportService>,
}

impl ReportsFacade {
    pub fn new(report_service: Arc<ReportService>) -> Self {
        Self { report_service }
    }

    pub fn get_capabilities() -> ReportCapabilities {
        crate::domains::reports::application::ReportsApplicationService::capabilities()
    }

    /// RBAC check: generate report requires at least Technician role.
    fn check_generate_permission(role: &UserRole) -> Result<(), AppError> {
        if matches!(role, UserRole::Viewer) {
            return Err(AppError::Authorization(
                "Viewers cannot generate reports.".to_string(),
            ));
        }
        Ok(())
    }

    /// RBAC check: reading reports is allowed for all authenticated users.
    fn check_read_permission(_role: &UserRole) -> Result<(), AppError> {
        Ok(())
    }

    pub async fn generate_report(
        &self,
        intervention_id: &str,
        current_user: &UserSession,
        intervention_service: Option<&crate::shared::services::cross_domain::InterventionService>,
        client_service: Option<&crate::shared::services::cross_domain::ClientService>,
    ) -> Result<InterventionReport, AppError> {
        Self::check_generate_permission(&current_user.role)?;
        self.report_service
            .generate_report(
                intervention_id,
                current_user,
                intervention_service,
                client_service,
            )
            .await
    }

    pub fn get_report(
        &self,
        report_id: &str,
        role: &UserRole,
    ) -> Result<Option<InterventionReport>, AppError> {
        Self::check_read_permission(role)?;
        self.report_service.get_report(report_id)
    }

    pub fn get_report_by_intervention(
        &self,
        intervention_id: &str,
        role: &UserRole,
    ) -> Result<Option<InterventionReport>, AppError> {
        Self::check_read_permission(role)?;
        self.report_service
            .get_report_by_intervention(intervention_id)
    }

    pub fn list_reports(
        &self,
        limit: i32,
        offset: i32,
        role: &UserRole,
    ) -> Result<Vec<InterventionReport>, AppError> {
        Self::check_read_permission(role)?;
        self.report_service.list_reports(limit, offset)
    }
}
