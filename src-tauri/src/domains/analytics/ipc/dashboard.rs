pub fn dashboard_get_stats(
    state: crate::commands::AppState<'_>,
    time_range: Option<String>,
    correlation_id: Option<String>,
) -> Result<crate::commands::ApiResponse<serde_json::Value>, crate::commands::AppError> {
    use tracing::{debug, error, info};
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    debug!(
        "Retrieving dashboard statistics for time range: {:?}",
        time_range
    );
    let dashboard_service = state.dashboard_service.clone();
    let stats = dashboard_service
        .get_dashboard_stats(time_range)
        .map_err(|e| {
            error!("Failed to get dashboard statistics: {}", e);
            crate::commands::AppError::Database(format!(
                "Failed to get dashboard statistics: {}",
                e
            ))
        })?;
    info!("Dashboard statistics retrieved successfully");
    Ok(crate::commands::ApiResponse::success(stats)
        .with_correlation_id(Some(correlation_id.clone())))
}
