//! Application-layer service for quote export operations (ADR-018).
//!
//! Extracted from `ipc/quote_export.rs` — all PDF generation, CSV export,
//! and quote-to-task conversion orchestration lives here.

use std::sync::Arc;
use tracing::{error, info};

use crate::commands::AppError;
use crate::domains::quotes::application::QuoteConvertToTaskRequest;
use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::QuotesFacade;
use crate::shared::services::cross_domain::TaskService;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;

/// Orchestrates quote export (PDF) and quote→task conversion.
pub struct QuoteExportService {
    quote_service: Arc<crate::domains::quotes::application::quote_service::QuoteService>,
    task_service: Arc<TaskService>,
    app_data_dir: std::path::PathBuf,
}

impl QuoteExportService {
    pub fn new(
        quote_service: Arc<crate::domains::quotes::application::quote_service::QuoteService>,
        task_service: Arc<TaskService>,
        app_data_dir: std::path::PathBuf,
    ) -> Self {
        Self {
            quote_service,
            task_service,
            app_data_dir,
        }
    }

    /// Export a quote to PDF, returning the file path.
    pub async fn export_to_pdf(
        &self,
        quote_id: &str,
        ctx: &RequestContext,
    ) -> Result<QuoteExportResponse, AppError> {
        let facade = QuotesFacade::new(self.quote_service.clone());
        facade.check_permission(&ctx.auth.role, "export")?;

        let quote = self.fetch_quote(&facade, &ctx.auth.role, quote_id)?;

        let pdf_dir = self.app_data_dir.join("quotes");
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

        info!(quote_id = %quote_id, path = %file_path.display(), "Quote PDF exported");

        Ok(QuoteExportResponse {
            file_path: file_path.to_string_lossy().to_string(),
        })
    }

    /// Convert an accepted quote to a task (cross-domain orchestration).
    pub async fn convert_to_task(
        &self,
        request: &QuoteConvertToTaskRequest,
        ctx: &RequestContext,
    ) -> Result<ConvertQuoteToTaskResponse, AppError> {
        let facade = QuotesFacade::new(self.quote_service.clone());
        let quote = self.fetch_quote(&facade, &ctx.auth.role, &request.quote_id)?;

        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let ppf_zones = request
            .ppf_zones
            .clone()
            .unwrap_or_else(|| vec!["Full Body".to_string()]);

        let create_task_req = crate::domains::tasks::domain::models::task::CreateTaskRequest {
            vehicle_plate: request.vehicle_plate.clone(),
            vehicle_model: request.vehicle_model.clone(),
            ppf_zones,
            scheduled_date: request.scheduled_date.clone().unwrap_or(today),
            title: Some(format!("Tâche issue du devis {}", quote.quote_number)),
            description: quote.description.clone(),
            vehicle_make: request.vehicle_make.clone(),
            vehicle_year: request.vehicle_year.clone(),
            vin: request.vehicle_vin.clone(),
            client_id: Some(quote.client_id.clone()),
            notes: quote.notes.clone(),
            creator_id: Some(ctx.user_id().to_string()),
            created_by: Some(ctx.user_id().to_string()),
            external_id: None,
            status: None,
            technician_id: None,
            start_time: None,
            end_time: None,
            checklist_completed: None,
            date_rdv: None,
            heure_rdv: None,
            lot_film: None,
            customer_name: None,
            customer_email: None,
            customer_phone: None,
            customer_address: None,
            custom_ppf_zones: None,
            template_id: None,
            workflow_id: None,
            task_number: None,
            priority: None,
            estimated_duration: None,
            tags: None,
        };

        let task = self
            .task_service
            .create_task_async(create_task_req, ctx.user_id())
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to create task from quote");
                AppError::Internal(
                    "Impossible de créer la tâche à partir du devis.".to_string(),
                )
            })?;

        let response = facade
            .convert_to_task(&ctx.auth.role, &request.quote_id, &task.id, &task.task_number)
            .map_err(|e| {
                error!(error = %e, quote_id = %request.quote_id, "Failed to convert quote to task");
                e
            })?;

        info!(
            quote_id = %request.quote_id,
            task_id = %task.id,
            "Quote converted to task successfully"
        );

        Ok(response)
    }

    /// Fetch a quote by ID with proper error handling.
    fn fetch_quote(
        &self,
        facade: &QuotesFacade,
        role: &UserRole,
        quote_id: &str,
    ) -> Result<Quote, AppError> {
        match facade.get(role, quote_id) {
            Ok(Some(q)) => Ok(q),
            Ok(None) => Err(AppError::NotFound("Quote not found".to_string())),
            Err(e) => {
                error!("Failed to get quote: {}", e);
                Err(e)
            }
        }
    }
}

/// Generate a minimal PDF for a quote.
fn generate_quote_pdf(quote: &Quote, path: &std::path::Path) -> std::io::Result<()> {
    use std::io::Write;

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
