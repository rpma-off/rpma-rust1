//! Task completion report generation
//!
//! This module handles task completion analytics and reporting.

use crate::commands::AppResult;
use crate::db::Database;
use crate::domains::reports::domain::models::reports::*;
use crate::domains::reports::infrastructure::reports::validation::{validate_date_range, validate_filters};
use chrono::{DateTime, Utc};
use tracing::info;

/// Generate task completion report
#[tracing::instrument(skip(db))]
pub async fn generate_task_completion_report(
    date_range: &DateRange,
    filters: &ReportFilters,
    db: &Database,
) -> AppResult<TaskCompletionReport> {
    info!("Generating task completion report");

    // Validate inputs
    validate_date_range(date_range).map_err(crate::commands::AppError::from)?;
    validate_filters(filters).map_err(crate::commands::AppError::from)?;

    let start_date = DateTime::<Utc>::from_timestamp(date_range.start.timestamp(), 0)
        .ok_or_else(|| crate::commands::AppError::Database("Invalid start date".to_string()))?;
    let end_date = DateTime::<Utc>::from_timestamp(date_range.end.timestamp(), 0)
        .ok_or_else(|| crate::commands::AppError::Database("Invalid end date".to_string()))?;

    // Build WHERE clause for filters
    let mut where_clauses = vec!["i.created_at >= ?1 AND i.created_at <= ?2".to_string()];
    let mut params: Vec<rusqlite::types::Value> =
        vec![start_date.timestamp().into(), end_date.timestamp().into()];

    if let Some(technician_ids) = &filters.technician_ids {
        if !technician_ids.is_empty() {
            where_clauses.push(format!(
                "i.technician_id IN ({})",
                (0..technician_ids.len())
                    .map(|i| format!("?{}", params.len() + i + 1))
                    .collect::<Vec<_>>()
                    .join(",")
            ));
            for id in technician_ids {
                params.push(id.clone().into());
            }
        }
    }

    if let Some(client_ids) = &filters.client_ids {
        if !client_ids.is_empty() {
            where_clauses.push(format!(
                "i.client_id IN ({})",
                (0..client_ids.len())
                    .map(|i| format!("?{}", params.len() + i + 1))
                    .collect::<Vec<_>>()
                    .join(",")
            ));
            for id in client_ids {
                params.push(id.clone().into());
            }
        }
    }

    if let Some(statuses) = &filters.statuses {
        if !statuses.is_empty() {
            where_clauses.push(format!(
                "i.status IN ({})",
                (0..statuses.len())
                    .map(|i| format!("?{}", params.len() + i + 1))
                    .collect::<Vec<_>>()
                    .join(",")
            ));
            for status in statuses {
                params.push(status.clone().into());
            }
        }
    }

    let where_clause = where_clauses.join(" AND ");

    // Query for summary statistics
    let summary_sql = format!(
        r#"
        SELECT
            COUNT(*) as total_tasks,
            SUM(CASE WHEN i.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
            AVG(CASE WHEN i.actual_duration IS NOT NULL THEN i.actual_duration ELSE NULL END) as avg_duration,
            SUM(CASE WHEN i.completed_at IS NOT NULL AND i.completed_at <= i.scheduled_at THEN 1 ELSE 0 END) as on_time_completed,
            COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as total_completed_for_ontime
        FROM interventions i
        WHERE {}
        "#,
        where_clause
    );

    let summary_result: (i64, Option<i64>, Option<f64>, Option<i64>, i64) = db
        .query_row_tuple(
            &summary_sql,
            rusqlite::params_from_iter(params.clone()),
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .map_err(|e| {
            crate::commands::AppError::Database(format!("Failed to get summary: {}", e))
        })?;

    let total_tasks = summary_result.0 as u64;
    let completed_tasks = summary_result.1.unwrap_or(0) as u64;
    let completion_rate = if total_tasks > 0 {
        (completed_tasks as f64 / total_tasks as f64) * 100.0
    } else {
        0.0
    };
    let average_duration = summary_result.2.map(|d| d / 3600.0); // Convert seconds to hours
    let on_time_completed = summary_result.3.unwrap_or(0) as u64;
    let total_completed_for_ontime = summary_result.4 as u64;
    let on_time_completion_rate = if total_completed_for_ontime > 0 {
        (on_time_completed as f64 / total_completed_for_ontime as f64) * 100.0
    } else {
        0.0
    };

    // Query for daily breakdown
    let daily_sql = format!(
        r#"
        SELECT
            DATE(i.created_at / 1000, 'unixepoch') as date,
            COUNT(*) as total,
            SUM(CASE WHEN i.status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN i.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN i.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM interventions i
        WHERE {}
        GROUP BY DATE(i.created_at / 1000, 'unixepoch')
        ORDER BY date DESC
        LIMIT 30
        "#,
        where_clause
    );

    let daily_breakdown: Vec<DailyTaskData> = db
        .query_multiple(
            &daily_sql,
            rusqlite::params_from_iter(params.clone()),
            |row| {
                let date_str: String = row.get(0)?;
                let date = DateTime::parse_from_rfc3339(&format!("{}T00:00:00Z", date_str))
                    .map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?
                    .with_timezone(&Utc);

                Ok(DailyTaskData {
                    date,
                    total: row.get::<_, i64>(1)? as u64,
                    completed: row.get::<_, i64>(2)? as u64,
                    in_progress: row.get::<_, i64>(3)? as u64,
                    pending: row.get::<_, i64>(4)? as u64,
                    cancelled: row.get::<_, i64>(5)? as u64,
                })
            },
        )
        .map_err(|e| {
            crate::commands::AppError::Database(format!("Failed to get daily breakdown: {}", e))
        })?;

    // Query for status distribution
    let status_sql = format!(
        r#"
        SELECT
            i.status,
            COUNT(*) as count
        FROM interventions i
        WHERE {}
        GROUP BY i.status
        ORDER BY count DESC
        LIMIT 50
        "#,
        where_clause
    );

    let status_counts: Vec<(String, i64)> = db
        .query_multiple(
            &status_sql,
            rusqlite::params_from_iter(params.clone()),
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| {
            crate::commands::AppError::Database(format!("Failed to get status distribution: {}", e))
        })?;

    let status_distribution: Vec<StatusCount> = status_counts
        .into_iter()
        .map(|(status, count)| {
            let percentage = if total_tasks > 0 {
                (count as f64 / total_tasks as f64) * 100.0
            } else {
                0.0
            };
            StatusCount {
                status,
                count: count as u64,
                percentage,
            }
        })
        .collect();

    // Query for technician breakdown
    let technician_sql = format!(
        r#"
        SELECT
            i.technician_id,
            i.technician_name,
            COUNT(*) as total_tasks,
            SUM(CASE WHEN i.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
            AVG(CASE WHEN i.actual_duration IS NOT NULL THEN i.actual_duration ELSE NULL END) as avg_duration,
            AVG(CASE WHEN i.quality_score IS NOT NULL THEN i.quality_score ELSE NULL END) as avg_quality
        FROM interventions i
        WHERE {} AND i.technician_id IS NOT NULL AND i.technician_name IS NOT NULL
        GROUP BY i.technician_id, i.technician_name
        ORDER BY completed_tasks DESC
        LIMIT 20
        "#,
        where_clause
    );

    let technician_breakdown: Vec<TechnicianTaskData> = db
        .query_multiple(&technician_sql, rusqlite::params_from_iter(params), |row| {
            Ok(TechnicianTaskData {
                technician_id: row.get(0)?,
                technician_name: row.get(1)?,
                tasks_completed: row.get::<_, i64>(3)? as u64,
                average_time_per_task: row.get::<_, Option<f64>>(4)?.map(|d| d / 3600.0), // Convert to hours
                quality_score: row.get(5)?,
            })
        })
        .map_err(|e| {
            crate::commands::AppError::Database(format!(
                "Failed to get technician breakdown: {}",
                e
            ))
        })?;

    let metadata = ReportMetadata {
        title: "Task Completion Report".to_string(),
        date_range: date_range.clone(),
        generated_at: Utc::now(),
        filters: filters.clone(),
        total_records: total_tasks,
    };

    let summary = TaskCompletionSummary {
        total_tasks,
        completed_tasks,
        completion_rate,
        average_duration,
        on_time_completion_rate,
    };

    Ok(TaskCompletionReport {
        metadata,
        summary,
        daily_breakdown,
        status_distribution,
        technician_breakdown,
    })
}
