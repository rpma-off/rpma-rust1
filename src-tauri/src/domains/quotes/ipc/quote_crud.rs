//! Quote CRUD commands — create, get, list, update, delete, duplicate

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::quotes::domain::models::quote::{Quote, QuoteListResponse, QuoteStats};
use crate::domains::quotes::QuotesFacade;
use tracing::{debug, error, info, instrument, Span};

use crate::domains::quotes::application::{
    QuoteCreateRequest, QuoteDeleteRequest, QuoteDuplicateRequest, QuoteGetRequest,
    QuoteGetStatsRequest, QuoteListRequest, QuoteUpdateRequest,
};
use crate::resolve_context;

/// TODO: document
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state, request), fields(correlation_id = tracing::field::Empty, user_id = tracing::field::Empty))]
pub async fn quote_create(
    request: QuoteCreateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!("quote_create command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    Span::current().record(
        "correlation_id",
        tracing::field::display(correlation_id.as_str()),
    );
    Span::current().record("user_id", tracing::field::display(ctx.user_id()));
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.create(&ctx.auth.role, request.data, ctx.user_id()) {
        Ok(quote) => {
            info!(quote_id = %quote.id, "Quote created successfully");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create quote");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_get(
    request: QuoteGetRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_get command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.get(&ctx.auth.role, &request.id) {
        Ok(Some(quote)) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Ok(None) => Ok(
            ApiResponse::error(AppError::NotFound("Quote not found".to_string()))
                .with_correlation_id(Some(correlation_id.clone())),
        ),
        Err(e) => {
            error!("Failed to get quote: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_list(
    request: QuoteListRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteListResponse>, AppError> {
    debug!("quote_list command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.list(&ctx.auth.role, &request.filters) {
        Ok(response) => {
            Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to list quotes: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn quote_update(
    request: QuoteUpdateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_update command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.update(&ctx.auth.role, &ctx.auth.user_id, &request.id, request.data) {
        Ok(quote) => {
            info!(quote_id = %quote.id, "Quote updated successfully");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to update quote: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_delete(
    request: QuoteDeleteRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    debug!(quote_id = %request.id, "quote_delete command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.delete(&ctx.auth.role, &ctx.auth.user_id, &request.id) {
        Ok(deleted) => {
            info!(quote_id = %request.id, "Quote deleted");
            Ok(ApiResponse::success(deleted).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to delete quote: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// Return aggregate quote statistics (status counts + monthly trend).
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_get_stats(
    request: QuoteGetStatsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteStats>, AppError> {
    debug!("quote_get_stats command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.get_stats(&ctx.auth.role) {
        Ok(stats) => {
            Ok(ApiResponse::success(stats).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to get quote stats: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_duplicate(
    request: QuoteDuplicateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_duplicate command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.duplicate(&ctx.auth.role, &request.id, ctx.user_id()) {
        Ok(quote) => {
            info!(source_id = %request.id, new_id = %quote.id, "Quote duplicated");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, quote_id = %request.id, "Failed to duplicate quote");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}
