//! Individual report generation commands
//!
//! This module contains Tauri commands for generating specific types of reports.

use crate::commands::{AppResult, AppState};
use crate::models::reports::*;
use chrono::Datelike;
use tracing::{info, instrument};

use super::validation;

/// Generate task completion report with full data
#[instrument(skip(state))]
pub async fn get_task_completion_report(
    date_range: DateRange,
    filters: ReportFilters,
    state: AppState<'_>,
) -> AppResult<TaskCompletionReport> {
    info!("Generating task completion report");

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Generate report using service layer
    crate::services::reports::task_report::generate_task_completion_report(&date_range, &filters, &state.db).await
}

/// Generate technician performance report
#[instrument(skip(state))]
pub async fn get_technician_performance_report(
    date_range: DateRange,
    technician_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<TechnicianPerformanceReport> {
    info!("Generating technician performance report");

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Generate report using service layer
    crate::services::reports::technician_report::generate_technician_performance_report(&date_range, technician_id.as_deref(), &state.db).await
}

/// Generate client analytics report
#[instrument(skip(state))]
pub async fn get_client_analytics_report(
    date_range: DateRange,
    filters: ReportFilters,
    state: AppState<'_>,
) -> AppResult<ClientAnalyticsReport> {
    info!("Generating client analytics report");

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Generate report using service layer
    crate::services::reports::client_report::generate_client_analytics_report(&date_range, &filters, &state.db).await
}

/// Generate quality compliance report
#[instrument(skip(state))]
pub async fn get_quality_compliance_report(
    date_range: DateRange,
    filters: ReportFilters,
    state: AppState<'_>,
) -> AppResult<QualityComplianceReport> {
    info!("Generating quality compliance report");

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Generate report using service layer
    crate::services::reports::quality_report::generate_quality_compliance_report(&date_range, &filters, &state.db).await
}

/// Generate material usage report
#[instrument(skip(state))]
pub async fn get_material_usage_report(
    date_range: DateRange,
    filters: ReportFilters,
    state: AppState<'_>,
) -> AppResult<MaterialUsageReport> {
    info!("Generating material usage report");

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Generate report using service layer
    crate::services::reports::material_report::generate_material_usage_report(&date_range, &filters, &state.db).await
}

/// Generate geographic report
#[instrument(skip(state))]
pub async fn get_geographic_report(
    date_range: DateRange,
    filters: ReportFilters,
    state: AppState<'_>,
) -> AppResult<GeographicReport> {
    info!("Generating geographic report");

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Generate report using service layer
    crate::services::reports::geographic_report::generate_geographic_report(&date_range, &filters, &state.db).await
}

/// Generate seasonal report
#[instrument(skip(state))]
pub async fn get_seasonal_report(
    year: i32,
    state: AppState<'_>,
) -> AppResult<SeasonalReport> {
    info!("Generating seasonal report for year: {}", year);

    // Validate year parameter
    validation::validate_year(year)?;

    // Generate report using service layer
    crate::services::reports::seasonal_report::generate_seasonal_report(year, &state.db).await
}

/// Generate operational intelligence report
#[instrument(skip(state))]
pub async fn get_operational_intelligence_report(
    date_range: DateRange,
    state: AppState<'_>,
) -> AppResult<OperationalIntelligenceReport> {
    info!("Generating operational intelligence report");

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Generate report using service layer
    crate::services::reports::intelligence_report::generate_operational_intelligence_report(&date_range, &ReportFilters::default(), &state.db).await
}

/// Generate overview report (special case - combines multiple reports)
#[instrument(skip(state))]
pub async fn get_overview_report(
    date_range: DateRange,
    filters: ReportFilters,
    state: AppState<'_>,
) -> AppResult<OverviewReport> {
    info!("Generating overview report");

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Generate all component reports using service layer
    let task_completion = crate::services::reports::task_report::generate_task_completion_report(&date_range, &filters, &state.db).await?;
    let technician_performance = crate::services::reports::technician_report::generate_technician_performance_report(&date_range, None, &state.db).await?;
    let client_analytics = crate::services::reports::client_report::generate_client_analytics_report(&date_range, &filters, &state.db).await?;
    let quality_compliance = crate::services::reports::quality_report::generate_quality_compliance_report(&date_range, &filters, &state.db).await?;
    let material_usage = crate::services::reports::material_report::generate_material_usage_report(&date_range, &filters, &state.db).await?;
    let geographic = crate::services::reports::geographic_report::generate_geographic_report(&date_range, &filters, &state.db).await?;
    let seasonal_year = date_range.start.year();
    let seasonal = crate::services::reports::seasonal_report::generate_seasonal_report(seasonal_year, &state.db).await?;
    let operational_intelligence = crate::services::reports::intelligence_report::generate_operational_intelligence_report(&date_range, &ReportFilters::default(), &state.db).await?;

    Ok(OverviewReport {
        task_completion,
        technician_performance,
        client_analytics,
        quality_compliance,
        material_usage,
        geographic,
        seasonal,
        operational_intelligence,
    })
}