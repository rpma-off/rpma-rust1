use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DateRange {
    #[ts(type = "string")]
    pub start: DateTime<Utc>,
    #[ts(type = "string")]
    pub end: DateTime<Utc>,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(TS)]
pub enum TrendDirection {
    Up,
    Down,
    Stable,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(TS)]
pub enum CalculationPeriod {
    Hourly,
    Daily,
    Weekly,
    Monthly,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsKpi {
    pub id: String,
    pub kpi_name: String,
    pub kpi_category: KpiCategory,
    pub display_name: String,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub calculation_method: String,
    pub current_value: Option<f64>,
    pub previous_value: Option<f64>,
    pub target_value: Option<f64>,
    pub trend_direction: Option<TrendDirection>,
    #[ts(type = "string")]
    pub last_calculated: Option<DateTime<Utc>>,
    pub calculation_period: CalculationPeriod,
    pub is_active: bool,
    pub priority: i32,
}

impl crate::db::FromSqlRow for AnalyticsKpi {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
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
                .map(|ts| DateTime::from_timestamp_millis(ts).unwrap_or_else(Utc::now)),
            calculation_period: serde_json::from_str(&row.get::<_, String>(12)?)
                .unwrap_or(CalculationPeriod::Daily),
            is_active: row.get(13)?,
            priority: row.get(14)?,
        })
    }
}

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
        Ok(Self {
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
            created_at: DateTime::from_timestamp_millis(row.get(10)?).unwrap_or_else(Utc::now),
            updated_at: DateTime::from_timestamp_millis(row.get(11)?).unwrap_or_else(Utc::now),
            created_by: row.get(12)?,
            updated_by: row.get(13)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ChartDataPoint {
    pub label: String,
    pub value: f64,
    pub category: Option<String>,
    #[ts(type = "string")]
    pub timestamp: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ChartConfig {
    pub chart_type: String,
    pub title: String,
    pub x_axis_label: Option<String>,
    pub y_axis_label: Option<String>,
    pub data: Vec<ChartDataPoint>,
    pub colors: Option<Vec<String>>,
    pub show_legend: bool,
    pub show_grid: bool,
}

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
    pub refresh_interval: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WidgetPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WidgetSize {
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsDashboardData {
    pub dashboard: AnalyticsDashboard,
    pub kpis: Vec<AnalyticsKpi>,
    pub widgets: Vec<DashboardWidget>,
    pub date_range: DateRange,
    #[ts(type = "string")]
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AnalyticsTimeSeries {
    pub metric_name: String,
    pub data_points: Vec<ChartDataPoint>,
    pub period: String,
    pub aggregation: String,
}

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
