use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::reports::application::report_service::ReportService;
use crate::domains::reports::domain::models::intervention_report::InterventionReport;
use crate::domains::reports::ReportsFacade;
use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::contracts::auth::UserRole;
use std::sync::Arc;
use tracing::{debug, instrument};

fn build_facade(state: &AppState<'_>) -> ReportsFacade {
    let report_service = Arc::new(ReportService::new(
        state.db.clone(),
        state.app_data_dir.clone(),
    ));
    ReportsFacade::new(report_service)
}

#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn reports_get_capabilities(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::reports::domain::models::report_capabilities::ReportCapabilities>,
    AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    debug!("Getting report capabilities");

    let current_user = crate::authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let capabilities =
        crate::domains::reports::application::ReportsApplicationService::capabilities();
    Ok(ApiResponse::success(capabilities).with_correlation_id(Some(correlation_id)))
}

/// Generate a new intervention report (PDF + persist metadata).
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn report_generate(
    state: AppState<'_>,
    session_token: String,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<InterventionReport>, AppError> {
    let ctx = AuthMiddleware::authenticate_command(
        &session_token,
        &state,
        Some(UserRole::Technician),
        &correlation_id,
    )
    .await?;

    let facade = build_facade(&state);
    let report = facade
        .generate_report(
            &intervention_id,
            &ctx.session,
            Some(&state.intervention_service),
            Some(&state.client_service),
        )
        .await?;

    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get a report by its ID.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn report_get(
    state: AppState<'_>,
    session_token: String,
    report_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<InterventionReport>>, AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;

    let facade = build_facade(&state);
    let report = facade.get_report(&report_id, &ctx.session.role)?;

    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get the latest report for an intervention.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn report_get_by_intervention(
    state: AppState<'_>,
    session_token: String,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<InterventionReport>>, AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;

    let facade = build_facade(&state);
    let report = facade.get_report_by_intervention(&intervention_id, &ctx.session.role)?;

    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

/// List all reports with pagination.
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn report_list(
    state: AppState<'_>,
    session_token: String,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Vec<InterventionReport>>, AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(&session_token, &state, None, &correlation_id).await?;

    let facade = build_facade(&state);
    let reports =
        facade.list_reports(limit.unwrap_or(50), offset.unwrap_or(0), &ctx.session.role)?;

    Ok(ApiResponse::success(reports).with_correlation_id(Some(ctx.correlation_id)))
}
