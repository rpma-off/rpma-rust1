pub mod report_service;

/// TODO: document
pub struct ReportsApplicationService;

impl ReportsApplicationService {
    /// TODO: document
    pub fn capabilities(
    ) -> crate::domains::reports::domain::models::report_capabilities::ReportCapabilities {
        crate::domains::reports::domain::models::report_capabilities::ReportCapabilities {
            version: "v3-scaffold".to_string(),
            status: "active".to_string(),
            available_exports: vec!["intervention_pdf".to_string()],
        }
    }
}
