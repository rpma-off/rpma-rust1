//! Technician performance report generation
//!
//! This module handles technician performance metrics and analytics.

use crate::commands::AppResult;
use crate::db::Database;
use crate::models::reports::*;
use crate::services::reports::validation::validate_date_range;
use chrono::{DateTime, Utc};
use tracing::info;

/// Generate technician performance report
#[tracing::instrument(skip(db))]
pub async fn generate_technician_performance_report(
    date_range: &DateRange,
    technician_id: Option<&str>,
    db: &Database,
) -> AppResult<TechnicianPerformanceReport> {
    info!("Generating technician performance report");

    // Validate inputs
    validate_date_range(date_range).map_err(crate::commands::AppError::from)?;

    let start_date = DateTime::<Utc>::from_timestamp(date_range.start.timestamp(), 0)
        .ok_or_else(|| crate::commands::AppError::Database("Invalid start date".to_string()))?;
    let end_date = DateTime::<Utc>::from_timestamp(date_range.end.timestamp(), 0)
        .ok_or_else(|| crate::commands::AppError::Database("Invalid end date".to_string()))?;

    // Build WHERE clause
    let mut where_clauses = vec!["i.created_at >= ?1 AND i.created_at <= ?2".to_string()];
    let mut params: Vec<rusqlite::types::Value> =
        vec![start_date.timestamp().into(), end_date.timestamp().into()];

    if let Some(tech_id) = technician_id {
        where_clauses.push("i.technician_id = ?3".to_string());
        params.push(tech_id.to_string().into());
    }

    let where_clause = where_clauses.join(" AND ");

    // Query technician performance data
    let technician_sql = format!(
        r#"
        SELECT
            i.technician_id,
            i.technician_name,
            COUNT(*) as total_tasks,
            SUM(CASE WHEN i.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
            AVG(CASE WHEN i.actual_duration IS NOT NULL THEN i.actual_duration ELSE NULL END) as avg_duration,
            AVG(CASE WHEN i.quality_score IS NOT NULL THEN i.quality_score ELSE NULL END) as avg_quality,
            AVG(CASE WHEN i.customer_satisfaction IS NOT NULL THEN i.customer_satisfaction ELSE NULL END) as avg_satisfaction
        FROM interventions i
        WHERE {} AND i.technician_id IS NOT NULL AND i.technician_name IS NOT NULL
        GROUP BY i.technician_id, i.technician_name
        ORDER BY completed_tasks DESC
        LIMIT 100
        "#,
        where_clause
    );

    let technician_data: Vec<(
        String,
        String,
        i64,
        i64,
        Option<f64>,
        Option<f64>,
        Option<f64>,
    )> = db
        .query_multiple(&technician_sql, rusqlite::params_from_iter(params), |row| {
            Ok((
                row.get(0)?, // technician_id
                row.get(1)?, // technician_name
                row.get(2)?, // total_tasks
                row.get(3)?, // completed_tasks
                row.get(4)?, // avg_duration
                row.get(5)?, // avg_quality
                row.get(6)?, // avg_satisfaction
            ))
        })
        .map_err(|e| {
            crate::commands::AppError::Database(format!(
                "Failed to get technician performance data: {}",
                e
            ))
        })?;

    // Convert to TechnicianPerformance structs
    let mut technicians = Vec::new();
    let mut total_efficiency_scores = Vec::new();

    for (
        tech_id,
        tech_name,
        total_tasks,
        completed_tasks,
        avg_duration,
        avg_quality,
        avg_satisfaction,
    ) in technician_data
    {
        let tasks_completed = completed_tasks as u64;
        let total_tasks_u64 = total_tasks as u64;

        // Calculate metrics
        let completion_rate = if total_tasks_u64 > 0 {
            (tasks_completed as f64 / total_tasks_u64 as f64) * 100.0
        } else {
            0.0
        };
        let average_time_per_task = avg_duration.map(|d| d / 3600.0).unwrap_or(0.0); // Convert to hours
        let quality_score = avg_quality.unwrap_or(0.0);
        let customer_satisfaction = avg_satisfaction.map(|s| s * 10.0).unwrap_or(0.0); // Assuming scale 0-10

        // Calculate utilization rate (simplified - tasks completed / total tasks)
        let utilization_rate = completion_rate;

        // Calculate efficiency score (weighted average of quality, completion rate, and satisfaction)
        let efficiency_score =
            (quality_score * 0.4) + (completion_rate * 0.4) + (customer_satisfaction * 0.2);
        total_efficiency_scores.push(efficiency_score);

        let metrics = TechnicianMetrics {
            tasks_completed,
            average_time_per_task,
            quality_score,
            customer_satisfaction,
            utilization_rate,
            efficiency_score,
        };

        // For now, empty trends - could be implemented later with monthly data
        let trends = vec![];

        technicians.push(TechnicianPerformance {
            id: tech_id,
            name: tech_name,
            metrics,
            trends,
        });
    }

    // Calculate benchmarks
    let team_average = if !total_efficiency_scores.is_empty() {
        total_efficiency_scores.iter().sum::<f64>() / total_efficiency_scores.len() as f64
    } else {
        0.0
    };

    let top_performer_score =
        total_efficiency_scores
            .iter()
            .fold(0.0, |max, &val| if val > max { val } else { max });

    let benchmarks = PerformanceBenchmarks {
        top_performer_score,
        team_average,
        industry_average: 82.0, // Could be configurable
    };

    // For now, empty trends at report level - could aggregate monthly data
    let trends = vec![];

    let total_records = technicians.len() as u64;

    let metadata = ReportMetadata {
        title: "Technician Performance Report".to_string(),
        date_range: date_range.clone(),
        generated_at: Utc::now(),
        filters: ReportFilters::default(),
        total_records,
    };

    Ok(TechnicianPerformanceReport {
        metadata,
        technicians,
        benchmarks,
        trends,
    })
}
