//! Operational Intelligence Service - Workflow optimization and bottleneck analysis
//!
//! This service provides comprehensive analysis of workflow bottlenecks, process efficiency,
//! and resource utilization to identify areas for operational improvement.

use crate::db::Database;
use crate::db::InterventionResult;
use crate::domains::reports::domain::models::reports::{
    DateRange, InterventionBottleneck, OperationalIntelligenceReport, ProcessEfficiencyMetrics,
    ReportFilters, ReportMetadata, ResourceUtilization, StepBottleneck, WorkflowRecommendation,
};
use std::sync::Arc;
use tracing::{debug, error, info};

/// Service for operational intelligence and workflow optimization
pub struct OperationalIntelligenceService {
    db: Arc<Database>,
}

impl OperationalIntelligenceService {
    /// Create new operational intelligence service
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Generate comprehensive operational intelligence report
    pub fn generate_operational_report(
        &self,
        date_range: &DateRange,
        filters: &ReportFilters,
    ) -> InterventionResult<OperationalIntelligenceReport> {
        info!("Starting operational intelligence report generation for date_range: {:?}, filters: {:?}", date_range, filters);
        info!("Database connection check...");

        let metadata = ReportMetadata {
            title: "Operational Intelligence Report".to_string(),
            date_range: date_range.clone(),
            generated_at: chrono::Utc::now(),
            filters: filters.clone(),
            total_records: 0, // Will be updated
        };

        // Analyze step bottlenecks
        debug!("Analyzing step bottlenecks...");
        let step_bottlenecks = match self.analyze_step_bottlenecks(date_range, filters) {
            Ok(bottlenecks) => {
                info!(
                    "Step bottlenecks analysis completed successfully, found {} bottlenecks",
                    bottlenecks.len()
                );
                bottlenecks
            }
            Err(e) => {
                error!("Failed to analyze step bottlenecks: {}", e);
                return Err(e);
            }
        };

        // Analyze intervention bottlenecks
        debug!("Analyzing intervention bottlenecks...");
        let intervention_bottlenecks = match self
            .analyze_intervention_bottlenecks(date_range, filters)
        {
            Ok(bottlenecks) => {
                info!("Intervention bottlenecks analysis completed successfully, found {} bottlenecks", bottlenecks.len());
                bottlenecks
            }
            Err(e) => {
                error!("Failed to analyze intervention bottlenecks: {}", e);
                return Err(e);
            }
        };

        // Analyze resource utilization
        debug!("Analyzing resource utilization...");
        let resource_utilization = match self.analyze_resource_utilization(date_range, filters) {
            Ok(utilization) => {
                info!("Resource utilization analysis completed successfully, found {} utilization records", utilization.len());
                utilization
            }
            Err(e) => {
                error!("Failed to analyze resource utilization: {}", e);
                return Err(e);
            }
        };

        // Calculate process efficiency metrics
        debug!("Calculating process efficiency metrics...");
        let process_efficiency =
            match self.calculate_process_efficiency(&step_bottlenecks, &resource_utilization) {
                Ok(efficiency) => {
                    info!("Process efficiency calculation completed successfully");
                    efficiency
                }
                Err(e) => {
                    error!("Failed to calculate process efficiency: {}", e);
                    return Err(e);
                }
            };

        // Generate recommendations
        debug!("Generating workflow recommendations...");
        let recommendations = match self.generate_recommendations(
            &step_bottlenecks,
            &intervention_bottlenecks,
            &resource_utilization,
        ) {
            Ok(recommendations) => {
                info!(
                    "Recommendations generation completed successfully, found {} recommendations",
                    recommendations.len()
                );
                recommendations
            }
            Err(e) => {
                error!("Failed to generate recommendations: {}", e);
                return Err(e);
            }
        };

        let total_records = step_bottlenecks.len() as u64
            + intervention_bottlenecks.len() as u64
            + resource_utilization.len() as u64;

        info!("Operational intelligence report generation completed successfully with {} total records", total_records);

        Ok(OperationalIntelligenceReport {
            metadata: ReportMetadata {
                total_records,
                ..metadata
            },
            step_bottlenecks,
            intervention_bottlenecks,
            resource_utilization,
            process_efficiency,
            recommendations,
        })
    }

    /// Analyze bottlenecks at the step level
    fn analyze_step_bottlenecks(
        &self,
        date_range: &DateRange,
        _filters: &ReportFilters,
    ) -> InterventionResult<Vec<StepBottleneck>> {
        debug!(
            "Starting step bottlenecks analysis for date_range: {:?}",
            date_range
        );

        // Validate data availability
        let conn = match self.db.get_connection() {
            Ok(conn) => {
                info!("Database connection established successfully for operational intelligence");
                conn
            }
            Err(e) => {
                error!("Failed to get database connection: {}", e);
                return Err(e.into());
            }
        };

        // Check if required tables exist and have data
        let data_check: Result<i64, rusqlite::Error> = conn.query_row(
            "SELECT COUNT(*) FROM intervention_steps s
             INNER JOIN interventions i ON s.intervention_id = i.id
             WHERE i.created_at >= ? AND i.created_at <= ?
             AND s.duration_seconds IS NOT NULL
             AND s.step_status IN ('completed', 'failed', 'rework', 'paused')",
            rusqlite::params![date_range.start.timestamp(), date_range.end.timestamp()],
            |row| row.get(0),
        );

        match data_check {
            Ok(count) => {
                debug!(
                    "Found {} intervention steps with duration data in date range",
                    count
                );
                if count == 0 {
                    info!("No intervention step data found for the specified date range, returning empty bottlenecks list");
                    return Ok(Vec::new());
                }
            }
            Err(e) => {
                error!("Failed to check data availability: {}", e);
                return Err(e.into());
            }
        }

        // Query step performance metrics
        debug!(
            "Preparing step bottlenecks query with date_range: {:?}",
            date_range
        );
        let mut stmt = match conn.prepare(r#"
            SELECT
                s.step_number,
                s.step_name,
                s.step_type,
                COUNT(*) as total_occurrences,
                AVG(CASE WHEN s.duration_seconds IS NOT NULL THEN s.duration_seconds / 60.0 ELSE NULL END) as avg_duration_min,
                NULL as median_duration_min, -- Temporarily disabled complex median calculation
                MAX(s.duration_seconds / 60.0) as max_duration_min,
                COUNT(CASE WHEN s.step_status = 'failed' THEN 1 END) * 100.0 / COUNT(*) as failure_rate,
                COUNT(CASE WHEN s.step_status = 'rework' THEN 1 END) * 100.0 / COUNT(*) as rework_rate,
                COUNT(CASE WHEN s.step_status = 'paused' THEN 1 END) * 100.0 / COUNT(*) as pause_rate
            FROM intervention_steps s
            INNER JOIN interventions i ON s.intervention_id = i.id
            WHERE i.created_at >= ? AND i.created_at <= ?
                AND s.duration_seconds IS NOT NULL
                AND s.step_status IN ('completed', 'failed', 'rework', 'paused')
            GROUP BY s.step_number, s.step_name, s.step_type
            ORDER BY avg_duration_min DESC
        "#) {
            Ok(stmt) => {
                debug!("Step bottlenecks query prepared successfully");
                stmt
            }
            Err(e) => {
                error!("Failed to prepare step bottlenecks query: {}", e);
                return Err(e.into());
            }
        };

        let params = rusqlite::params![date_range.start.timestamp(), date_range.end.timestamp()];
        debug!(
            "Executing step bottlenecks query with parameters: start={}, end={}",
            date_range.start.timestamp(),
            date_range.end.timestamp()
        );

        let step_iter = match stmt.query_map(params, |row| {
            let avg_duration: Option<f64> = row.get(4)?;
            let failure_rate: f64 = row.get(6)?;
            let rework_rate: f64 = row.get(7)?;
            let pause_rate: f64 = row.get(8)?;

            // Calculate bottleneck severity based on duration and error rates
            let severity_score = (avg_duration.unwrap_or(0.0) / 60.0) + // Hours
                                   (failure_rate + rework_rate + pause_rate) / 10.0;

            let bottleneck_severity = if severity_score > 5.0 {
                "high"
            } else if severity_score > 2.0 {
                "medium"
            } else {
                "low"
            };

            Ok(StepBottleneck {
                step_number: row.get(0)?,
                step_name: row.get(1)?,
                step_type: row.get(2)?,
                average_duration_minutes: avg_duration.unwrap_or(0.0),
                median_duration_minutes: row.get::<_, Option<f64>>(5)?.unwrap_or(0.0),
                max_duration_minutes: row.get(6)?,
                failure_rate,
                rework_rate,
                pause_rate,
                total_occurrences: row.get(3)?,
                bottleneck_severity: bottleneck_severity.to_string(),
            })
        }) {
            Ok(iter) => {
                debug!("Step bottlenecks query executed successfully");
                iter
            }
            Err(e) => {
                error!("Failed to execute step bottlenecks query: {}", e);
                return Err(e.into());
            }
        };

        let mut bottlenecks = Vec::new();
        for bottleneck_result in step_iter {
            match bottleneck_result {
                Ok(bottleneck) => {
                    debug!(
                        "Processed bottleneck for step: {} - {}",
                        bottleneck.step_name, bottleneck.step_type
                    );
                    bottlenecks.push(bottleneck);
                }
                Err(e) => {
                    error!("Failed to process bottleneck row: {}", e);
                    return Err(e.into());
                }
            }
        }

        info!(
            "Step bottlenecks analysis completed, found {} bottlenecks",
            bottlenecks.len()
        );
        Ok(bottlenecks)
    }

    /// Analyze bottlenecks at the intervention level
    fn analyze_intervention_bottlenecks(
        &self,
        date_range: &DateRange,
        _filters: &ReportFilters,
    ) -> InterventionResult<Vec<InterventionBottleneck>> {
        let conn = self.db.get_connection()?;

        // Find interventions that have been stuck at the same step for too long
        let mut stmt = conn.prepare(r#"
            SELECT
                i.id,
                COALESCE(i.task_number, 'N/A') as task_number,
                COALESCE(i.technician_name, 'Unassigned') as technician_name,
                i.vehicle_plate,
                i.current_step,
                CASE
                    WHEN i.status = 'in_progress' THEN
                        (strftime('%s', 'now') - strftime('%s', i.started_at)) / 3600.0
                    ELSE 0.0
                END as time_at_current_step_hours,
                CASE
                    WHEN i.actual_duration IS NOT NULL THEN i.actual_duration / 60.0
                    ELSE (strftime('%s', 'now') - strftime('%s', i.started_at)) / 3600.0
                END as total_duration_hours,
                CASE
                    WHEN i.estimated_duration IS NOT NULL AND i.actual_duration IS NOT NULL THEN
                        i.actual_duration * 1.0 / i.estimated_duration
                    ELSE 1.0
                END as estimated_vs_actual_ratio,
                COALESCE(t.priority, 'medium') as priority
            FROM interventions i
            LEFT JOIN tasks t ON i.task_id = t.id
            WHERE i.created_at >= ? AND i.created_at <= ?
                AND i.status IN ('in_progress', 'paused')
                AND (strftime('%s', 'now') - strftime('%s', i.updated_at)) > 3600 -- Stuck for > 1 hour
            ORDER BY time_at_current_step_hours DESC
            LIMIT 50
        "#)?;

        let intervention_iter = stmt.query_map(
            rusqlite::params![date_range.start.timestamp(), date_range.end.timestamp()],
            |row| {
                Ok(InterventionBottleneck {
                    intervention_id: row.get(0)?,
                    task_number: row.get(1)?,
                    technician_name: row.get(2)?,
                    vehicle_plate: row.get(3)?,
                    stuck_at_step: row.get(4)?,
                    time_at_current_step_hours: row.get(5)?,
                    total_duration_hours: row.get(6)?,
                    estimated_vs_actual_ratio: row.get(7)?,
                    priority: row.get(8)?,
                })
            },
        )?;

        let mut bottlenecks = Vec::new();
        for bottleneck in intervention_iter {
            bottlenecks.push(bottleneck?);
        }

        Ok(bottlenecks)
    }

    /// Analyze resource utilization across technicians
    fn analyze_resource_utilization(
        &self,
        date_range: &DateRange,
        _filters: &ReportFilters,
    ) -> InterventionResult<Vec<ResourceUtilization>> {
        let conn = self.db.get_connection()?;

        // Analyze technician workload and utilization
        let mut stmt = conn.prepare(r#"
            SELECT
                COALESCE(i.technician_id, 'unassigned') as technician_id,
                COALESCE(i.technician_name, 'Unassigned') as technician_name,
                COUNT(CASE WHEN i.status = 'in_progress' THEN 1 END) as active_interventions,
                COUNT(CASE WHEN i.status = 'completed' AND date(i.completed_at) = date('now') THEN 1 END) as completed_today,
                AVG(CASE WHEN i.actual_duration IS NOT NULL THEN i.actual_duration / 60.0 ELSE NULL END) as avg_completion_hours,
                COUNT(*) * 100.0 / (SELECT COUNT(*) FROM interventions WHERE created_at >= ? AND created_at <= ?) as utilization_percentage
            FROM interventions i
            WHERE i.created_at >= ? AND i.created_at <= ?
            GROUP BY i.technician_id, i.technician_name
            ORDER BY active_interventions DESC
        "#)?;

        let utilization_iter = stmt.query_map(
            rusqlite::params![
                date_range.start.timestamp(),
                date_range.end.timestamp(),
                date_range.start.timestamp(),
                date_range.end.timestamp()
            ],
            |row| {
                // Calculate workload distribution by time periods
                let technician_id = row.get::<_, String>(0)?;
                let workload_periods =
                    self.calculate_workload_periods(&technician_id, date_range)?;

                Ok(ResourceUtilization {
                    technician_id: row.get(0)?,
                    technician_name: row.get(1)?,
                    active_interventions: row.get(2)?,
                    completed_today: row.get(3)?,
                    average_completion_time_hours: row.get(4)?,
                    utilization_percentage: row.get(5)?,
                    workload_distribution: workload_periods,
                })
            },
        )?;

        let mut utilization = Vec::new();
        for util in utilization_iter {
            utilization.push(util?);
        }

        Ok(utilization)
    }

    /// Calculate workload distribution by time periods for a technician
    fn calculate_workload_periods(
        &self,
        technician_id: &str,
        date_range: &DateRange,
    ) -> Result<
        Vec<crate::domains::reports::domain::models::reports::WorkloadPeriod>,
        rusqlite::Error,
    > {
        let conn = self
            .db
            .get_connection()
            .map_err(|_e| rusqlite::Error::InvalidQuery)?;

        let mut stmt = conn.prepare(r#"
            SELECT
                CASE
                    WHEN strftime('%H', i.started_at) < '12' THEN 'morning'
                    WHEN strftime('%H', i.started_at) < '18' THEN 'afternoon'
                    ELSE 'evening'
                END as period,
                COUNT(*) as interventions_count,
                AVG(CASE WHEN i.actual_duration IS NOT NULL THEN i.actual_duration / 60.0 ELSE NULL END) as avg_duration
            FROM interventions i
            WHERE i.technician_id = ?
                AND i.created_at >= ?
                AND i.created_at <= ?
            GROUP BY period
            ORDER BY
                CASE period
                    WHEN 'morning' THEN 1
                    WHEN 'afternoon' THEN 2
                    WHEN 'evening' THEN 3
                END
        "#)?;

        let period_iter = stmt.query_map(
            rusqlite::params![
                technician_id,
                date_range.start.timestamp(),
                date_range.end.timestamp()
            ],
            |row| {
                Ok(
                    crate::domains::reports::domain::models::reports::WorkloadPeriod {
                        period: row.get(0)?,
                        interventions_count: row.get(1)?,
                        average_duration_hours: row.get(2)?,
                    },
                )
            },
        )?;

        let mut periods = Vec::new();
        for period in period_iter {
            periods.push(period?);
        }

        Ok(periods)
    }

    /// Calculate overall process efficiency metrics
    fn calculate_process_efficiency(
        &self,
        step_bottlenecks: &[StepBottleneck],
        resource_utilization: &[ResourceUtilization],
    ) -> InterventionResult<ProcessEfficiencyMetrics> {
        // Calculate average step completion time
        let avg_step_time = if !step_bottlenecks.is_empty() {
            step_bottlenecks
                .iter()
                .map(|b| b.average_duration_minutes)
                .sum::<f64>()
                / step_bottlenecks.len() as f64
        } else {
            0.0
        };

        // Calculate step success rate (inverse of failure rate)
        let step_success_rate = if !step_bottlenecks.is_empty() {
            let total_failure_rate = step_bottlenecks.iter().map(|b| b.failure_rate).sum::<f64>()
                / step_bottlenecks.len() as f64;
            100.0 - total_failure_rate
        } else {
            100.0
        };

        // Calculate rework percentage
        let rework_percentage = if !step_bottlenecks.is_empty() {
            step_bottlenecks.iter().map(|b| b.rework_rate).sum::<f64>()
                / step_bottlenecks.len() as f64
        } else {
            0.0
        };

        // Calculate resource utilization rate
        let resource_utilization_rate = if !resource_utilization.is_empty() {
            resource_utilization
                .iter()
                .map(|r| r.utilization_percentage)
                .sum::<f64>()
                / resource_utilization.len() as f64
        } else {
            0.0
        };

        // Calculate bottleneck impact score (0-100, higher is worse)
        let bottleneck_impact = if !step_bottlenecks.is_empty() {
            let high_severity_count = step_bottlenecks
                .iter()
                .filter(|b| b.bottleneck_severity == "high")
                .count();
            (high_severity_count as f64 / step_bottlenecks.len() as f64) * 100.0
        } else {
            0.0
        };

        // Overall efficiency score (0-100, higher is better)
        let overall_efficiency = 100.0
            - (rework_percentage
                + (100.0 - step_success_rate)
                + (100.0 - resource_utilization_rate) * 0.5
                + bottleneck_impact * 0.2)
                .min(100.0);

        Ok(ProcessEfficiencyMetrics {
            overall_efficiency_score: overall_efficiency.max(0.0),
            average_step_completion_time: avg_step_time,
            step_success_rate,
            rework_percentage,
            resource_utilization_rate,
            bottleneck_impact_score: bottleneck_impact,
        })
    }

    /// Generate workflow optimization recommendations
    fn generate_recommendations(
        &self,
        step_bottlenecks: &[StepBottleneck],
        intervention_bottlenecks: &[InterventionBottleneck],
        resource_utilization: &[ResourceUtilization],
    ) -> InterventionResult<Vec<WorkflowRecommendation>> {
        let mut recommendations = Vec::new();

        // Recommendation 1: Address high-severity step bottlenecks
        if let Some(high_bottleneck) = step_bottlenecks
            .iter()
            .find(|b| b.bottleneck_severity == "high")
        {
            recommendations.push(WorkflowRecommendation {
                recommendation_type: "bottleneck_resolution".to_string(),
                priority: "high".to_string(),
                description: format!(
                    "Optimize {} step (Step {}) - currently taking {:.1} minutes on average with {:.1}% failure rate",
                    high_bottleneck.step_name,
                    high_bottleneck.step_number,
                    high_bottleneck.average_duration_minutes,
                    high_bottleneck.failure_rate
                ),
                impact_score: 85.0,
                implementation_effort: "medium".to_string(),
                affected_steps: vec![high_bottleneck.step_number],
                affected_technicians: vec![],
            });
        }

        // Recommendation 2: Reallocate resources for stuck interventions
        if !intervention_bottlenecks.is_empty() {
            let stuck_count = intervention_bottlenecks.len();
            recommendations.push(WorkflowRecommendation {
                recommendation_type: "resource_reallocation".to_string(),
                priority: "high".to_string(),
                description: format!(
                    "Reallocate resources to resolve {} stuck interventions to prevent further delays",
                    stuck_count
                ),
                impact_score: 90.0,
                implementation_effort: "low".to_string(),
                affected_steps: vec![],
                affected_technicians: intervention_bottlenecks.iter()
                    .map(|b| b.technician_name.clone())
                    .collect(),
            });
        }

        // Recommendation 3: Balance technician workload
        if let Some(overloaded_tech) = resource_utilization
            .iter()
            .find(|r| r.active_interventions > 3)
        {
            recommendations.push(WorkflowRecommendation {
                recommendation_type: "resource_reallocation".to_string(),
                priority: "medium".to_string(),
                description: format!(
                    "Balance workload for {} who has {} active interventions",
                    overloaded_tech.technician_name, overloaded_tech.active_interventions
                ),
                impact_score: 70.0,
                implementation_effort: "low".to_string(),
                affected_steps: vec![],
                affected_technicians: vec![overloaded_tech.technician_name.clone()],
            });
        }

        // Recommendation 4: Process improvement for high rework rates
        if let Some(high_rework_step) = step_bottlenecks.iter().find(|b| b.rework_rate > 10.0) {
            recommendations.push(WorkflowRecommendation {
                recommendation_type: "process_improvement".to_string(),
                priority: "medium".to_string(),
                description: format!(
                    "Review and improve {} process - {:.1}% rework rate indicates quality issues",
                    high_rework_step.step_name, high_rework_step.rework_rate
                ),
                impact_score: 75.0,
                implementation_effort: "high".to_string(),
                affected_steps: vec![high_rework_step.step_number],
                affected_technicians: vec![],
            });
        }

        // Sort by impact score descending
        recommendations.sort_by(|a, b| b.impact_score.partial_cmp(&a.impact_score).unwrap());

        Ok(recommendations)
    }
}
