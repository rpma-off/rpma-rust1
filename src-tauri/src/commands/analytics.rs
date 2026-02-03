//! Tauri commands for analytics dashboard and KPI management
//!
//! Provides IPC endpoints for analytics data retrieval, KPI calculations,
//! and dashboard management.

use crate::commands::{ApiResponse, AppState};
use crate::models::reports::*;

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
