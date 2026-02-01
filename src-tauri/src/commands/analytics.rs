//! Tauri commands for analytics dashboard and KPI management
//!
//! Provides IPC endpoints for analytics data retrieval, KPI calculations,
//! and dashboard management.

use crate::commands::{ApiResponse, AppState};
use crate::models::reports::*;
use chrono::Utc;

/// Get analytics summary for quick overview
#[tauri::command]
pub async fn analytics_get_summary(
    state: AppState<'_>,
) -> Result<ApiResponse<AnalyticsSummary>, crate::commands::AppError> {
    let service = state.analytics_service.clone();

    match service.get_analytics_summary() {
        Ok(summary) => Ok(ApiResponse::success(summary)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get dashboard data for a specific dashboard
#[tauri::command]
pub async fn analytics_get_dashboard_data(
    state: AppState<'_>,
    dashboard_id: String,
) -> Result<ApiResponse<AnalyticsDashboardData>, crate::commands::AppError> {
    let service = state.analytics_service.clone();

    match service.get_dashboard_data(&dashboard_id) {
        Ok(data) => Ok(ApiResponse::success(data)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get all active KPIs
#[tauri::command]
pub async fn analytics_get_kpis(
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<AnalyticsKpi>>, crate::commands::AppError> {
    let service = state.analytics_service.clone();

    match service.get_active_kpis() {
        Ok(kpis) => Ok(ApiResponse::success(kpis)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get specific KPI by ID
#[tauri::command]
pub async fn analytics_get_kpi(
    state: AppState<'_>,
    kpi_id: String,
) -> Result<ApiResponse<Option<AnalyticsKpi>>, crate::commands::AppError> {
    let service = state.analytics_service.clone();

    match service.get_kpi(&kpi_id) {
        Ok(kpi) => Ok(ApiResponse::success(kpi)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Calculate and update all KPIs
#[tauri::command]
pub async fn analytics_calculate_kpis(
    state: AppState<'_>,
) -> Result<ApiResponse<String>, crate::commands::AppError> {
    let service = state.analytics_service.clone();

    match service.calculate_all_kpis() {
        Ok(()) => Ok(ApiResponse::success("KPIs calculated successfully".to_string())),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Calculate specific KPI
#[tauri::command]
pub async fn analytics_calculate_kpi(
    state: AppState<'_>,
    kpi_id: String,
) -> Result<ApiResponse<String>, crate::commands::AppError> {
    let service = state.analytics_service.clone();

    // First get the KPI definition
    let kpi = match service.get_kpi(&kpi_id) {
        Ok(Some(kpi)) => kpi,
        Ok(None) => return Err(crate::commands::AppError::from(format!("KPI {} not found", kpi_id))),
        Err(e) => return Err(crate::commands::AppError::from(e.to_string())),
    };

    match service.calculate_kpi(&kpi) {
        Ok(()) => Ok(ApiResponse::success(format!("KPI {} calculated successfully", kpi_id))),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get time series data for a metric
#[tauri::command]
pub async fn analytics_get_time_series(
    state: AppState<'_>,
    metric_name: String,
    days: Option<i32>,
) -> Result<ApiResponse<AnalyticsTimeSeries>, crate::commands::AppError> {
    let service = state.analytics_service.clone();
    let days = days.unwrap_or(30) as i64;

    match service.get_metric_time_series(&metric_name, days) {
        Ok(time_series) => Ok(ApiResponse::success(time_series)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get dashboard by ID
#[tauri::command]
pub async fn analytics_get_dashboard(
    state: AppState<'_>,
    dashboard_id: String,
) -> Result<ApiResponse<Option<AnalyticsDashboard>>, crate::commands::AppError> {
    let service = state.analytics_service.clone();

    match service.get_dashboard(&dashboard_id) {
        Ok(dashboard) => Ok(ApiResponse::success(dashboard)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Create default main dashboard
#[tauri::command]
pub async fn analytics_create_default_dashboard(
    _state: AppState<'_>,
    user_id: String,
) -> Result<ApiResponse<AnalyticsDashboard>, crate::commands::AppError> {
    // For now, return a mock dashboard - in a real implementation,
    // this would create a dashboard in the database
    let dashboard = AnalyticsDashboard {
        id: "main_dashboard".to_string(),
        name: "Main Dashboard".to_string(),
        dashboard_type: DashboardType::Main,
        layout_config: None,
        widget_configs: None,
        filters_config: None,
        user_id: Some(user_id.clone()),
        is_public: false,
        is_default: true,
        is_active: true,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        created_by: Some(user_id),
        updated_by: None,
    };

    Ok(ApiResponse::success(dashboard))
}