//! Background job management commands
//!
//! This module contains commands for managing background report generation jobs.

use crate::authenticate;
use crate::commands::{AppResult, AppState};
use crate::models::auth::UserRole;
use crate::models::reports::*;
use tracing::{info, instrument};

use super::validation;

/// Submit a background report generation job
#[tauri::command]
#[instrument(skip(state))]
pub async fn submit_report_job(
    report_type: ReportType,
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!(
        "Submitting background report job for type: {:?}",
        report_type
    );

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Check permissions based on report type
    match report_type {
        ReportType::Overview | ReportType::OperationalIntelligence => {
            if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
                return Err(crate::commands::errors::AppError::Authorization(
                    "Only admins and supervisors can generate overview or operational intelligence reports".to_string(),
                ));
            }
        }
        _ => {
            // For other reports, check if user can view their own data
            let can_view_all = matches!(current_user.role, UserRole::Admin | UserRole::Supervisor);
            if !can_view_all
                && !filters
                    .technician_ids
                    .as_ref()
                    .map_or(false, |ids| ids.contains(&current_user.user_id))
            {
                return Err(crate::commands::errors::AppError::Authorization(
                    "You can only generate reports for your own data".to_string(),
                ));
            }
        }
    }

    // Submit background job
    state
        .report_job_service()
        .submit_job(report_type, date_range, filters)
        .await
}

/// Submit background job for task completion report
#[tauri::command]
#[instrument(skip(state))]
pub async fn submit_task_completion_report_job(
    date_range: DateRange,
    filters: ReportFilters,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Submitting background job for task completion report");

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Validate date range
    validation::validate_date_range(&date_range)?;

    // Check permissions
    let can_view_all = matches!(current_user.role, UserRole::Admin | UserRole::Supervisor);
    if !can_view_all
        && !filters
            .technician_ids
            .as_ref()
            .map_or(false, |ids| ids.contains(&current_user.user_id))
    {
        return Err(crate::commands::errors::AppError::Authorization(
            "You can only generate reports for your own tasks".to_string(),
        ));
    }

    // Submit background job
    state
        .report_job_service()
        .submit_job(ReportType::Tasks, date_range, filters)
        .await
}

/// Get status of a background report job
#[instrument(skip(state))]
pub async fn get_report_job_status(
    job_id: String,
    session_token: String,
    state: AppState<'_>,
) -> AppResult<Option<crate::domains::reports::infrastructure::report_jobs::ReportJob>> {
    info!("Getting report job status for job: {}", job_id);

    let _current_user = authenticate!(&session_token, &state);

    state.report_job_service().get_job_status(&job_id).await
}

/// Cancel a background report job
#[instrument(skip(state))]
pub async fn cancel_report_job(
    job_id: String,
    session_token: String,
    state: AppState<'_>,
) -> AppResult<bool> {
    info!("Cancelling report job: {}", job_id);

    let _current_user = authenticate!(&session_token, &state);

    state.report_job_service().cancel_job(&job_id).await
}

/// Get completed report data from a background job
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_report_job_result(
    job_id: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<serde_json::Value> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Getting report job result for job: {}", job_id);

    let _current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&_current_user.user_id);

    // Check job status first
    let job_status = state.report_job_service().get_job_status(&job_id).await?;

    match job_status {
        Some(job) => {
            match job.status {
                crate::domains::reports::infrastructure::report_jobs::ReportJobStatus::Completed => {
                    // Get the report data from cache using the same key format as ReportJobService
                    let cache_key = match job.report_type {
                        ReportType::Tasks => format!("report:task_completion:{}", job_id),
                        ReportType::Technicians => {
                            format!("report:technician_performance:{}", job_id)
                        }
                        ReportType::Clients => format!("report:client_analytics:{}", job_id),
                        ReportType::Quality => format!("report:quality_compliance:{}", job_id),
                        ReportType::Materials => format!("report:material_usage:{}", job_id),
                        ReportType::Geographic => format!("report:geographic:{}", job_id),
                        ReportType::Seasonal => format!("report:seasonal:{}", job_id),
                        ReportType::Overview => format!("report:overview:{}", job_id),
                        ReportType::OperationalIntelligence => {
                            format!("report:operational_intelligence:{}", job_id)
                        }
                        ReportType::DataExplorer => {
                            return Err(crate::commands::AppError::Validation(
                                "Data Explorer reports are processed interactively".to_string(),
                            ));
                        }
                    };

                    state
                        .cache_service
                        .get(
                            crate::shared::services::cache::CacheType::ComputedAnalytics,
                            &cache_key,
                        )?
                        .ok_or_else(|| {
                            crate::commands::AppError::NotFound(
                                "Report data not found in cache".to_string(),
                            )
                        })
                }
                crate::domains::reports::infrastructure::report_jobs::ReportJobStatus::Failed => {
                    Err(crate::commands::AppError::Internal(
                        job.error_message
                            .unwrap_or_else(|| "Report generation failed".to_string()),
                    ))
                }
                crate::domains::reports::infrastructure::report_jobs::ReportJobStatus::Processing => Err(
                    crate::commands::AppError::Validation("Report is still processing".to_string()),
                ),
                crate::domains::reports::infrastructure::report_jobs::ReportJobStatus::Pending => {
                    Err(crate::commands::AppError::Validation(
                        "Report is queued for processing".to_string(),
                    ))
                }
            }
        }
        None => Err(crate::commands::AppError::NotFound(
            "Report job not found".to_string(),
        )),
    }
}
