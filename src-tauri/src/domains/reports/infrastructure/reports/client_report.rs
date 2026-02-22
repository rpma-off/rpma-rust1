//! Client analytics report generation
//!
//! This module handles client analytics and retention metrics.

use crate::commands::AppResult;
use crate::db::Database;
use crate::models::reports::*;
use crate::domains::reports::infrastructure::reports::validation::{validate_date_range, validate_filters};
use chrono::{DateTime, Utc};
use tracing::info;

/// Generate client analytics report
#[tracing::instrument(skip(db))]
pub async fn generate_client_analytics_report(
    date_range: &DateRange,
    filters: &ReportFilters,
    db: &Database,
) -> AppResult<ClientAnalyticsReport> {
    info!("Generating client analytics report");

    // Validate inputs
    validate_date_range(date_range).map_err(crate::commands::AppError::from)?;
    validate_filters(filters).map_err(crate::commands::AppError::from)?;

    let start_date = DateTime::<Utc>::from_timestamp(date_range.start.timestamp(), 0)
        .ok_or_else(|| crate::commands::AppError::Database("Invalid start date".to_string()))?;
    let end_date = DateTime::<Utc>::from_timestamp(date_range.end.timestamp(), 0)
        .ok_or_else(|| crate::commands::AppError::Database("Invalid end date".to_string()))?;

    // Build WHERE clause for interventions
    let mut where_clauses = vec!["i.created_at >= ?1 AND i.created_at <= ?2".to_string()];
    let mut params: Vec<rusqlite::types::Value> =
        vec![start_date.timestamp().into(), end_date.timestamp().into()];

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

    let where_clause = where_clauses.join(" AND ");

    // Query client summary data
    let client_summary_sql = format!(
        r#"
        SELECT
            COUNT(DISTINCT i.client_id) as total_clients,
            COUNT(DISTINCT CASE WHEN i.created_at >= {} AND i.created_at <= {} THEN i.client_id END) as clients_this_period,
            COUNT(DISTINCT CASE WHEN i.created_at < {} THEN i.client_id END) as returning_clients,
            AVG(mc.total_cost) as avg_revenue_per_task
        FROM interventions i
        LEFT JOIN material_consumption mc ON i.id = mc.intervention_id
        WHERE i.client_id IS NOT NULL
        "#,
        start_date.timestamp(),
        end_date.timestamp(),
        start_date.timestamp()
    );

    let summary_result: (i64, i64, i64, Option<f64>) = db
        .query_row_tuple(
            &client_summary_sql,
            rusqlite::params_from_iter(params.clone()),
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap_or((0, 0, 0, None));

    let total_clients = summary_result.0 as u64;
    let clients_this_period = summary_result.1 as u64;
    let returning_clients = summary_result.2 as u64;
    let retention_rate = if total_clients > 0 {
        (returning_clients as f64 / total_clients as f64) * 100.0
    } else {
        0.0
    };
    let _average_revenue_per_client = 0.0; // Will calculate from top clients
    let average_revenue_per_task = summary_result.3.unwrap_or(0.0);

    // Query new vs returning clients this period
    let new_clients_this_period = {
        let new_clients_sql = format!(
            r#"
            SELECT COUNT(DISTINCT i.client_id)
            FROM interventions i
            WHERE {} AND i.client_id NOT IN (
                SELECT DISTINCT client_id FROM interventions
                WHERE created_at < ?1 AND client_id IS NOT NULL
                LIMIT 10000
            )
            LIMIT 10000
            "#,
            where_clause
        );
        let mut new_params = params.clone();
        new_params.insert(0, start_date.timestamp().into());

        db.query_row_tuple(
            &new_clients_sql,
            rusqlite::params_from_iter(new_params),
            |row| Ok(row.get::<_, i64>(0).unwrap_or(0) as u64),
        )
        .unwrap_or(0)
    };

    // Query revenue data
    let revenue_sql = format!(
        r#"
        SELECT
            SUM(mc.total_cost) as total_revenue,
            COUNT(DISTINCT i.id) as total_tasks,
            AVG(mc.total_cost) as avg_revenue_per_task
        FROM interventions i
        LEFT JOIN material_consumption mc ON i.id = mc.intervention_id
        WHERE {}
        "#,
        where_clause
    );

    let revenue_result: (Option<f64>, i64, Option<f64>) = db
        .query_row_tuple(
            &revenue_sql,
            rusqlite::params_from_iter(params.clone()),
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((None, 0, None));

    let total_revenue = revenue_result.0.unwrap_or(0.0);
    let _total_tasks = revenue_result.1 as u64;

    // Calculate retention analysis
    let new_client_rate = if clients_this_period > 0 {
        (new_clients_this_period as f64 / clients_this_period as f64) * 100.0
    } else {
        0.0
    };

    let repeat_client_rate = if clients_this_period > 0 {
        ((clients_this_period - new_clients_this_period) as f64 / clients_this_period as f64)
            * 100.0
    } else {
        0.0
    };

    let churn_rate = 100.0 - retention_rate;

    // Simplified lifetime value calculation
    let lifetime_value = if total_clients > 0 {
        total_revenue / total_clients as f64
    } else {
        0.0
    };

    // Revenue by client type (simplified - could be enhanced with client types)
    let revenue_by_client_type = std::collections::HashMap::new();

    // Revenue growth rate (simplified - comparing to previous period)
    let _previous_period_start =
        start_date - chrono::Duration::days((end_date - start_date).num_days());
    let revenue_growth_rate = 0.0; // Would need historical data

    // Query top clients by revenue
    let top_clients_sql = format!(
        r#"
        SELECT
            i.client_id,
            i.client_name,
            COUNT(DISTINCT i.id) as tasks_completed,
            SUM(mc.total_cost) as total_revenue,
            AVG(i.customer_satisfaction) as avg_satisfaction,
            COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_tasks
        FROM interventions i
        LEFT JOIN material_consumption mc ON i.id = mc.intervention_id
        WHERE {} AND i.client_id IS NOT NULL AND i.client_name IS NOT NULL
        GROUP BY i.client_id, i.client_name
        ORDER BY total_revenue DESC NULLS LAST
        LIMIT 10
        "#,
        where_clause
    );

    let top_clients_data: Vec<(String, String, i64, Option<f64>, Option<f64>, i64)> = db
        .query_multiple(
            &top_clients_sql,
            rusqlite::params_from_iter(params.clone()),
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

    let mut top_clients = Vec::new();
    let mut total_client_revenue = 0.0;

    for (client_id, client_name, tasks_completed, revenue, avg_satisfaction, _completed_tasks) in
        top_clients_data
    {
        let revenue = revenue.unwrap_or(0.0);
        total_client_revenue += revenue;

        top_clients.push(ClientPerformance {
            id: client_id,
            name: client_name,
            customer_type: "Standard".to_string(), // Could be enhanced with actual client types
            total_revenue: revenue,
            tasks_completed: tasks_completed as u64,
            average_revenue_per_task: if tasks_completed > 0 {
                revenue / tasks_completed as f64
            } else {
                0.0
            },
            satisfaction_score: avg_satisfaction,
            retention_status: true, // Placeholder - would need retention analysis
        });
    }

    let average_revenue_per_client = if !top_clients.is_empty() {
        total_client_revenue / top_clients.len() as f64
    } else {
        0.0
    };

    let metadata = ReportMetadata {
        title: "Client Analytics Report".to_string(),
        date_range: date_range.clone(),
        generated_at: Utc::now(),
        filters: filters.clone(),
        total_records: total_clients,
    };

    let summary = ClientSummary {
        total_clients,
        new_clients_this_period,
        returning_clients,
        retention_rate,
        average_revenue_per_client,
    };

    let retention_analysis = RetentionAnalysis {
        new_client_rate,
        repeat_client_rate,
        churn_rate,
        lifetime_value,
    };

    let revenue_analysis = RevenueAnalysis {
        total_revenue,
        revenue_by_client_type,
        average_revenue_per_task,
        revenue_growth_rate,
    };

    Ok(ClientAnalyticsReport {
        metadata,
        summary,
        retention_analysis,
        revenue_analysis,
        top_clients,
    })
}
