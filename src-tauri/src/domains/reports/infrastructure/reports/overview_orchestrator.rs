//! Overview report orchestration
//!
//! This module coordinates the generation of comprehensive overview reports.

use crate::commands::AppResult;
use crate::db::Database;
use crate::models::reports::*;
use crate::services::reports::validation::{validate_date_range, validate_filters};
use tracing::info;

// Import all individual report generators
use super::{
    client_report::generate_client_analytics_report, geographic_report::generate_geographic_report,
    intelligence_report::generate_operational_intelligence_report,
    material_report::generate_material_usage_report,
    quality_report::generate_quality_compliance_report, seasonal_report::generate_seasonal_report,
    task_report::generate_task_completion_report,
    technician_report::generate_technician_performance_report,
};

/// Generate comprehensive overview report
#[tracing::instrument(skip(db))]
pub async fn generate_overview_report(
    date_range: &DateRange,
    filters: &ReportFilters,
    db: &Database,
) -> AppResult<OverviewReport> {
    info!("Generating overview report");

    // Validate inputs
    validate_date_range(date_range).map_err(crate::commands::AppError::from)?;
    validate_filters(filters).map_err(crate::commands::AppError::from)?;

    // Generate all component reports using service layer
    let task_completion = generate_task_completion_report(date_range, filters, db).await?;
    let technician_performance =
        generate_technician_performance_report(date_range, None, db).await?;
    let client_analytics = generate_client_analytics_report(date_range, filters, db).await?;
    let quality_compliance = generate_quality_compliance_report(date_range, filters, db).await?;
    let material_usage = generate_material_usage_report(date_range, filters, db).await?;
    let geographic = generate_geographic_report(date_range, filters, db).await?;
    let seasonal = generate_seasonal_report(2024, db).await?;
    let operational_intelligence =
        generate_operational_intelligence_report(date_range, filters, db).await?;

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

/// Get intervention with complete details for export/report composition.
pub async fn get_intervention_with_details(
    intervention_id: &str,
    db: &Database,
) -> AppResult<CompleteInterventionData> {
    super::export_service::ExportReportService::get_intervention_with_details(
        intervention_id,
        db,
        None,
        None,
    )
    .await
}

/// Get entity counts for Data Explorer
pub async fn get_entity_counts(db: &Database) -> AppResult<EntityCounts> {
    info!("Getting entity counts for Data Explorer");

    // Get task count
    let task_count = db.count_rows("tasks").map_err(|e| {
        crate::commands::AppError::Database(format!("Failed to count tasks: {}", e))
    })?;

    // Get client count
    let client_count = db.count_rows("clients").map_err(|e| {
        crate::commands::AppError::Database(format!("Failed to count clients: {}", e))
    })?;

    // Get intervention count (steps table)
    let intervention_count = db.count_rows("steps").map_err(|e| {
        crate::commands::AppError::Database(format!("Failed to count interventions: {}", e))
    })?;

    // Get technician count (from interventions to avoid duplicates)
    let technician_count: i64 = db
        .query_row_tuple("SELECT COUNT(DISTINCT technician_id) FROM interventions WHERE technician_id IS NOT NULL", [], |row| row.get(0))
        .unwrap_or(0);

    info!(
        "Entity counts retrieved: tasks={}, clients={}, interventions={}, technicians={}",
        task_count, client_count, intervention_count, technician_count
    );

    Ok(EntityCounts {
        tasks: task_count as i64,
        clients: client_count as i64,
        interventions: intervention_count as i64,
        technicians: technician_count,
    })
}
