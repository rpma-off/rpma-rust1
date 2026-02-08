//! Core report service facade
//!
//! This service provides a unified interface for all report generation operations.
//! Individual report logic has been split into specialized modules for better maintainability.

use crate::commands::{AppError, AppResult};
use crate::db::Database;
use crate::models::reports::*;

// Import specialized report generators
use crate::services::reports::{
    client_report, geographic_report, intelligence_report, material_report,
    overview_orchestrator::{
        generate_overview_report, get_entity_counts as get_entity_counts_fn,
        get_intervention_with_details as get_intervention_details,
    },
    quality_report, seasonal_report, task_report, technician_report,
};

/// Custom error type for report operations
#[derive(Debug, thiserror::Error)]
pub enum ReportError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Data processing error: {0}")]
    Processing(String),
    #[error("Configuration error: {0}")]
    Configuration(String),
}

impl From<ReportError> for AppError {
    fn from(error: ReportError) -> Self {
        match error {
            ReportError::Database(msg) => AppError::Database(msg),
            ReportError::Validation(msg) => AppError::Validation(msg),
            ReportError::Processing(msg) => AppError::Internal(msg),
            ReportError::Configuration(msg) => AppError::Configuration(msg),
        }
    }
}

/// Core report service for data retrieval operations
#[derive(Clone, Debug)]
pub struct CoreReportService;

impl CoreReportService {
    /// Generate task completion report (delegates to specialized module)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_task_completion_report(
        &self,
        date_range: &DateRange,
        filters: &ReportFilters,
        db: &Database,
    ) -> AppResult<TaskCompletionReport> {
        task_report::generate_task_completion_report(date_range, filters, db).await
    }

    /// Generate technician performance report (delegates to specialized module)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_technician_performance_report(
        &self,
        date_range: &DateRange,
        technician_id: Option<&str>,
        db: &Database,
    ) -> AppResult<TechnicianPerformanceReport> {
        technician_report::generate_technician_performance_report(date_range, technician_id, db)
            .await
    }

    /// Generate client analytics report (delegates to specialized module)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_client_analytics_report(
        &self,
        date_range: &DateRange,
        filters: &ReportFilters,
        db: &Database,
    ) -> AppResult<ClientAnalyticsReport> {
        client_report::generate_client_analytics_report(date_range, filters, db).await
    }

    /// Generate quality compliance report (delegates to specialized module)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_quality_compliance_report(
        &self,
        date_range: &DateRange,
        filters: &ReportFilters,
        db: &Database,
    ) -> AppResult<QualityComplianceReport> {
        quality_report::generate_quality_compliance_report(date_range, filters, db).await
    }

    /// Generate material usage report (delegates to specialized module)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_material_usage_report(
        &self,
        date_range: &DateRange,
        filters: &ReportFilters,
        db: &Database,
    ) -> AppResult<MaterialUsageReport> {
        material_report::generate_material_usage_report(date_range, filters, db).await
    }

    /// Generate geographic report (delegates to specialized module)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_geographic_report(
        &self,
        date_range: &DateRange,
        filters: &ReportFilters,
        db: &Database,
    ) -> AppResult<GeographicReport> {
        geographic_report::generate_geographic_report(date_range, filters, db).await
    }

    /// Generate seasonal report (delegates to specialized module)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_seasonal_report(
        &self,
        year: i32,
        db: &Database,
    ) -> AppResult<SeasonalReport> {
        seasonal_report::generate_seasonal_report(year, db).await
    }

    /// Generate operational intelligence report (delegates to specialized module)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_operational_intelligence_report(
        &self,
        date_range: &DateRange,
        filters: &ReportFilters,
        db: &Database,
    ) -> AppResult<OperationalIntelligenceReport> {
        intelligence_report::generate_operational_intelligence_report(date_range, filters, db).await
    }

    /// Generate overview report (delegates to orchestrator)
    #[tracing::instrument(skip(self, db))]
    pub async fn generate_overview_report(
        &self,
        date_range: &DateRange,
        filters: &ReportFilters,
        db: &Database,
    ) -> AppResult<OverviewReport> {
        generate_overview_report(date_range, filters, db).await
    }

    /// Get intervention with details (placeholder implementation)
    pub async fn get_intervention_with_details(
        &self,
        intervention_id: &str,
        db: &Database,
    ) -> AppResult<CompleteInterventionData> {
        get_intervention_details(intervention_id, db).await
    }

    /// Get entity counts
    pub async fn get_entity_counts(&self, db: &Database) -> AppResult<EntityCounts> {
        get_entity_counts_fn(db).await
    }
}
