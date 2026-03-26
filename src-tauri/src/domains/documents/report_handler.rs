//! Flattened handler for Reports within Documents domain.
//!
//! Each handler authenticates the caller via `resolve_context!`, then
//! delegates to `DocumentsFacade` for all repository operations.

use tracing::{debug, info, instrument};

use super::facade::DocumentsFacade;
use super::models::*;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;

// ── IPC Commands ─────────────────────────────────────────────────────────────

/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn reports_get_capabilities(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<ReportCapabilities>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    debug!("Getting report capabilities");
    let capabilities = DocumentsFacade::new(state.photo_service.clone(), state.db.clone())
        .get_capabilities();
    Ok(ApiResponse::success(capabilities).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn report_generate(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<InterventionReport>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    let svc = crate::domains::documents::application::ReportApplicationService::new(
        state.db.clone(),
        state.intervention_service.clone(),
        state.client_service.clone(),
        state.photo_service.clone(),
    );
    let report = svc
        .generate_report(&intervention_id, &ctx.auth.to_user_session(), &state.app_config.app_data_dir)
        .await?;
    info!(
        report_number = %report.report_number,
        intervention_id = %intervention_id,
        "Intervention report generated"
    );
    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn report_get(
    state: AppState<'_>,
    report_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = DocumentsFacade::new(state.photo_service.clone(), state.db.clone());
    let report = facade.get_report(&report_id)?;
    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn report_get_by_intervention(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = DocumentsFacade::new(state.photo_service.clone(), state.db.clone());
    let report = facade.get_report_by_intervention(&intervention_id)?;
    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn report_list(
    state: AppState<'_>,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Vec<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = DocumentsFacade::new(state.photo_service.clone(), state.db.clone());
    let reports = facade.list_reports(
        limit.unwrap_or(crate::shared::constants::DEFAULT_USER_LIST_SIZE as i32),
        offset.unwrap_or(0),
    )?;
    Ok(ApiResponse::success(reports).with_correlation_id(Some(ctx.correlation_id)))
}
