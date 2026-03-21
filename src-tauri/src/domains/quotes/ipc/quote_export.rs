//! Quote export and conversion commands — export_pdf, convert_to_task
//!
//! ADR-018: Thin IPC layer — all business logic delegated to
//! [`QuoteExportService`](crate::domains::quotes::application::quote_export_service::QuoteExportService).

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::quotes::application::quote_export_service::QuoteExportService;
use crate::domains::quotes::domain::models::quote::*;
use crate::shared::services::event_bus::EventPublisher;
use tracing::{debug, error, instrument, Span};

use crate::domains::quotes::application::{QuoteConvertToTaskRequest, QuoteGetRequest};
use crate::resolve_context;

/// Construct a per-request [`QuoteExportService`] from shared application state.
fn export_service(state: &AppState<'_>) -> QuoteExportService {
    QuoteExportService::new(state.quote_service.clone(), state.app_config.app_data_dir.clone())
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
/// ADR-016 saga: After converting the quote, the intervention is created
/// synchronously here instead of being delegated to a `QuoteConvertedHandler`.
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
    Span::current().record("user_id", tracing::field::display(ctx.user_id()));

    let svc = export_service(&state);

    // Step 1: build task request inside quotes domain.
    let create_req = svc.build_task_request(&request, &ctx)?;

    // Step 2: create the task — cross-domain call at the IPC/composition layer.
    let task = state
        .task_service
        .create_task_async(create_req, ctx.user_id())
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create task from quote");
            AppError::Internal("Impossible de créer la tâche à partir du devis.".to_string())
        })?;

    // Emit TaskCreated event
    let domain_event = crate::shared::services::event_bus::event_factory::task_created_with_ctx(
        task.id.clone(),
        task.task_number.clone(),
        task.title.clone(),
        ctx.auth.user_id.clone(),
        ctx.correlation_id.clone(),
    );
    if let Err(e) = state.event_bus.publish(domain_event) {
        tracing::warn!(
            correlation_id = %ctx.correlation_id,
            task_id = %task.id,
            "Failed to publish TaskCreated event: {}",
            e
        );
    }

    // Step 3: record the quote→task link inside quotes domain.
    let result = svc.record_task_conversion(&request, &task.id, &task.task_number, &ctx)?;

    // Step 4 (ADR-016 saga): create the intervention synchronously instead of
    // relying on the QuoteConvertedHandler event handler.
    match state.intervention_creator.create_from_quote(&task.id, &request.quote_id) {
        Ok(()) => {
            tracing::info!(
                task_id = %task.id,
                quote_id = %request.quote_id,
                "Intervention created from quote (saga)"
            );
        }
        Err(e) => {
            tracing::warn!(
                task_id = %task.id,
                quote_id = %request.quote_id,
                error = %e,
                "Failed to create intervention from quote (saga)"
            );
        }
    }

    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id.clone())))
}
