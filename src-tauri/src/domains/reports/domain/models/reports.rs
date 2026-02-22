//! Reports module - Data structures for analytics and reporting
//!
//! This module contains all the data structures needed for generating
//! comprehensive reports across different business domains.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
// Conditional import removed
use ts_rs::TS;

use crate::shared::contracts::prediction::CompletionTimePrediction;

/// Report metadata information
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ReportMetadata {
    pub title: String,
    pub date_range: DateRange,
    #[ts(type = "string")]
    pub generated_at: DateTime<Utc>,
    pub filters: ReportFilters,
    pub total_records: u64,
}

/// Date range for reports
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DateRange {
    #[ts(type = "string")]
    pub start: DateTime<Utc>,
    #[ts(type = "string")]
    pub end: DateTime<Utc>,
}

/// Report filters
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ReportFilters {
    pub technician_ids: Option<Vec<String>>,
    pub client_ids: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
    pub priorities: Option<Vec<String>>,
    pub ppf_zones: Option<Vec<String>>,
    pub vehicle_models: Option<Vec<String>>,
}

/// Report types enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[derive(TS)]
pub enum ReportType {
    Overview,
    DataExplorer,
    Tasks,
    Technicians,
    Clients,
    Quality,
    Materials,
    Geographic,
    Seasonal,
    OperationalIntelligence,
}

/// Export formats
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(TS)]
pub enum ExportFormat {
    Pdf,
    Csv,
    Excel,
}

/// Entity types for data explorer
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(TS)]
pub enum EntityType {
    Tasks,
    Clients,
    Interventions,
}

/// Search result for data explorer
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SearchResult {
    pub id: String,
    pub entity_type: crate::domains::sync::domain::models::sync::EntityType,
    pub title: String,
    pub subtitle: String,
    pub status: Option<String>,
    pub date: Option<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

/// Search filters for data explorer
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
pub struct SearchFilters {
    pub technician_ids: Option<Vec<String>>,
    pub client_ids: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
    pub priorities: Option<Vec<String>>,
    pub ppf_zones: Option<Vec<String>>,
    pub vehicle_models: Option<Vec<String>>,
}

/// Search response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total_count: u64,
    pub has_more: bool,
}

/// Task completion report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TaskCompletionReport {
    pub metadata: ReportMetadata,
    pub summary: TaskCompletionSummary,
    pub daily_breakdown: Vec<DailyTaskData>,
    pub status_distribution: Vec<StatusCount>,
    pub technician_breakdown: Vec<TechnicianTaskData>,
}

/// Task completion summary
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TaskCompletionSummary {
    pub total_tasks: u64,
    pub completed_tasks: u64,
    pub completion_rate: f64,
    pub average_duration: Option<f64>, // in minutes
    pub on_time_completion_rate: f64,
}

/// Daily task data
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DailyTaskData {
    #[ts(type = "string")]
    pub date: DateTime<Utc>,
    pub total: u64,
    pub completed: u64,
    pub in_progress: u64,
    pub pending: u64,
    pub cancelled: u64,
}

/// Status count
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct StatusCount {
    pub status: String,
    pub count: u64,
    pub percentage: f64,
}

/// Technician task data
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TechnicianTaskData {
    pub technician_id: String,
    pub technician_name: String,
    pub tasks_completed: u64,
    pub average_time_per_task: Option<f64>,
    pub quality_score: Option<f64>,
}

/// Technician performance report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TechnicianPerformanceReport {
    pub metadata: ReportMetadata,
    pub technicians: Vec<TechnicianPerformance>,
    pub benchmarks: PerformanceBenchmarks,
    pub trends: Vec<PerformanceTrend>,
}

/// Individual technician performance
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TechnicianPerformance {
    pub id: String,
    pub name: String,
    pub metrics: TechnicianMetrics,
    pub trends: Vec<PerformanceTrend>,
}

/// Technician metrics
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TechnicianMetrics {
    pub tasks_completed: u64,
    pub average_time_per_task: f64,
    pub quality_score: f64,
    pub customer_satisfaction: f64,
    pub utilization_rate: f64,
    pub efficiency_score: f64,
}

/// Performance benchmarks
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct PerformanceBenchmarks {
    pub top_performer_score: f64,
    pub team_average: f64,
    pub industry_average: f64,
}

/// Performance trend data
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct PerformanceTrend {
    pub period: String,
    pub performance_score: f64,
    pub tasks_completed: u64,
}

/// Client analytics report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientAnalyticsReport {
    pub metadata: ReportMetadata,
    pub summary: ClientSummary,
    pub retention_analysis: RetentionAnalysis,
    pub revenue_analysis: RevenueAnalysis,
    pub top_clients: Vec<ClientPerformance>,
}

/// Client summary
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientSummary {
    pub total_clients: u64,
    pub new_clients_this_period: u64,
    pub returning_clients: u64,
    pub retention_rate: f64,
    pub average_revenue_per_client: f64,
}

/// Retention analysis
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct RetentionAnalysis {
    pub new_client_rate: f64,
    pub repeat_client_rate: f64,
    pub churn_rate: f64,
    pub lifetime_value: f64,
}

/// Revenue analysis
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct RevenueAnalysis {
    pub total_revenue: f64,
    pub revenue_by_client_type: HashMap<String, f64>,
    pub average_revenue_per_task: f64,
    pub revenue_growth_rate: f64,
}

/// Client performance data
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ClientPerformance {
    pub id: String,
    pub name: String,
    pub customer_type: String,
    pub total_revenue: f64,
    pub tasks_completed: u64,
    pub average_revenue_per_task: f64,
    pub satisfaction_score: Option<f64>,
    pub retention_status: bool,
}

/// Quality compliance report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QualityComplianceReport {
    pub metadata: ReportMetadata,
    pub summary: QualitySummary,
    pub quality_trends: Vec<QualityTrend>,
    pub common_issues: Vec<QualityIssue>,
    pub compliance_metrics: ComplianceMetrics,
}

/// Quality summary
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QualitySummary {
    pub overall_quality_score: f64,
    pub photo_compliance_rate: f64,
    pub step_completion_accuracy: f64,
    pub defect_rate: f64,
}

/// Quality trend data
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QualityTrend {
    #[ts(type = "string")]
    pub date: DateTime<Utc>,
    pub quality_score: f64,
    pub photo_compliance: f64,
    pub step_accuracy: f64,
}

/// Quality issue
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QualityIssue {
    pub issue_type: String,
    pub count: u64,
    pub percentage: f64,
    pub severity: String,
    pub recommended_action: String,
}

/// Compliance metrics
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ComplianceMetrics {
    pub documentation_completeness: f64,
    pub photo_quality_score: f64,
    pub workflow_adherence: f64,
    pub safety_compliance: f64,
}

/// Material usage report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct MaterialUsageReport {
    pub metadata: ReportMetadata,
    pub summary: MaterialSummary,
    pub consumption_breakdown: Vec<ReportMaterialConsumption>,
    pub cost_analysis: MaterialCostAnalysis,
    pub efficiency_metrics: MaterialEfficiency,
}

/// Material summary
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct MaterialSummary {
    pub total_material_cost: f64,
    pub cost_per_task: f64,
    pub waste_percentage: f64,
    pub inventory_turnover: f64,
}

/// Material consumption data for reports
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ReportMaterialConsumption {
    pub material_id: String,
    pub material_name: String,
    pub material_type: String,
    pub quantity_used: f64,
    pub unit_cost: f64,
    pub total_cost: f64,
    pub waste_quantity: f64,
}

/// Material cost analysis
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct MaterialCostAnalysis {
    pub cost_by_material_type: HashMap<String, f64>,
    pub cost_trends: Vec<CostTrend>,
    pub supplier_performance: Vec<SupplierPerformance>,
}

/// Cost trend data
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CostTrend {
    pub period: String,
    pub material_cost: f64,
    pub cost_per_task: f64,
}

/// Supplier performance
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SupplierPerformance {
    pub supplier_name: String,
    pub material_type: String,
    pub total_cost: f64,
    pub quality_score: f64,
    pub delivery_reliability: f64,
}

/// Material efficiency metrics
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct MaterialEfficiency {
    pub utilization_rate: f64,
    pub waste_reduction_rate: f64,
    pub cost_efficiency_score: f64,
    pub inventory_optimization: f64,
}

/// Geographic analytics report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GeographicReport {
    pub metadata: ReportMetadata,
    pub heat_map_data: Vec<HeatMapPoint>,
    pub service_areas: Vec<ServiceArea>,
    pub geographic_stats: GeographicStats,
}

/// Heat map point for geographic visualization
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct HeatMapPoint {
    pub latitude: f64,
    pub longitude: f64,
    pub intensity: u32,
    pub intervention_count: u32,
}

/// Service area analysis
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ServiceArea {
    pub center_lat: f64,
    pub center_lon: f64,
    pub coverage_radius_km: f64,
    pub intervention_count: u32,
    pub unique_clients: u32,
}

/// Geographic statistics
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GeographicStats {
    pub total_points: u32,
    pub unique_locations: u32,
    pub average_cluster_density: f64,
    pub coverage_area_km2: f64,
}

/// Seasonal trend analysis report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SeasonalReport {
    pub metadata: ReportMetadata,
    pub seasonal_patterns: Vec<SeasonalPattern>,
    pub weather_correlation: WeatherCorrelation,
    pub peak_periods: Vec<PeakPeriod>,
    pub performance_trends: Vec<PerformanceTrend>,
    pub completion_predictions: Vec<CompletionTimePrediction>,
}

/// Seasonal pattern analysis
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SeasonalPattern {
    pub season: String,
    pub month: u8,
    pub average_tasks_per_day: f64,
    pub completion_rate: f64,
    pub average_duration_minutes: f64,
    pub common_issue_types: Vec<String>,
}

/// Weather correlation analysis
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WeatherCorrelation {
    pub temperature_impact: f64,
    pub precipitation_impact: f64,
    pub wind_impact: f64,
    pub seasonal_adjustment_factor: f64,
}

/// Peak period identification
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct PeakPeriod {
    pub period_type: String, // "hour", "day_of_week", "month"
    pub period_value: String,
    pub task_volume: u64,
    pub average_completion_time: f64,
    pub resource_utilization: f64,
}

/// Export result
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ExportResult {
    pub download_url: Option<String>,
    pub content: Option<String>, // Base64 encoded content for small files
    pub file_name: String,
    pub file_size: u64,
    pub format: ExportFormat,
    #[ts(type = "string")]
    pub expires_at: DateTime<Utc>,
}

/// Individual intervention report result
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct InterventionReportResult {
    pub success: bool,
    pub download_url: Option<String>,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub format: String,
    pub file_size: Option<u64>,
    #[ts(type = "string")]
    pub generated_at: DateTime<Utc>,
}

/// Complete intervention data for report generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteInterventionData {
    pub intervention: crate::domains::interventions::domain::models::intervention::Intervention,
    pub workflow_steps: Vec<crate::domains::interventions::domain::models::step::InterventionStep>,
    pub photos: Vec<crate::domains::documents::domain::models::photo::Photo>,
    pub client: Option<crate::domains::clients::domain::models::client::Client>,
}

/// Step bottleneck analysis
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct StepBottleneck {
    pub step_number: i32,
    pub step_name: String,
    pub step_type: String,
    pub average_duration_minutes: f64,
    pub median_duration_minutes: f64,
    pub max_duration_minutes: f64,
    pub failure_rate: f64,
    pub rework_rate: f64,
    pub pause_rate: f64,
    pub total_occurrences: u64,
    pub bottleneck_severity: String, // "high", "medium", "low"
}

/// Intervention bottleneck analysis
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct InterventionBottleneck {
    pub intervention_id: String,
    pub task_number: String,
    pub technician_name: String,
    pub vehicle_plate: String,
    pub stuck_at_step: i32,
    pub time_at_current_step_hours: f64,
    pub total_duration_hours: f64,
    pub estimated_vs_actual_ratio: f64,
    pub priority: String,
}

/// Resource utilization metrics
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ResourceUtilization {
    pub technician_id: String,
    pub technician_name: String,
    pub active_interventions: u64,
    pub completed_today: u64,
    pub average_completion_time_hours: f64,
    pub utilization_percentage: f64,
    pub workload_distribution: Vec<WorkloadPeriod>,
}

/// Workload period breakdown
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkloadPeriod {
    pub period: String, // "morning", "afternoon", "evening"
    pub interventions_count: u64,
    pub average_duration_hours: f64,
}

/// Process efficiency metrics
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ProcessEfficiencyMetrics {
    pub overall_efficiency_score: f64,
    pub average_step_completion_time: f64,
    pub step_success_rate: f64,
    pub rework_percentage: f64,
    pub resource_utilization_rate: f64,
    pub bottleneck_impact_score: f64,
}

/// Workflow optimization recommendations
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowRecommendation {
    pub recommendation_type: String, // "bottleneck_resolution", "resource_reallocation", "process_improvement"
    pub priority: String,            // "high", "medium", "low"
    pub description: String,
    pub impact_score: f64,
    pub implementation_effort: String, // "low", "medium", "high"
    pub affected_steps: Vec<i32>,
    pub affected_technicians: Vec<String>,
}

/// Operational intelligence report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct OperationalIntelligenceReport {
    pub metadata: ReportMetadata,
    pub step_bottlenecks: Vec<StepBottleneck>,
    pub intervention_bottlenecks: Vec<InterventionBottleneck>,
    pub resource_utilization: Vec<ResourceUtilization>,
    pub process_efficiency: ProcessEfficiencyMetrics,
    pub recommendations: Vec<WorkflowRecommendation>,
}

/// Overview report combining all individual reports
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct OverviewReport {
    pub task_completion: TaskCompletionReport,
    pub technician_performance: TechnicianPerformanceReport,
    pub client_analytics: ClientAnalyticsReport,
    pub quality_compliance: QualityComplianceReport,
    pub material_usage: MaterialUsageReport,
    pub geographic: GeographicReport,
    pub seasonal: SeasonalReport,
    pub operational_intelligence: OperationalIntelligenceReport,
}

/// Report generation request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ReportRequest {
    pub report_type: ReportType,
    pub date_range: DateRange,
    pub filters: ReportFilters,
    pub format: Option<ExportFormat>,
}

/// Report generation response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ReportResponse {
    pub report_id: String,
    pub status: ReportStatus,
    pub progress: f64,
    #[ts(type = "string")]
    pub estimated_completion: Option<DateTime<Utc>>,
    pub result: Option<ExportResult>,
}

/// Analytics KPI categories
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[derive(TS)]
pub enum KpiCategory {
    Operational,
    Financial,
    Quality,
    Efficiency,
    ClientSatisfaction,
}

/// KPI trend direction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(TS)]
pub enum TrendDirection {
    Up,
    Down,
    Stable,
    Unknown,
}

/// Calculation period
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(TS)]
pub enum CalculationPeriod {
    Hourly,
    Daily,
    Weekly,
    Monthly,
}

/// Analytics KPI definition and current value
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsKpi {
    pub id: String,
    pub kpi_name: String,
    pub kpi_category: KpiCategory,
    pub display_name: String,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub calculation_method: String,

    // Current values
    pub current_value: Option<f64>,
    pub previous_value: Option<f64>,
    pub target_value: Option<f64>,
    pub trend_direction: Option<TrendDirection>,

    // Metadata
    #[ts(type = "string")]
    pub last_calculated: Option<DateTime<Utc>>,
    pub calculation_period: CalculationPeriod,
    pub is_active: bool,
    pub priority: i32,
}

impl crate::db::FromSqlRow for AnalyticsKpi {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(AnalyticsKpi {
            id: row.get(0)?,
            kpi_name: row.get(1)?,
            kpi_category: serde_json::from_str(&row.get::<_, String>(2)?)
                .unwrap_or(KpiCategory::Operational),
            display_name: row.get(3)?,
            description: row.get(4)?,
            unit: row.get(5)?,
            calculation_method: row.get(6)?,
            current_value: row.get(7)?,
            previous_value: row.get(8)?,
            target_value: row.get(9)?,
            trend_direction: row
                .get::<_, Option<String>>(10)?
                .and_then(|s| serde_json::from_str(&s).ok()),
            last_calculated: row
                .get::<_, Option<i64>>(11)?
                .map(|ts| DateTime::from_timestamp_millis(ts).unwrap_or_else(|| Utc::now())),
            calculation_period: serde_json::from_str(&row.get::<_, String>(12)?)
                .unwrap_or(CalculationPeriod::Daily),
            is_active: row.get(13)?,
            priority: row.get(14)?,
        })
    }
}

/// Metric value types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(TS)]
pub enum MetricValueType {
    Count,
    Percentage,
    Currency,
    Duration,
    Rating,
}

/// Analytics metric data point
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsMetric {
    pub id: String,
    pub metric_name: String,
    pub metric_category: String,
    pub value: f64,
    pub value_type: MetricValueType,
    pub dimensions: Option<String>,
    #[ts(type = "string")]
    pub timestamp: DateTime<Utc>,
    #[ts(type = "string")]
    pub period_start: Option<DateTime<Utc>>,
    #[ts(type = "string")]
    pub period_end: Option<DateTime<Utc>>,
    pub source: String,
    pub source_id: Option<String>,
}

/// Dashboard types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(TS)]
pub enum DashboardType {
    Main,
    Operational,
    Financial,
    Quality,
    Custom,
}

/// Dashboard configuration
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsDashboard {
    pub id: String,
    pub name: String,
    pub dashboard_type: DashboardType,
    pub layout_config: Option<String>,
    pub widget_configs: Option<String>,
    pub filters_config: Option<String>,
    pub user_id: Option<String>,
    pub is_public: bool,
    pub is_default: bool,
    pub is_active: bool,
    #[ts(type = "string")]
    pub created_at: DateTime<Utc>,
    #[ts(type = "string")]
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

impl crate::db::FromSqlRow for AnalyticsDashboard {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(AnalyticsDashboard {
            id: row.get(0)?,
            name: row.get(1)?,
            dashboard_type: serde_json::from_str(&row.get::<_, String>(2)?)
                .unwrap_or(DashboardType::Main),
            layout_config: row
                .get::<_, Option<String>>(3)?
                .and_then(|s| serde_json::from_str(&s).ok()),
            widget_configs: row
                .get::<_, Option<String>>(4)?
                .and_then(|s| serde_json::from_str(&s).ok()),
            filters_config: row
                .get::<_, Option<String>>(5)?
                .and_then(|s| serde_json::from_str(&s).ok()),
            user_id: row.get(6)?,
            is_public: row.get(7)?,
            is_default: row.get(8)?,
            is_active: row.get(9)?,
            created_at: DateTime::from_timestamp_millis(row.get(10)?).unwrap_or_else(|| Utc::now()),
            updated_at: DateTime::from_timestamp_millis(row.get(11)?).unwrap_or_else(|| Utc::now()),
            created_by: row.get(12)?,
            updated_by: row.get(13)?,
        })
    }
}

/// Chart data point for frontend visualization
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ChartDataPoint {
    pub label: String,
    pub value: f64,
    pub category: Option<String>,
    #[ts(type = "string")]
    pub timestamp: Option<DateTime<Utc>>,
}

/// Chart configuration for dashboard widgets
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ChartConfig {
    pub chart_type: String, // 'line', 'bar', 'pie', 'area', 'scatter'
    pub title: String,
    pub x_axis_label: Option<String>,
    pub y_axis_label: Option<String>,
    pub data: Vec<ChartDataPoint>,
    pub colors: Option<Vec<String>>,
    pub show_legend: bool,
    pub show_grid: bool,
}

/// Dashboard widget types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[derive(TS)]
pub enum WidgetType {
    KpiCard,
    Chart,
    Table,
    MetricGrid,
    TrendIndicator,
}

/// Dashboard widget configuration
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DashboardWidget {
    pub id: String,
    pub widget_type: WidgetType,
    pub title: String,
    pub kpi_id: Option<String>,
    pub chart_config: Option<ChartConfig>,
    pub metric_names: Option<Vec<String>>,
    pub position: WidgetPosition,
    pub size: WidgetSize,
    pub refresh_interval: Option<i32>, // seconds
}

/// Widget position on dashboard grid
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WidgetPosition {
    pub x: i32,
    pub y: i32,
}

/// Widget size on dashboard grid
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WidgetSize {
    pub width: i32,
    pub height: i32,
}

/// Analytics dashboard data response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsDashboardData {
    pub dashboard: AnalyticsDashboard,
    pub kpis: Vec<AnalyticsKpi>,
    pub widgets: Vec<DashboardWidget>,
    pub date_range: DateRange,
    #[ts(type = "string")]
    pub last_updated: DateTime<Utc>,
}

/// Analytics time series data for trend charts
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsTimeSeries {
    pub metric_name: String,
    pub data_points: Vec<ChartDataPoint>,
    pub period: String,      // 'hour', 'day', 'week', 'month'
    pub aggregation: String, // 'sum', 'avg', 'count', 'min', 'max'
}

/// Analytics summary for quick overview
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsSummary {
    pub total_interventions: i64,
    pub completed_today: i64,
    pub active_technicians: i64,
    pub average_completion_time: f64,
    pub client_satisfaction_score: f64,
    pub quality_compliance_rate: f64,
    pub revenue_this_month: f64,
    pub inventory_turnover: f64,
    pub top_performing_technician: Option<String>,
    pub most_common_issue: Option<String>,
    #[ts(type = "string")]
    pub last_updated: DateTime<Utc>,
}

/// Report generation status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[derive(TS)]
pub enum ReportStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

impl Default for DateRange {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            start: now - chrono::Duration::days(30),
            end: now,
        }
    }
}

impl Default for ReportFilters {
    fn default() -> Self {
        Self {
            technician_ids: None,
            client_ids: None,
            statuses: None,
            priorities: None,
            ppf_zones: None,
            vehicle_models: None,
        }
    }
}

// Default implementations for report types (used for fallback when report generation fails)
impl Default for TaskCompletionReport {
    fn default() -> Self {
        Self {
            metadata: ReportMetadata {
                title: "Task Completion Report (Unavailable)".to_string(),
                date_range: DateRange {
                    start: Utc::now(),
                    end: Utc::now(),
                },
                generated_at: Utc::now(),
                filters: ReportFilters::default(),
                total_records: 0,
            },
            summary: TaskCompletionSummary {
                total_tasks: 0,
                completed_tasks: 0,
                completion_rate: 0.0,
                average_duration: None,
                on_time_completion_rate: 0.0,
            },
            daily_breakdown: Vec::new(),
            status_distribution: Vec::new(),
            technician_breakdown: Vec::new(),
        }
    }
}

impl Default for TechnicianPerformanceReport {
    fn default() -> Self {
        Self {
            metadata: ReportMetadata {
                title: "Technician Performance Report (Unavailable)".to_string(),
                date_range: DateRange {
                    start: Utc::now(),
                    end: Utc::now(),
                },
                generated_at: Utc::now(),
                filters: ReportFilters::default(),
                total_records: 0,
            },
            technicians: Vec::new(),
            benchmarks: PerformanceBenchmarks {
                top_performer_score: 0.0,
                team_average: 0.0,
                industry_average: 0.8,
            },
            trends: Vec::new(),
        }
    }
}

impl Default for ClientAnalyticsReport {
    fn default() -> Self {
        Self {
            metadata: ReportMetadata {
                title: "Client Analytics Report (Unavailable)".to_string(),
                date_range: DateRange {
                    start: Utc::now(),
                    end: Utc::now(),
                },
                generated_at: Utc::now(),
                filters: ReportFilters::default(),
                total_records: 0,
            },
            summary: ClientSummary {
                total_clients: 0,
                new_clients_this_period: 0,
                returning_clients: 0,
                retention_rate: 0.0,
                average_revenue_per_client: 0.0,
            },
            retention_analysis: RetentionAnalysis {
                new_client_rate: 0.0,
                repeat_client_rate: 0.0,
                churn_rate: 0.0,
                lifetime_value: 0.0,
            },
            revenue_analysis: RevenueAnalysis {
                total_revenue: 0.0,
                revenue_by_client_type: HashMap::new(),
                average_revenue_per_task: 0.0,
                revenue_growth_rate: 0.0,
            },
            top_clients: Vec::new(),
        }
    }
}

impl Default for QualityComplianceReport {
    fn default() -> Self {
        Self {
            metadata: ReportMetadata {
                title: "Quality Compliance Report (Unavailable)".to_string(),
                date_range: DateRange {
                    start: Utc::now(),
                    end: Utc::now(),
                },
                generated_at: Utc::now(),
                filters: ReportFilters::default(),
                total_records: 0,
            },
            summary: QualitySummary {
                overall_quality_score: 0.0,
                photo_compliance_rate: 0.0,
                step_completion_accuracy: 0.0,
                defect_rate: 0.0,
            },
            quality_trends: Vec::new(),
            common_issues: Vec::new(),
            compliance_metrics: ComplianceMetrics {
                documentation_completeness: 0.0,
                photo_quality_score: 0.0,
                workflow_adherence: 0.0,
                safety_compliance: 0.0,
            },
        }
    }
}

impl Default for MaterialUsageReport {
    fn default() -> Self {
        Self {
            metadata: ReportMetadata {
                title: "Material Usage Report (Unavailable)".to_string(),
                date_range: DateRange {
                    start: Utc::now(),
                    end: Utc::now(),
                },
                generated_at: Utc::now(),
                filters: ReportFilters::default(),
                total_records: 0,
            },
            summary: MaterialSummary {
                total_material_cost: 0.0,
                cost_per_task: 0.0,
                waste_percentage: 0.0,
                inventory_turnover: 0.0,
            },
            consumption_breakdown: Vec::new(),
            cost_analysis: MaterialCostAnalysis {
                cost_by_material_type: HashMap::new(),
                cost_trends: Vec::new(),
                supplier_performance: Vec::new(),
            },
            efficiency_metrics: MaterialEfficiency {
                utilization_rate: 0.0,
                waste_reduction_rate: 0.0,
                cost_efficiency_score: 0.0,
                inventory_optimization: 0.0,
            },
        }
    }
}

impl Default for GeographicReport {
    fn default() -> Self {
        Self {
            metadata: ReportMetadata {
                title: "Geographic Report (Unavailable)".to_string(),
                date_range: DateRange {
                    start: Utc::now(),
                    end: Utc::now(),
                },
                generated_at: Utc::now(),
                filters: ReportFilters::default(),
                total_records: 0,
            },
            heat_map_data: Vec::new(),
            service_areas: Vec::new(),
            geographic_stats: GeographicStats {
                total_points: 0,
                unique_locations: 0,
                average_cluster_density: 0.0,
                coverage_area_km2: 0.0,
            },
        }
    }
}

impl Default for SeasonalReport {
    fn default() -> Self {
        Self {
            metadata: ReportMetadata {
                title: "Seasonal Report (Unavailable)".to_string(),
                date_range: DateRange {
                    start: Utc::now(),
                    end: Utc::now(),
                },
                generated_at: Utc::now(),
                filters: ReportFilters::default(),
                total_records: 0,
            },
            seasonal_patterns: Vec::new(),
            weather_correlation: WeatherCorrelation {
                temperature_impact: 0.0,
                precipitation_impact: 0.0,
                wind_impact: 0.0,
                seasonal_adjustment_factor: 0.0,
            },
            peak_periods: Vec::new(),
            performance_trends: Vec::new(),
            completion_predictions: Vec::new(),
        }
    }
}

impl Default for OperationalIntelligenceReport {
    fn default() -> Self {
        Self {
            metadata: ReportMetadata {
                title: "Operational Intelligence Report (Unavailable)".to_string(),
                date_range: DateRange {
                    start: Utc::now(),
                    end: Utc::now(),
                },
                generated_at: Utc::now(),
                filters: ReportFilters::default(),
                total_records: 0,
            },
            step_bottlenecks: Vec::new(),
            intervention_bottlenecks: Vec::new(),
            resource_utilization: Vec::new(),
            process_efficiency: ProcessEfficiencyMetrics {
                overall_efficiency_score: 0.0,
                average_step_completion_time: 0.0,
                step_success_rate: 0.0,
                rework_percentage: 0.0,
                resource_utilization_rate: 0.0,
                bottleneck_impact_score: 0.0,
            },
            recommendations: Vec::new(),
        }
    }
}

/// Entity counts for Data Explorer
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct EntityCounts {
    pub tasks: i64,
    pub clients: i64,
    pub interventions: i64,
    pub technicians: i64,
}

/// Search results across multiple entities
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SearchResults {
    pub tasks: Vec<crate::domains::tasks::domain::models::task::Task>,
    pub clients: Vec<crate::domains::clients::domain::models::client::Client>,
    pub interventions: Vec<crate::domains::interventions::domain::models::intervention::Intervention>,
    pub total_results: i32,
}
