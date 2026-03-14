//! Quote item commands — add, update, delete line items

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::QuotesFacade;
use tracing::{debug, error, instrument};

use crate::resolve_context;
use crate::domains::quotes::application::{
    QuoteItemAddRequest, QuoteItemDeleteRequest, QuoteItemUpdateRequest,
};

/// TODO: document
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_item_add(
    request: QuoteItemAddRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.quote_id, "quote_item_add command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.add_item(&ctx.auth.role, &request.quote_id, request.item) {
        Ok(quote) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to add quote item: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_item_update(
    request: QuoteItemUpdateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.quote_id, item_id = %request.item_id, "quote_item_update command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.update_item(
        &ctx.auth.role,
        &request.quote_id,
        &request.item_id,
        request.data,
    ) {
        Ok(quote) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to update quote item: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_item_delete(
    request: QuoteItemDeleteRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.quote_id, item_id = %request.item_id, "quote_item_delete command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.delete_item(&ctx.auth.role, &request.quote_id, &request.item_id) {
        Ok(quote) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to delete quote item: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}
