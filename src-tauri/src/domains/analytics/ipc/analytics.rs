//! Tauri commands for analytics dashboard and KPI management
//!
//! Provides IPC endpoints for analytics data retrieval, KPI calculations,
//! and dashboard management.

use crate::authenticate;
use crate::commands::{ApiResponse, AppState};
use crate::domains::reports::domain::models::reports::*;
use tracing;

/// Get analytics summary for quick overview
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn analytics_get_summary(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<AnalyticsSummary>, crate::commands::AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let _current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&_current_user.user_id);

    let service = state.analytics_service.clone();

    match service.get_analytics_summary() {
        Ok(summary) => {
            Ok(ApiResponse::success(summary).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}
