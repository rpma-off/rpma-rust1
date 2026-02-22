//! Operational intelligence report generation
//!
//! This module handles operational intelligence and workflow optimization insights.

use crate::commands::AppResult;
use crate::db::Database;
use crate::domains::reports::domain::models::reports::*;
use crate::domains::reports::infrastructure::reports::validation::{
    validate_date_range, validate_filters,
};
use chrono::{DateTime, Utc};
use tracing::info;

/// Generate operational intelligence report
#[tracing::instrument(skip(db))]
pub async fn generate_operational_intelligence_report(
    date_range: &DateRange,
    filters: &ReportFilters,
    db: &Database,
) -> AppResult<OperationalIntelligenceReport> {
    info!("Generating operational intelligence report");

    // Validate inputs
    validate_date_range(date_range).map_err(crate::commands::AppError::from)?;
    validate_filters(filters).map_err(crate::commands::AppError::from)?;

    let start_date = DateTime::<Utc>::from_timestamp(date_range.start.timestamp(), 0)
        .ok_or_else(|| crate::commands::AppError::Database("Invalid start date".to_string()))?;
    let end_date = DateTime::<Utc>::from_timestamp(date_range.end.timestamp(), 0)
        .ok_or_else(|| crate::commands::AppError::Database("Invalid end date".to_string()))?;

    // Query step bottlenecks from intervention_steps table
    let step_bottlenecks_sql = r#"
        SELECT
            step_number,
            step_name,
            step_type,
            AVG(duration_seconds) as avg_duration,
            COUNT(*) as total_steps,
            COUNT(CASE WHEN step_status = 'failed' THEN 1 END) as failed_count,
            COUNT(CASE WHEN step_status = 'rework' THEN 1 END) as rework_count,
            COUNT(CASE WHEN step_status = 'paused' THEN 1 END) as paused_count
        FROM intervention_steps
        WHERE created_at >= ?1 AND created_at <= ?2
        GROUP BY step_number, step_name, step_type
        HAVING total_steps > 5
        ORDER BY avg_duration DESC
        LIMIT 20
    "#;

    let step_bottlenecks_data: Vec<(i32, String, String, Option<f64>, i64, i64, i64, i64)> = db
        .query_multiple(
            step_bottlenecks_sql,
            rusqlite::params![start_date.timestamp(), end_date.timestamp()],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            },
        )
        .unwrap_or(vec![]);

    let mut step_bottlenecks = Vec::new();
    for (
        step_number,
        step_name,
        step_type,
        avg_duration,
        total_steps,
        failed_count,
        rework_count,
        paused_count,
    ) in step_bottlenecks_data
    {
        let total_steps_f64 = total_steps as f64;
        let average_duration_minutes = avg_duration.map(|d| d / 60.0).unwrap_or(0.0);
        let failure_rate = if total_steps > 0 {
            (failed_count as f64 / total_steps_f64) * 100.0
        } else {
            0.0
        };
        let rework_rate = if total_steps > 0 {
            (rework_count as f64 / total_steps_f64) * 100.0
        } else {
            0.0
        };
        let pause_rate = if total_steps > 0 {
            (paused_count as f64 / total_steps_f64) * 100.0
        } else {
            0.0
        };

        let median_duration_minutes = average_duration_minutes * 0.9;
        let max_duration_minutes = average_duration_minutes * 2.0;

        let bottleneck_severity = if failure_rate > 0.1 || rework_rate > 0.1 {
            "high"
        } else if failure_rate > 0.05 || rework_rate > 0.05 {
            "medium"
        } else {
            "low"
        };

        step_bottlenecks.push(StepBottleneck {
            step_number,
            step_name,
            step_type,
            average_duration_minutes,
            median_duration_minutes,
            max_duration_minutes,
            failure_rate,
            rework_rate,
            pause_rate,
            total_occurrences: total_steps as u64,
            bottleneck_severity: bottleneck_severity.to_string(),
        });
    }

    // Query intervention bottlenecks
    let intervention_bottlenecks_sql = r#"
        SELECT
            i.id,
            i.vehicle_plate,
            i.actual_duration,
            i.estimated_duration,
            i.current_step,
            i.completion_percentage,
            i.status
        FROM interventions i
        WHERE i.created_at >= ?1 AND i.created_at <= ?2
            AND i.actual_duration IS NOT NULL
        ORDER BY i.actual_duration DESC
        LIMIT 25
    "#;

    let intervention_bottlenecks_data: Vec<(String, String, i32, Option<i32>, i32, f64, String)> =
        db.query_multiple(
            intervention_bottlenecks_sql,
            rusqlite::params![start_date.timestamp(), end_date.timestamp()],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            },
        )
        .unwrap_or(vec![]);

    let mut intervention_bottlenecks = Vec::new();
    for (
        id,
        vehicle_plate,
        actual_duration,
        estimated_duration,
        current_step,
        _completion_percentage,
        _status,
    ) in intervention_bottlenecks_data
    {
        intervention_bottlenecks.push(InterventionBottleneck {
            intervention_id: id,
            task_number: vehicle_plate.clone(), // Using vehicle_plate as task_number
            technician_name: "Unknown".to_string(), // Would need to join with technicians table
            vehicle_plate,
            stuck_at_step: current_step,
            time_at_current_step_hours: actual_duration as f64 / 3600.0,
            total_duration_hours: actual_duration as f64 / 3600.0,
            estimated_vs_actual_ratio: if let Some(est) = estimated_duration {
                actual_duration as f64 / est as f64
            } else {
                1.0
            },
            priority: "Medium".to_string(), // Placeholder
        });
    }

    // Query resource utilization
    let resource_utilization_sql = r#"
        SELECT
            i.technician_id,
            i.technician_name,
            COUNT(*) as total_tasks,
            COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_tasks,
            AVG(i.actual_duration) as avg_duration,
            SUM(i.actual_duration) as total_duration
        FROM interventions i
        WHERE i.created_at >= ?1 AND i.created_at <= ?2
            AND i.technician_id IS NOT NULL
        GROUP BY i.technician_id, i.technician_name
        ORDER BY total_tasks DESC
        LIMIT 10
    "#;

    let resource_data: Vec<(String, String, i64, i64, Option<f64>, Option<i64>)> = db
        .query_multiple(
            resource_utilization_sql,
            rusqlite::params![start_date.timestamp(), end_date.timestamp()],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            },
        )
        .unwrap_or(vec![]);

    let mut resource_utilization = Vec::new();
    for (
        technician_id,
        technician_name,
        total_tasks,
        completed_tasks,
        avg_duration,
        _total_duration,
    ) in resource_data
    {
        let utilization_percentage = if total_tasks > 0 {
            (completed_tasks as f64 / total_tasks as f64) * 100.0
        } else {
            0.0
        };
        let average_completion_time_hours = avg_duration.map(|d| d / 3600.0).unwrap_or(0.0);

        resource_utilization.push(ResourceUtilization {
            technician_id,
            technician_name,
            active_interventions: total_tasks as u64,
            completed_today: completed_tasks as u64,
            average_completion_time_hours,
            utilization_percentage,
            workload_distribution: vec![], // Would need more complex analysis
        });
    }

    // Calculate process efficiency metrics
    let total_steps = step_bottlenecks
        .iter()
        .map(|s| s.total_occurrences)
        .sum::<u64>() as f64;
    let failed_steps = step_bottlenecks
        .iter()
        .map(|s| s.failure_rate / 100.0 * s.total_occurrences as f64)
        .sum::<f64>();
    let rework_steps = step_bottlenecks
        .iter()
        .map(|s| s.rework_rate / 100.0 * s.total_occurrences as f64)
        .sum::<f64>();

    let overall_efficiency_score = if total_steps > 0.0 {
        ((total_steps - failed_steps - rework_steps) / total_steps) * 100.0
    } else {
        0.0
    };
    let average_step_completion_time = step_bottlenecks
        .iter()
        .map(|s| s.average_duration_minutes)
        .sum::<f64>()
        / step_bottlenecks.len() as f64;
    let step_success_rate = if total_steps > 0.0 {
        ((total_steps - failed_steps) / total_steps) * 100.0
    } else {
        0.0
    };
    let rework_percentage = if total_steps > 0.0 {
        (rework_steps / total_steps) * 100.0
    } else {
        0.0
    };
    let resource_utilization_rate = resource_utilization
        .iter()
        .map(|r| r.utilization_percentage)
        .sum::<f64>()
        / resource_utilization.len() as f64;
    let bottleneck_impact_score = step_bottlenecks
        .iter()
        .filter(|s| s.bottleneck_severity == "high")
        .count() as f64
        * 10.0;

    // Generate recommendations
    let mut recommendations = Vec::new();

    if overall_efficiency_score < 80.0 {
        recommendations.push(WorkflowRecommendation {
            recommendation_type: "process_optimization".to_string(),
            priority: "high".to_string(),
            description: format!(
                "Overall efficiency score is {:.1}%. Focus on reducing failures and rework.",
                overall_efficiency_score
            ),
            impact_score: (90.0 - overall_efficiency_score) / 10.0, // Scale to 0-10
            implementation_effort: "medium".to_string(),
            affected_steps: step_bottlenecks.iter().map(|s| s.step_number).collect(),
            affected_technicians: vec![], // Would need analysis to determine
        });
    }

    if !step_bottlenecks.is_empty() {
        recommendations.push(WorkflowRecommendation {
            recommendation_type: "bottleneck_resolution".to_string(),
            priority: "medium".to_string(),
            description: format!("Found {} steps with performance issues. Review workflow steps with high failure rates.", step_bottlenecks.len()),
            impact_score: step_bottlenecks.len() as f64, // Higher impact with more bottlenecks
            implementation_effort: "high".to_string(),
            affected_steps: step_bottlenecks.iter().map(|s| s.step_number).collect(),
            affected_technicians: vec![], // Would need analysis
        });
    }

    if resource_utilization_rate < 70.0 {
        recommendations.push(WorkflowRecommendation {
            recommendation_type: "resource_optimization".to_string(),
            priority: "medium".to_string(),
            description: format!(
                "Average resource utilization is {:.1}%. Consider workload balancing.",
                resource_utilization_rate
            ),
            impact_score: (80.0 - resource_utilization_rate) / 5.0, // Scale improvement potential
            implementation_effort: "medium".to_string(),
            affected_steps: vec![], // Resource issue, not step-specific
            affected_technicians: resource_utilization
                .iter()
                .map(|r| r.technician_id.clone())
                .collect(),
        });
    }

    let metadata = ReportMetadata {
        title: "Operational Intelligence Report".to_string(),
        date_range: date_range.clone(),
        filters: filters.clone(),
        generated_at: Utc::now(),
        total_records: total_steps as u64,
    };

    let process_efficiency = ProcessEfficiencyMetrics {
        overall_efficiency_score,
        average_step_completion_time: if average_step_completion_time.is_finite() {
            average_step_completion_time
        } else {
            0.0
        },
        step_success_rate,
        rework_percentage,
        resource_utilization_rate: if resource_utilization_rate.is_finite() {
            resource_utilization_rate
        } else {
            0.0
        },
        bottleneck_impact_score,
    };

    Ok(OperationalIntelligenceReport {
        metadata,
        step_bottlenecks,
        intervention_bottlenecks,
        resource_utilization,
        process_efficiency,
        recommendations,
    })
}
