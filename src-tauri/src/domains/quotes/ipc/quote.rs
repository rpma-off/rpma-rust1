//! Quote (Devis) CRUD commands for Tauri IPC

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::auth::domain::models::auth::UserRole;
use crate::domains::quotes::domain::models::quote::*;
use tracing::{debug, error, info, instrument, Span};

use crate::authenticate;
use crate::domains::quotes::application::{
    QuoteCreateRequest, QuoteDeleteRequest, QuoteGetRequest, QuoteItemAddRequest,
    QuoteItemDeleteRequest, QuoteItemUpdateRequest, QuoteListRequest, QuoteStatusRequest,
    QuoteUpdateRequest,
};

// --- Helper: check RBAC for quotes ---

fn check_quote_permission(role: &UserRole, operation: &str) -> Result<(), AppError> {
    match operation {
        "read" | "export" => {
            // All roles can read
            Ok(())
        }
        "create" | "update" | "delete" | "status" => {
            if matches!(role, UserRole::Viewer) {
                Err(AppError::Authorization(
                    "Viewers cannot modify quotes".to_string(),
                ))
            } else {
                Ok(())
            }
        }
        _ => Err(AppError::Authorization(format!(
            "Unknown quote operation: {}",
            operation
        ))),
    }
}

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
    check_quote_permission(&current_user.role, "create")?;

    match state
        .quote_service
        .create_quote(request.data, &current_user.user_id)
    {
        Ok(quote) => {
            info!(quote_id = %quote.id, "Quote created successfully");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create quote");
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "read")?;

    match state.quote_service.get_quote(&request.id) {
        Ok(Some(quote)) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Ok(None) => Ok(
            ApiResponse::error(AppError::NotFound("Quote not found".to_string()))
                .with_correlation_id(Some(correlation_id.clone())),
        ),
        Err(e) => {
            error!("Failed to get quote: {}", e);
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
    check_quote_permission(&current_user.role, "read")?;

    match state.quote_service.list_quotes(&request.filters) {
        Ok(response) => {
            Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to list quotes: {}", e);
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
    check_quote_permission(&current_user.role, "update")?;

    match state.quote_service.update_quote(&request.id, request.data) {
        Ok(quote) => {
            info!(quote_id = %quote.id, "Quote updated successfully");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to update quote: {}", e);
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "delete")?;

    match state.quote_service.delete_quote(&request.id) {
        Ok(deleted) => {
            if deleted {
                info!(quote_id = %request.id, "Quote deleted successfully");
            }
            Ok(ApiResponse::success(deleted).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to delete quote: {}", e);
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "update")?;

    match state
        .quote_service
        .add_item(&request.quote_id, request.item)
    {
        Ok(quote) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to add quote item: {}", e);
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "update")?;

    match state
        .quote_service
        .update_item(&request.quote_id, &request.item_id, request.data)
    {
        Ok(quote) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to update quote item: {}", e);
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "delete")?;

    match state
        .quote_service
        .delete_item(&request.quote_id, &request.item_id)
    {
        Ok(quote) => {
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to delete quote item: {}", e);
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "status")?;

    match state.quote_service.mark_sent(&request.id) {
        Ok(quote) => {
            info!(quote_id = %request.id, "Quote marked as sent");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to mark quote as sent: {}", e);
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "status")?;

    match state.quote_service.mark_accepted(&request.id) {
        Ok(response) => {
            info!(quote_id = %request.id, "Quote accepted");
            Ok(ApiResponse::success(response).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to accept quote: {}", e);
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "status")?;

    match state.quote_service.mark_rejected(&request.id) {
        Ok(quote) => {
            info!(quote_id = %request.id, "Quote rejected");
            Ok(ApiResponse::success(quote).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to reject quote: {}", e);
            Ok(ApiResponse::error(AppError::Validation(e))
                .with_correlation_id(Some(correlation_id.clone())))
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
    check_quote_permission(&current_user.role, "export")?;

    let quote = match state.quote_service.get_quote(&request.id) {
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
    std::fs::create_dir_all(&pdf_dir).map_err(|e| {
        error!("Failed to create quotes directory: {}", e);
        AppError::Io("Failed to create export directory".to_string())
    })?;

    let file_name = format!("{}.pdf", quote.quote_number);
    let file_path = pdf_dir.join(&file_name);

    generate_quote_pdf(&quote, &file_path).map_err(|e| {
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
fn generate_quote_pdf(
    quote: &Quote,
    path: &std::path::Path,
) -> Result<(), Box<dyn std::error::Error>> {
    use std::io::Write;

    // Minimal PDF generation (plain text-based PDF)
    let mut content = String::new();

    content.push_str(&format!("DEVIS {}\n\n", quote.quote_number));
    content.push_str(&format!("Client: {}\n", quote.client_id));

    if let Some(ref plate) = quote.vehicle_plate {
        content.push_str(&format!("VÃƒÂ©hicule: {}", plate));
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
            "{}: {} x {:.2}Ã¢â€šÂ¬ = {:.2}Ã¢â€šÂ¬\n",
            item.label,
            item.qty,
            item.unit_price as f64 / 100.0,
            line_total as f64 / 100.0
        ));
    }

    content.push_str(&format!(
        "\nSous-total: {:.2}Ã¢â€šÂ¬\n",
        quote.subtotal as f64 / 100.0
    ));
    content.push_str(&format!(
        "TVA: {:.2}Ã¢â€šÂ¬\n",
        quote.tax_total as f64 / 100.0
    ));
    content.push_str(&format!(
        "Total: {:.2}Ã¢â€šÂ¬\n",
        quote.total as f64 / 100.0
    ));

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
