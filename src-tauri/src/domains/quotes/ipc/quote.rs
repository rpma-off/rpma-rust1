//! Quote (Devis) CRUD commands for Tauri IPC

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::QuotesFacade;
use tracing::{debug, error, info, instrument, Span};

use crate::authenticate;
use crate::domains::quotes::application::{
    QuoteAcknowledgeRequest, QuoteAttachmentCreateRequest, QuoteAttachmentDeleteRequest,
    QuoteAttachmentUpdateRequest, QuoteAttachmentsGetRequest, QuoteCreateRequest,
    QuoteDeleteRequest, QuoteGetRequest, QuoteItemAddRequest, QuoteItemDeleteRequest,
    QuoteItemUpdateRequest, QuoteListRequest, QuoteRevokeRequest, QuoteShareRequest,
    QuoteStatusRequest, QuoteUpdateRequest,
};

// --- Commands ---

#[tauri::command]
#[instrument(skip(state, request), fields(correlation_id = tracing::field::Empty, user_id = tracing::field::Empty))]
pub async fn quote_create(
    request: QuoteCreateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!("quote_create command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    Span::current().record(
        "correlation_id",
        tracing::field::display(correlation_id.as_str()),
    );
    let current_user = authenticate!(&request.session_token, &state);
    Span::current().record(
        "user_id",
        tracing::field::display(current_user.user_id.as_str()),
    );
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.create(&current_user.role, request.data, &current_user.user_id) {
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_get(
    request: QuoteGetRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_get command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.get(&current_user.role, &request.id) {
        Ok(Some(quote)) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Ok(None) => Ok(
            ApiResponse::error(AppError::NotFound("Quote not found".to_string()))
                .with_correlation_id(Some(correlation_id.clone())),
        ),
        Err(_e) => {
            error!("Failed to get quote");
            Ok(
                ApiResponse::error(AppError::Database("Failed to retrieve quote".to_string()))
                    .with_correlation_id(Some(correlation_id.clone())),
            )
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_list(
    request: QuoteListRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteListResponse>, AppError> {
    debug!("quote_list command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.list(&current_user.role, &request.filters) {
        Ok(response) => {
            Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(_e) => {
            error!("Failed to list quotes");
            Ok(
                ApiResponse::error(AppError::Database("Failed to list quotes".to_string()))
                    .with_correlation_id(Some(correlation_id.clone())),
            )
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_update(
    request: QuoteUpdateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_update command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.update(&current_user.role, &request.id, request.data) {
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_delete(
    request: QuoteDeleteRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    debug!(quote_id = %request.id, "quote_delete command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.delete(&current_user.role, &request.id) {
        Ok(deleted) => {
            if deleted {
                info!(quote_id = %request.id, "Quote deleted successfully");
            }
            Ok(ApiResponse::success(deleted).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to delete quote: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_item_add(
    request: QuoteItemAddRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.quote_id, "quote_item_add command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.add_item(&current_user.role, &request.quote_id, request.item) {
        Ok(quote) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to add quote item: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_item_update(
    request: QuoteItemUpdateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.quote_id, item_id = %request.item_id, "quote_item_update command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.update_item(
        &current_user.role,
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_item_delete(
    request: QuoteItemDeleteRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.quote_id, item_id = %request.item_id, "quote_item_delete command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.delete_item(&current_user.role, &request.quote_id, &request.item_id) {
        Ok(quote) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to delete quote item: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_mark_sent(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_mark_sent command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.mark_sent(&current_user.role, &request.id) {
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_mark_accepted(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteAcceptResponse>, AppError> {
    debug!(quote_id = %request.id, "quote_mark_accepted command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.mark_accepted(&current_user.role, &request.id) {
        Ok(response) => {
            info!(quote_id = %request.id, "Quote accepted");
            Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to accept quote: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_mark_rejected(
    request: QuoteStatusRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!(quote_id = %request.id, "quote_mark_rejected command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.mark_rejected(&current_user.role, &request.id) {
        Ok(quote) => {
            info!(quote_id = %request.id, "Quote rejected");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to reject quote: {}", e);
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_export_pdf(
    request: QuoteGetRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteExportResponse>, AppError> {
    debug!(quote_id = %request.id, "quote_export_pdf command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());
    facade.check_permission(&current_user.role, "export")?;

    let quote = match facade.get(&current_user.role, &request.id) {
        Ok(Some(q)) => q,
        Ok(None) => {
            return Ok(
                ApiResponse::error(AppError::NotFound("Quote not found".to_string()))
                    .with_correlation_id(Some(correlation_id.clone())),
            )
        }
        Err(e) => {
            error!("Failed to get quote for PDF export: {}", e);
            return Ok(ApiResponse::error(AppError::Database(
                "Failed to retrieve quote".to_string(),
            ))
            .with_correlation_id(Some(correlation_id.clone())));
        }
    };

    // Generate PDF
    let pdf_dir = state.app_data_dir.join("quotes");
    tokio::fs::create_dir_all(&pdf_dir).await.map_err(|e| {
        error!("Failed to create quotes directory: {}", e);
        AppError::Io("Failed to create export directory".to_string())
    })?;

    let file_name = format!("{}.pdf", quote.quote_number);
    let file_path = pdf_dir.join(&file_name);

    let file_path_for_pdf = file_path.clone();
    tokio::task::spawn_blocking(move || generate_quote_pdf(&quote, &file_path_for_pdf))
        .await
        .map_err(|e| {
            error!("Failed to join PDF generation task: {}", e);
            AppError::Internal("PDF generation failed".to_string())
        })?
        .map_err(|e| {
            error!("Failed to generate PDF: {}", e);
            AppError::Internal("PDF generation failed".to_string())
        })?;

    info!(quote_id = %request.id, path = %file_path.display(), "Quote PDF exported");

    Ok(ApiResponse::success(QuoteExportResponse {
        file_path: file_path.to_string_lossy().to_string(),
    })
    .with_correlation_id(Some(correlation_id.clone())))
}

/// Generate a minimal PDF for a quote
fn generate_quote_pdf(quote: &Quote, path: &std::path::Path) -> std::io::Result<()> {
    use std::io::Write;

    // Minimal PDF generation (plain text-based PDF)
    let mut content = String::new();

    content.push_str(&format!("DEVIS {}\n\n", quote.quote_number));
    content.push_str(&format!("Client: {}\n", quote.client_id));

    if let Some(ref plate) = quote.vehicle_plate {
        content.push_str(&format!("Véhicule: {}", plate));
        if let Some(ref make) = quote.vehicle_make {
            content.push_str(&format!(" {} ", make));
        }
        if let Some(ref model) = quote.vehicle_model {
            content.push_str(model);
        }
        content.push('\n');
    }

    content.push_str("\n--- Articles ---\n");
    for item in &quote.items {
        let line_total = (item.qty * item.unit_price as f64) as i64;
        content.push_str(&format!(
            "{}: {} x {:.2}€ = {:.2}€\n",
            item.label,
            item.qty,
            item.unit_price as f64 / 100.0,
            line_total as f64 / 100.0
        ));
    }

    content.push_str(&format!(
        "\nSous-total: {:.2}€\n",
        quote.subtotal as f64 / 100.0
    ));
    content.push_str(&format!("TVA: {:.2}€\n", quote.tax_total as f64 / 100.0));
    content.push_str(&format!("Total: {:.2}€\n", quote.total as f64 / 100.0));

    if let Some(ref terms) = quote.terms {
        content.push_str(&format!("\nConditions:\n{}\n", terms));
    }
    if let Some(ref notes) = quote.notes {
        content.push_str(&format!("\nNotes:\n{}\n", notes));
    }

    // Write as a minimal valid PDF
    let stream_content = content
        .replace('\\', "\\\\")
        .replace('(', "\\(")
        .replace(')', "\\)");

    let mut lines = Vec::new();
    let mut y = 750;
    for line in stream_content.lines() {
        lines.push(format!("BT /F1 12 Tf 50 {} Td ({}) Tj ET", y, line));
        y -= 16;
        if y < 50 {
            break;
        }
    }
    let stream = lines.join("\n");
    let stream_len = stream.len();

    let pdf = format!(
        "%PDF-1.4\n\
         1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n\
         2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n\
         3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n\
         4 0 obj<</Length {}>>stream\n{}\nendstream endobj\n\
         5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n\
         xref\n0 6\n\
         0000000000 65535 f \n\
         0000000009 00000 n \n\
         0000000058 00000 n \n\
         0000000115 00000 n \n\
         0000000266 00000 n \n\
         0000000{:03} 00000 n \n\
         trailer<</Size 6/Root 1 0 R>>\n\
         startxref\n0\n%%EOF",
        stream_len,
        stream,
        300 + stream_len
    );

    let mut file = std::fs::File::create(path)?;
    file.write_all(pdf.as_bytes())?;

    Ok(())
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_attachments_get(
    request: QuoteAttachmentsGetRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<QuoteAttachment>>, AppError> {
    debug!(quote_id = %request.quote_id, "quote_attachments_get command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.get_attachments(&current_user.role, &request.quote_id) {
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_attachment_create(
    request: QuoteAttachmentCreateRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteAttachment>, AppError> {
    debug!(quote_id = %request.quote_id, "quote_attachment_create command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.create_attachment(
        &current_user.role,
        &request.quote_id,
        request.data,
        &current_user.user_id,
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
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.update_attachment(
        &current_user.role,
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
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let current_user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.delete_attachment(
        &current_user.role,
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

#[tauri::command]
#[instrument(skip(state, request))]
pub async fn quote_generate_share_link(
    request: QuoteShareRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<QuoteShareResponse>, AppError> {
    debug!("quote_generate_share_link command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    Span::current().record(
        "correlation_id",
        tracing::field::display(correlation_id.as_str()),
    );
    let current_user = authenticate!(&request.session_token, &state);
    Span::current().record(
        "user_id",
        tracing::field::display(current_user.user_id.as_str()),
    );
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.generate_share_link(&current_user.role, &request.quote_id) {
        Ok(response) => {
            info!(quote_id = %request.quote_id, "Quote share link generated");
            Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to generate share link");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state, request))]
pub async fn quote_revoke_share_link(
    request: QuoteRevokeRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    debug!("quote_revoke_share_link command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    Span::current().record(
        "correlation_id",
        tracing::field::display(correlation_id.as_str()),
    );
    let current_user = authenticate!(&request.session_token, &state);
    Span::current().record(
        "user_id",
        tracing::field::display(current_user.user_id.as_str()),
    );
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.revoke_share_link(&current_user.role, &request.quote_id) {
        Ok(true) => {
            info!(quote_id = %request.quote_id, "Quote share link revoked");
            Ok(ApiResponse::success(true).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to revoke share link");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
        Ok(false) => {
            Ok(ApiResponse::success(false).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_get_by_public_token(
    public_token: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<Quote>, AppError> {
    debug!("quote_get_by_public_token command received (public endpoint)");
    let correlation_id = crate::commands::init_correlation_context(&None, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.track_public_view(&public_token) {
        Ok(response) => {
            info!(
                public_token = %public_token,
                view_count = response.view_count,
                "Quote public view tracked"
            );
            Ok(ApiResponse::success(response.quote)
                .with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get quote by public token");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn quote_customer_response(
    request: CustomerQuoteResponse,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    debug!("quote_customer_response command received (public endpoint)");
    let correlation_id = crate::commands::init_correlation_context(&None, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    let action = request.action.clone();
    let quote_id = request.quote_id.clone();

    match facade.handle_customer_response(request) {
        Ok(true) => {
            info!(
                quote_id = %quote_id,
                action = %action,
                "Customer response handled successfully"
            );
            Ok(ApiResponse::success(true).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to handle customer response");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
        Ok(false) => {
            Ok(ApiResponse::success(false).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

#[tauri::command]
#[instrument(skip(state, request))]
pub async fn quote_acknowledge_response(
    request: QuoteAcknowledgeRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    debug!("quote_acknowledge_response command received");
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    Span::current().record(
        "correlation_id",
        tracing::field::display(correlation_id.as_str()),
    );
    let current_user = authenticate!(&request.session_token, &state);
    Span::current().record(
        "user_id",
        tracing::field::display(current_user.user_id.as_str()),
    );
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = QuotesFacade::new(state.quote_service.clone());

    match facade.acknowledge_response(&current_user.role, &request.quote_id) {
        Ok(true) => {
            info!(quote_id = %request.quote_id, "Quote customer response acknowledged");
            Ok(ApiResponse::success(true).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to acknowledge response");
            Ok(ApiResponse::error(e).with_correlation_id(Some(correlation_id.clone())))
        }
        Ok(false) => {
            Ok(ApiResponse::success(false).with_correlation_id(Some(correlation_id.clone())))
        }
    }
}
