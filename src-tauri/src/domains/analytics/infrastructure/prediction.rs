//! Prediction service for completion time forecasting and analytics
//!
//! This service provides statistical models for predicting task completion times
//! based on historical data and various factors.

use crate::commands::AppError;
use crate::db::Database;
pub use crate::shared::contracts::prediction::CompletionTimePrediction;
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

/// Demand forecasting result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemandForecast {
    pub period: String,
    pub predicted_tasks: u64,
    pub confidence_level: f64,
    pub trend_direction: String, // "increasing", "decreasing", "stable"
    pub seasonal_factor: f64,
}

/// Prediction service for analytics
#[derive(Debug)]
pub struct PredictionService {
    db: Database,
}

impl PredictionService {
    /// Create a new prediction service
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Predict completion time for a task based on historical data
    pub async fn predict_completion_time(
        &self,
        technician_id: Option<String>,
        task_type: Option<String>,
        priority: Option<String>,
        current_hour: u8,
        current_month: u8,
    ) -> Result<CompletionTimePrediction, AppError> {
        let conn = self.db.get_connection()?;

        // Build query for historical completion times
        let mut query_parts = vec![
            "SELECT",
            "  AVG(JULIANDAY(completed_at) - JULIANDAY(created_at)) * 24 * 60 as avg_duration,",
            "  COUNT(*) as sample_size,",
            "  STDDEV(JULIANDAY(completed_at) - JULIANDAY(created_at)) * 24 * 60 as std_dev",
            "FROM interventions",
            "WHERE completed_at IS NOT NULL",
            "  AND status = 'completed'",
            "  AND created_at >= date('now', '-90 days')", // Last 90 days
        ];

        let mut params = Vec::new();

        // Add filters
        if let Some(tech_id) = &technician_id {
            query_parts.push("  AND technician_id = ?");
            params.push(tech_id.clone());
        }

        if let Some(task_type_val) = &task_type {
            query_parts.push("  AND task_type = ?");
            params.push(task_type_val.clone());
        }

        if let Some(priority_val) = &priority {
            query_parts.push("  AND priority = ?");
            params.push(priority_val.clone());
        }

        // Add time-based factors
        query_parts.push("  AND strftime('%H', created_at) = ?");
        params.push(current_hour.to_string());

        query_parts.push("  AND strftime('%m', created_at) = ?");
        params.push(format!("{:02}", current_month));

        let sql = query_parts.join("\n");

        let mut stmt = conn.prepare(&sql)?;
        let mut rows = stmt.query(rusqlite::params_from_iter(params))?;

        let (avg_duration, sample_size, std_dev) = if let Some(row) = rows.next()? {
            (
                row.get::<_, Option<f64>>(0)?.unwrap_or(60.0), // Default 1 hour
                row.get::<_, u64>(1)?,
                row.get::<_, Option<f64>>(2)?.unwrap_or(30.0), // Default 30 min std dev
            )
        } else {
            // Fallback to general averages
            (60.0, 10, 30.0)
        };

        // Calculate confidence interval (95% confidence)
        let margin_of_error = 1.96 * (std_dev / (sample_size as f64).sqrt());
        let confidence_interval = (
            (avg_duration - margin_of_error).max(5.0), // Minimum 5 minutes
            avg_duration + margin_of_error,
        );

        // Determine influencing factors
        let mut factors = Vec::new();
        if technician_id.is_some() {
            factors.push("Technician performance".to_string());
        }
        if task_type.is_some() {
            factors.push("Task type complexity".to_string());
        }
        if priority.is_some() {
            factors.push("Priority level".to_string());
        }
        factors.push("Time of day".to_string());
        factors.push("Seasonal patterns".to_string());

        // Calculate prediction accuracy based on sample size
        let prediction_accuracy = if sample_size > 100 {
            85.0
        } else if sample_size > 50 {
            75.0
        } else if sample_size > 10 {
            65.0
        } else {
            50.0
        };

        Ok(CompletionTimePrediction {
            predicted_duration_minutes: avg_duration,
            confidence_interval,
            factors_influencing: factors,
            historical_average: avg_duration,
            prediction_accuracy,
        })
    }

    /// Forecast demand for upcoming periods
    pub async fn forecast_demand(
        &self,
        periods_ahead: u8,
        period_type: &str, // "daily", "weekly", "monthly"
    ) -> Result<Vec<DemandForecast>, AppError> {
        let conn = self.db.get_connection()?;

        let mut forecasts = Vec::new();

        for i in 1..=periods_ahead {
            let (period_str, sql_period) = match period_type {
                "daily" => {
                    let future_date = Utc::now() + Duration::days(i as i64);
                    (
                        future_date.format("%Y-%m-%d").to_string(),
                        format!("date('now', '+{} days')", i),
                    )
                }
                "weekly" => {
                    let future_date = Utc::now() + Duration::weeks(i as i64);
                    (
                        format!("Week of {}", future_date.format("%Y-%m-%d")),
                        format!("date('now', '+{} days')", i * 7),
                    )
                }
                "monthly" => {
                    let future_date = Utc::now() + Duration::days((i as i32 * 30) as i64);
                    (
                        future_date.format("%Y-%m").to_string(),
                        format!("date('now', '+{} months')", i),
                    )
                }
                _ => continue,
            };

            // Calculate historical average for similar periods
            let historical_sql = format!(
                r#"
                SELECT
                    AVG(daily_count) as avg_tasks,
                    STDDEV(daily_count) as std_dev,
                    COUNT(*) as sample_size
                FROM (
                    SELECT
                        DATE(created_at) as task_date,
                        COUNT(*) as daily_count
                    FROM interventions
                    WHERE created_at >= date('now', '-90 days')
                      AND strftime('%w', created_at) = strftime('%w', {})
                    GROUP BY DATE(created_at)
                )
            "#,
                sql_period
            );

            let mut stmt = conn.prepare(&historical_sql)?;
            let mut rows = stmt.query([])?;

            let (avg_tasks, _std_dev, sample_size) = if let Some(row) = rows.next()? {
                (
                    row.get::<_, Option<f64>>(0)?.unwrap_or(5.0) as u64,
                    row.get::<_, Option<f64>>(1)?.unwrap_or(2.0),
                    row.get::<_, u64>(2)?,
                )
            } else {
                (5, 2.0, 1)
            };

            // Calculate trend direction (simplified)
            let trend_sql = r#"
                SELECT
                    AVG(CASE WHEN created_at >= date('now', '-30 days') THEN 1.0 ELSE 0.0 END) as recent_ratio,
                    AVG(CASE WHEN created_at >= date('now', '-60 days') AND created_at < date('now', '-30 days') THEN 1.0 ELSE 0.0 END) as older_ratio
                FROM interventions
                WHERE created_at >= date('now', '-60 days')
            "#;

            let trend_direction = {
                let mut stmt = conn.prepare(trend_sql)?;
                let mut rows = stmt.query([])?;

                if let Some(row) = rows.next()? {
                    let recent: f64 = row.get(0)?;
                    let older: f64 = row.get(1)?;

                    if recent > older * 1.1 {
                        "increasing"
                    } else if recent < older * 0.9 {
                        "decreasing"
                    } else {
                        "stable"
                    }
                } else {
                    "stable"
                }
            };

            // Calculate seasonal factor (simplified)
            let seasonal_factor = match period_type {
                "daily" => {
                    let day_of_week = (Utc::now() + Duration::days(i as i64))
                        .format("%w")
                        .to_string();
                    match day_of_week.as_str() {
                        "1" | "2" | "3" | "4" | "5" => 1.2, // Weekdays
                        _ => 0.8,                           // Weekends
                    }
                }
                "weekly" => 1.0,
                "monthly" => {
                    let month = (Utc::now() + Duration::days((i as i32 * 30) as i64))
                        .format("%m")
                        .to_string();
                    match month.as_str() {
                        "06" | "07" | "08" => 1.3, // Summer peak
                        "12" | "01" | "02" => 0.9, // Winter slow
                        _ => 1.0,
                    }
                }
                _ => 1.0,
            };

            let predicted_tasks = ((avg_tasks as f64 * seasonal_factor) as u64).max(1);
            let confidence_level = if sample_size > 30 { 80.0 } else { 60.0 };

            forecasts.push(DemandForecast {
                period: period_str,
                predicted_tasks,
                confidence_level,
                trend_direction: trend_direction.to_string(),
                seasonal_factor,
            });
        }

        Ok(forecasts)
    }

    /// Get resource planning recommendations
    pub async fn get_resource_planning_recommendations(&self) -> Result<Vec<String>, AppError> {
        let conn = self.db.get_connection()?;

        let sql = r#"
            SELECT
                strftime('%H', created_at) as hour,
                COUNT(*) as task_count,
                AVG(JULIANDAY(completed_at) - JULIANDAY(created_at)) * 24 * 60 as avg_duration
            FROM interventions
            WHERE created_at >= date('now', '-30 days')
              AND completed_at IS NOT NULL
            GROUP BY hour
            ORDER BY task_count DESC
            LIMIT 5
        "#;

        let mut stmt = conn.prepare(sql)?;
        let peak_hours: Vec<(String, u64, f64)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, u64>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let mut recommendations = Vec::new();

        if let Some((peak_hour, task_count, avg_duration)) = peak_hours.first() {
            recommendations.push(format!(
                "Schedule additional technicians during peak hour {} ({} tasks, avg {} min completion)",
                peak_hour, task_count, avg_duration.round()
            ));
        }

        // Check for technician utilization
        let technician_sql = r#"
            SELECT
                technician_id,
                COUNT(*) as task_count,
                AVG(JULIANDAY(completed_at) - JULIANDAY(created_at)) * 24 as avg_days
            FROM interventions
            WHERE created_at >= date('now', '-30 days')
              AND technician_id IS NOT NULL
              AND completed_at IS NOT NULL
            GROUP BY technician_id
            ORDER BY task_count DESC
            LIMIT 3
        "#;

        let mut stmt = conn.prepare(technician_sql)?;
        let top_technicians: Vec<(String, u64, f64)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, u64>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        for (tech_id, task_count, avg_days) in top_technicians {
            if task_count > 20 && avg_days > 2.0 {
                recommendations.push(format!(
                    "Technician {} has high workload ({} tasks, {} days avg completion) - consider workload balancing",
                    tech_id, task_count, avg_days.round()
                ));
            }
        }

        if recommendations.is_empty() {
            recommendations.push("Current resource allocation appears optimal".to_string());
        }

        Ok(recommendations)
    }
}
