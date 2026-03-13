//! Quote attachment commands — CRUD + open

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::QuotesFacade;
use tracing::{debug, error, info, instrument};

use crate::resolve_context;
use crate::domains::quotes::application::{
    QuoteAttachmentCreateRequest, QuoteAttachmentDeleteRequest, QuoteAttachmentOpenRequest,
    QuoteAttachmentUpdateRequest, QuoteAttachmentsGetRequest,
};

/// TODO: document
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_attachments_get(
    request: QuoteAttachmentsGetRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<QuoteAttachment>>, AppError> {
    debug!(quote_id = %request.quote_id, "quote_attachments_get command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.get_attachments(&ctx.auth.role, &request.quote_id) {
        Ok(attachments) => {
            Ok(ApiResponse::success(attachments).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(_e) => {
            error!("Failed to get quote attachments");
            Ok(ApiResponse::error(AppError::Database(
                "Failed to retrieve attachments".to_string(),
            ))
            .with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_attachment_create(
    request: QuoteAttachmentCreateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteAttachment>, AppError> {
    debug!(quote_id = %request.quote_id, "quote_attachment_create command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.create_attachment(
        &ctx.auth.role,
        &request.quote_id,
        request.data,
        ctx.user_id(),
    ) {
        Ok(attachment) => {
            info!(
                quote_id = %request.quote_id,
                attachment_id = %attachment.id,
                "Attachment created successfully"
            );
            Ok(ApiResponse::success(attachment).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to create attachment: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_attachment_update(
    request: QuoteAttachmentUpdateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteAttachment>, AppError> {
    debug!(
        quote_id = %request.quote_id,
        attachment_id = %request.attachment_id,
        "quote_attachment_update command received"
    );
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.update_attachment(
        &ctx.auth.role,
        &request.quote_id,
        &request.attachment_id,
        request.data,
    ) {
        Ok(attachment) => {
            info!(
                quote_id = %request.quote_id,
                attachment_id = %request.attachment_id,
                "Attachment updated successfully"
            );
            Ok(ApiResponse::success(attachment).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to update attachment: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_attachment_delete(
    request: QuoteAttachmentDeleteRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    debug!(
        quote_id = %request.quote_id,
        attachment_id = %request.attachment_id,
        "quote_attachment_delete command received"
    );
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.delete_attachment(
        &ctx.auth.role,
        &request.quote_id,
        &request.attachment_id,
    ) {
        Ok(deleted) => {
            if deleted {
                info!(
                    quote_id = %request.quote_id,
                    attachment_id = %request.attachment_id,
                    "Attachment deleted successfully"
                );
            }
            Ok(ApiResponse::success(deleted).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to delete attachment: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// TODO: document
#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_attachment_open(
    request: QuoteAttachmentOpenRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    debug!(attachment_id = %request.attachment_id, "quote_attachment_open command received");
    let ctx = resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let facade = QuotesFacade::new(state.quote_service.clone());

    let attachment = match facade.get_attachment(&ctx.auth.role, &request.attachment_id) {
        Ok(Some(a)) => a,
        Ok(None) => {
            return Ok(
                ApiResponse::error(AppError::NotFound("Attachment not found".to_string()))
                    .with_correlation_id(Some(correlation_id.clone())),
            )
        }
        Err(e) => {
            error!("Failed to retrieve attachment for open: {}", e);
            return Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())));
        }
    };

    open::that(&attachment.file_path).map_err(|e| {
        error!(attachment_id = %request.attachment_id, "Failed to open attachment file: {}", e);
        AppError::Internal(format!("Failed to open file: {e}"))
    })?;

    info!(attachment_id = %request.attachment_id, "Attachment opened");
    Ok(ApiResponse::success(true).with_correlation_id(Some(correlation_id.clone())))
}
