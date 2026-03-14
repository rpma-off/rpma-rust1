//! Quote export and conversion commands — export_pdf, convert_to_task
//!
//! ADR-018: Thin IPC layer — all business logic delegated to
//! [`QuoteExportService`](crate::domains::quotes::application::quote_export_service::QuoteExportService).

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::quotes::application::quote_export_service::QuoteExportService;
use crate::domains::quotes::domain::models::quote::*;
use tracing::{debug, instrument, Span};

use crate::resolve_context;
use crate::domains::quotes::application::{QuoteConvertToTaskRequest, QuoteGetRequest};

/// Construct a per-request [`QuoteExportService`] from shared application state.
fn export_service(state: &AppState<'_>) -> QuoteExportService {
    QuoteExportService::new(
        state.quote_service.clone(),
        state.task_service.clone(),
        state.app_data_dir.clone(),
    )
}

/// Export a quote to PDF.
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_export_pdf(
    request: QuoteGetRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteExportResponse>, AppError> {
    debug!(quote_id = %request.id, "quote_export_pdf command received");
    let ctx = resolve_context!(&state, &request.correlation_id);

    let result = export_service(&state)
        .export_to_pdf(&request.id, &ctx)
        .await?;

    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id.clone())))
}

/// Convert an accepted quote to a task.
///
/// Cross-domain orchestration delegated to [`QuoteExportService::convert_to_task`].
#[tauri::command]
#[instrument(skip(state, request), fields(correlation_id = tracing::field::Empty, user_id = tracing::field::Empty))]
pub async fn quote_convert_to_task(
    request: QuoteConvertToTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ConvertQuoteToTaskResponse>, AppError> {
    debug!(quote_id = %request.quote_id, "quote_convert_to_task command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    Span::current().record(
        "correlation_id",
        tracing::field::display(ctx.correlation_id.as_str()),
    );
    Span::current().record(
        "user_id",
        tracing::field::display(ctx.user_id()),
    );

    let result = export_service(&state)
        .convert_to_task(&request, &ctx)
        .await?;

    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id.clone())))
}
