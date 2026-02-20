//! Core report commands
//!
//! This module contains the main Tauri command endpoints for retrieving
//! report data and basic report operations.

use crate::authenticate;
use crate::commands::{AppResult, AppState};
use crate::models::auth::UserRole;
use crate::models::reports::*;
use chrono::Datelike;
use tracing::{info, instrument};

/// Get task completion report
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_task_completion_report(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<TaskCompletionReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Task completion report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions - technicians can only see their own reports
    let can_view_all = matches!(current_user.role, UserRole::Admin | UserRole::Supervisor);
    if !can_view_all
        && !filters
            .technician_ids
            .as_ref()
            .is_some_and(|ids| ids.contains(&current_user.user_id))
    {
        return Err(crate::commands::errors::AppError::Authorization(
            "You can only view your own reports".to_string(),
        ));
    }

    // Generate report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_task_completion_report(
        date_range, filters, state,
    )
    .await
}

/// Get technician performance report

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_technician_performance_report(
    technician_id: Option<String>,
    date_range: DateRange,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<TechnicianPerformanceReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Technician performance report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions
    let can_view_all = matches!(current_user.role, UserRole::Admin | UserRole::Supervisor);
    if !can_view_all
        && technician_id
            .as_ref()
            .is_some_and(|id| id != &current_user.user_id)
    {
        return Err(crate::commands::errors::AppError::Authorization(
            "You can only view your own performance report".to_string(),
        ));
    }

    // Generate report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_technician_performance_report(
        date_range,
        technician_id,
        state,
    )
    .await
}

/// Get client analytics report

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_client_analytics_report(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<ClientAnalyticsReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Client analytics report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions - only admins and supervisors can view client analytics
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        return Err(crate::commands::errors::AppError::Authorization(
            "Only admins and supervisors can view client analytics".to_string(),
        ));
    }

    // Generate report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_client_analytics_report(
        date_range, filters, state,
    )
    .await
}

/// Get quality compliance report

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_quality_compliance_report(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<QualityComplianceReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Quality compliance report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions - only admins and supervisors can view quality reports
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        return Err(crate::commands::errors::AppError::Authorization(
            "Only admins and supervisors can view quality reports".to_string(),
        ));
    }

    // Generate report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_quality_compliance_report(
        date_range, filters, state,
    )
    .await
}

/// Get geographic report

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_geographic_report(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<GeographicReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Geographic report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions - only admins and supervisors can access geographic reports
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        return Err(crate::commands::errors::AppError::Authorization(
            "Only admins and supervisors can access geographic reports".to_string(),
        ));
    }

    // Generate report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_geographic_report(
        date_range, filters, state,
    )
    .await
}

/// Get material usage report

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_material_usage_report(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<MaterialUsageReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Material usage report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions - only admins and supervisors can view material reports
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        return Err(crate::commands::errors::AppError::Authorization(
            "Only admins and supervisors can view material reports".to_string(),
        ));
    }

    // Generate report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_material_usage_report(
        date_range, filters, state,
    )
    .await
}

/// Get overview report (combines all reports)

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_overview_report(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<OverviewReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Overview report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions - only admins and supervisors can view overview reports
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        return Err(crate::commands::errors::AppError::Authorization(
            "Only admins and supervisors can view overview reports".to_string(),
        ));
    }

    // Generate overview report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_overview_report(
        date_range, filters, state,
    )
    .await
}

/// Get available report types for current user

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_available_report_types(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<Vec<ReportType>> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Available report types requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let mut available_types = vec![ReportType::Overview];

    match current_user.role {
        UserRole::Admin | UserRole::Supervisor => {
            available_types.extend(vec![
                ReportType::Tasks,
                ReportType::Technicians,
                ReportType::Clients,
                ReportType::Quality,
                ReportType::Materials,
            ]);
        }
        UserRole::Technician => {
            available_types.push(ReportType::Tasks);
        }
        UserRole::Viewer => {
            available_types.push(ReportType::Tasks);
        }
    }

    Ok(available_types)
}

/// Get seasonal report

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_seasonal_report(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<SeasonalReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Seasonal report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions - only admins and supervisors can view seasonal reports
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        return Err(crate::commands::errors::AppError::Authorization(
            "Only admins and supervisors can view seasonal reports".to_string(),
        ));
    }

    // Generate seasonal report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_seasonal_report(
        date_range.start.year(),
        state,
    )
    .await
}

/// Get operational intelligence report

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_operational_intelligence_report(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<OperationalIntelligenceReport> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Operational intelligence report requested");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check permissions - only admins and supervisors can view operational intelligence
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        return Err(crate::commands::errors::AppError::Authorization(
            "Only admins and supervisors can view operational intelligence reports".to_string(),
        ));
    }

    // Generate operational intelligence report using generation service
    crate::domains::reports::ipc::reports::generation::report_commands::get_operational_intelligence_report(
        date_range, state,
    )
    .await
}
