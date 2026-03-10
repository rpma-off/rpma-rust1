use std::sync::Arc;

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::reports::application::report_service::ReportService;
use crate::domains::reports::domain::models::intervention_report::InterventionReport;
use crate::domains::reports::ReportsFacade;
use crate::shared::contracts::auth::UserRole;
use crate::resolve_context;
use tracing::{debug, instrument};

fn build_facade(state: &AppState<'_>) -> ReportsFacade {
    let report_service = Arc::new(ReportService::new(
        state.db.clone(),
        state.app_data_dir.clone(),
    ));
    ReportsFacade::new(report_service)
}

/// TODO: document
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn reports_get_capabilities(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::reports::domain::models::report_capabilities::ReportCapabilities>,
    AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id);
    debug!("Getting report capabilities");

    let capabilities =
        crate::domains::reports::application::ReportsApplicationService::capabilities();
    Ok(ApiResponse::success(capabilities).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Generate a new intervention report (PDF + persist metadata).
#[tauri::command]
#[instrument(skip(state))]
pub async fn report_generate(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<InterventionReport>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);

    let facade = build_facade(&state);
    let current_user = ctx.auth.to_user_session();
    let report = facade
        .generate_report(
            &intervention_id,
            &current_user,
            Some(&state.intervention_service),
            Some(&state.client_service),
        )
        .await?;

    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Get a report by its ID.
#[tauri::command]
#[instrument(skip(state))]
pub async fn report_get(
    state: AppState<'_>,
    report_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let facade = build_facade(&state);
    let report = facade.get_report(&report_id, &ctx.auth.role)?;

    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Get the latest report for an intervention.
#[tauri::command]
#[instrument(skip(state))]
pub async fn report_get_by_intervention(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let facade = build_facade(&state);
    let report = facade.get_report_by_intervention(&intervention_id, &ctx.auth.role)?;

    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// List all reports with pagination.
#[tauri::command]
#[instrument(skip(state))]
pub async fn report_list(
    state: AppState<'_>,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Vec<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let facade = build_facade(&state);
    let reports =
        facade.list_reports(limit.unwrap_or(50), offset.unwrap_or(0), &ctx.auth.role)?;

    Ok(ApiResponse::success(reports).with_correlation_id(Some(ctx.correlation_id.clone())))
}
