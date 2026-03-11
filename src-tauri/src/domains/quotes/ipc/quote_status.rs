//! Quote status transition commands — mark_sent, accepted, rejected, expired,
//! changes_requested, reopen

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::QuotesFacade;
use tracing::{debug, error, info, instrument};

use crate::resolve_context;
use crate::domains::quotes::application::QuoteStatusRequest;

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_mark_sent(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_mark_sent command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.mark_sent(&ctx.auth.role, &request.id) {
        Ok(quote) => {
            info!(quote_id = %request.id, "Quote marked as sent");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to mark quote as sent: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_mark_accepted(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteAcceptResponse>, AppError> {
    debug!(quote_id = %request.id, "quote_mark_accepted command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.mark_accepted(&ctx.auth.role, &request.id, ctx.user_id()) {
        Ok(response) => {
            info!(quote_id = %request.id, "Quote accepted");
            Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, quote_id = %request.id, "Failed to accept quote");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_mark_rejected(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_mark_rejected command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.mark_rejected(&ctx.auth.role, &request.id, ctx.user_id()) {
        Ok(quote) => {
            info!(quote_id = %request.id, "Quote rejected");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, quote_id = %request.id, "Failed to reject quote");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_mark_expired(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_mark_expired command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.mark_expired(&ctx.auth.role, &request.id) {
        Ok(quote) => {
            info!(quote_id = %request.id, "Quote marked as expired");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, quote_id = %request.id, "Failed to expire quote");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_mark_changes_requested(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_mark_changes_requested command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.mark_changes_requested(&ctx.auth.role, &request.id) {
        Ok(quote) => {
            info!(quote_id = %request.id, "Quote marked as changes_requested");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, quote_id = %request.id, "Failed to mark quote as changes_requested");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_reopen(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_reopen command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.reopen(&ctx.auth.role, &request.id) {
        Ok(quote) => {
            info!(quote_id = %request.id, "Quote reopened");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, quote_id = %request.id, "Failed to reopen quote");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}
