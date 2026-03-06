//! Quote application service — business logic for quote (devis) management.
//!
//! This service handles CRUD operations, status transitions, and
//! attachment management.  Financial calculations (totals, discounts)
//! live in [`super::quote_totals`], domain event emission in
//! [`super::quote_events`], and task creation from accepted quotes in
//! [`super::quote_task_creation`].
//!
//! Extracted from `infrastructure/quote.rs` to comply with the layered
//! architecture (ADR-002): business logic belongs in the **application**
//! layer, while SQL and persistence stay in **infrastructure**.

use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::infrastructure::quote_validation;
use chrono::Utc;
use std::sync::Arc;
use tracing::{info, warn};
use uuid::Uuid;

/// Service for quote-related business operations.
pub struct QuoteService {
    pub(super) repo: Arc<QuoteRepository>,
    pub(super) _db: Arc<crate::db::Database>,
    pub(super) event_bus: Arc<crate::shared::services::event_system::InMemoryEventBus>,
}

impl QuoteService {
    /// Create a new QuoteService.
    pub fn new(
        repo: Arc<QuoteRepository>,
        db: Arc<crate::db::Database>,
        event_bus: Arc<crate::shared::services::event_system::InMemoryEventBus>,
    ) -> Self {
        Self {
            repo,
            _db: db,
            event_bus,
        }
    }

    // ------------------------------------------------------------------
    // Quote CRUD
    // ------------------------------------------------------------------

    /// Create a new quote.
    pub fn create_quote(&self, req: CreateQuoteRequest, user_id: &str) -> Result<Quote, String> {
        req.validate()?;

        let now = Utc::now().timestamp_millis();
        let id = Uuid::new_v4().to_string();
        let quote_number = self
            .repo
            .next_quote_number()
            .map_err(|_| "Impossible de générer le numéro de devis.".to_string())?;

        let mut quote = Quote {
            id: id.clone(),
            quote_number,
            client_id: req.client_id.clone(),
            task_id: req.task_id.clone(),
            status: QuoteStatus::Draft,
            valid_until: req.valid_until,
            description: None,
            notes: req.notes.clone(),
            terms: req.terms.clone(),
            subtotal: 0,
            tax_total: 0,
            total: 0,
            discount_type: None,
            discount_value: None,
            discount_amount: None,
            vehicle_plate: req.vehicle_plate.clone(),
            vehicle_make: req.vehicle_make.clone(),
            vehicle_model: req.vehicle_model.clone(),
            vehicle_year: req.vehicle_year.clone(),
            vehicle_vin: req.vehicle_vin.clone(),
            created_at: now,
            updated_at: now,
            created_by: Some(user_id.to_string()),
            items: Vec::new(),
        };

        self.repo
            .create(&quote)
            .map_err(Self::map_create_repo_error)?;

        // Add items if provided
        for (i, item_req) in req.items.iter().enumerate() {
            let item = QuoteItem {
                id: Uuid::new_v4().to_string(),
                quote_id: id.clone(),
                kind: item_req.kind.clone(),
                label: item_req.label.clone(),
                description: item_req.description.clone(),
                qty: item_req.qty,
                unit_price: item_req.unit_price,
                tax_rate: item_req.tax_rate,
                material_id: item_req.material_id.clone(),
                position: item_req.position.unwrap_or(i as i32),
                created_at: now,
                updated_at: now,
            };
            self.repo
                .add_item(&item)
                .map_err(|_| "Impossible d'ajouter un article au devis.".to_string())?;
            quote.items.push(item);
        }

        // Recalculate totals
        self.recalculate_totals(&id)?;

        // Re-fetch to get updated totals
        let quote = self
            .repo
            .find_by_id(&id)
            .map_err(|_| "Impossible de récupérer le devis après création.".to_string())?
            .ok_or_else(|| "Devis introuvable après création.".to_string())?;

        info!(quote_id = %id, "Quote created: {}", quote.quote_number);
        Ok(quote)
    }

    /// Get a quote by ID.
    pub fn get_quote(&self, id: &str) -> Result<Option<Quote>, String> {
        self.repo.find_by_id(id).map_err(|e| e.to_string())
    }

    /// List quotes with filters.
    pub fn list_quotes(&self, query: &QuoteQuery) -> Result<QuoteListResponse, String> {
        let (quotes, total) = self.repo.list(query).map_err(|e| e.to_string())?;
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(20);

        Ok(QuoteListResponse {
            data: quotes,
            total,
            page,
            limit,
        })
    }

    /// Update a quote (Draft only).
    pub fn update_quote(&self, id: &str, req: UpdateQuoteRequest) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Only draft quotes can be edited".to_string());
        }

        // Validate discount values
        quote_validation::validate_discount_update(
            req.discount_type.as_deref(),
            req.discount_value,
        )?;

        self.repo.update(id, &req).map_err(Self::map_repo_error)?;

        // Recalculate totals after updating discount
        self.recalculate_totals(id)?;

        self.repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after update".to_string())
    }

    /// Delete a quote (Draft only).
    pub fn delete_quote(&self, id: &str) -> Result<bool, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Only draft quotes can be deleted".to_string());
        }

        self.repo.delete(id).map_err(Self::map_repo_error)
    }

    // ------------------------------------------------------------------
    // Quote Items
    // ------------------------------------------------------------------

    /// Add an item to a quote (Draft only).
    pub fn add_item(&self, quote_id: &str, req: CreateQuoteItemRequest) -> Result<Quote, String> {
        req.validate()?;

        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Items can only be added to draft quotes".to_string());
        }

        let now = Utc::now().timestamp_millis();
        let position = req.position.unwrap_or(quote.items.len() as i32);

        let item = QuoteItem {
            id: Uuid::new_v4().to_string(),
            quote_id: quote_id.to_string(),
            kind: req.kind,
            label: req.label,
            description: req.description,
            qty: req.qty,
            unit_price: req.unit_price,
            tax_rate: req.tax_rate,
            material_id: req.material_id,
            position,
            created_at: now,
            updated_at: now,
        };

        self.repo.add_item(&item).map_err(Self::map_repo_error)?;
        self.recalculate_totals(quote_id)?;

        self.repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after item add".to_string())
    }

    /// Update a quote item (Draft only).
    pub fn update_item(
        &self,
        quote_id: &str,
        item_id: &str,
        req: UpdateQuoteItemRequest,
    ) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Items can only be updated on draft quotes".to_string());
        }

        self.repo
            .update_item(item_id, quote_id, &req)
            .map_err(Self::map_repo_error)?;

        self.recalculate_totals(quote_id)?;

        self.repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after item update".to_string())
    }

    /// Delete a quote item (Draft only).
    pub fn delete_item(&self, quote_id: &str, item_id: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Items can only be deleted from draft quotes".to_string());
        }

        self.repo
            .delete_item(item_id, quote_id)
            .map_err(Self::map_repo_error)?;

        self.recalculate_totals(quote_id)?;

        self.repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after item delete".to_string())
    }

    // ------------------------------------------------------------------
    // Status Transitions
    // ------------------------------------------------------------------

    /// Mark a quote as sent (Draft → Sent).
    pub fn mark_sent(&self, id: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err(format!(
                "Cannot mark as sent: quote is in '{}' status (expected 'draft')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Sent)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote marked as sent");

        self.repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after status update".to_string())
    }

    /// Mark a quote as accepted (Sent → Accepted).
    /// Optionally creates a task if task_id is null.
    pub fn mark_accepted(&self, id: &str) -> Result<QuoteAcceptResponse, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Sent {
            return Err(format!(
                "Cannot accept: quote is in '{}' status (expected 'sent')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Accepted)
            .map_err(Self::map_repo_error)?;

        let mut task_created = None;

        // Create task if no task linked
        if quote.task_id.is_none() {
            match self.create_task_from_quote(&quote) {
                Ok(task_id) => {
                    self.repo
                        .link_task(id, &task_id)
                        .map_err(Self::map_repo_error)?;
                    task_created = Some(TaskCreatedInfo {
                        task_id: task_id.clone(),
                    });
                    info!(quote_id = %id, "Task created from accepted quote");

                    // Emit QuoteAccepted and QuoteConverted events
                    self.emit_quote_accepted(&quote, None)?;
                    let task_number =
                        format!("TASK-Q-{:05}", Utc::now().timestamp_millis() % 100000);
                    self.emit_quote_converted(&quote, &task_id, &task_number)?;
                }
                Err(e) => {
                    warn!(quote_id = %id, error = %e, "Failed to create task from quote, continuing");
                    self.emit_quote_accepted(&quote, Some(e.to_string()))?;
                }
            }
        } else {
            self.emit_quote_accepted(&quote, None)?;
        }

        let updated_quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after acceptance".to_string())?;

        info!(quote_id = %id, "Quote accepted");

        Ok(QuoteAcceptResponse {
            quote: updated_quote,
            task_created,
        })
    }

    /// Mark a quote as rejected (Sent → Rejected, or Draft → Rejected).
    pub fn mark_rejected(&self, id: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if !matches!(quote.status, QuoteStatus::Draft | QuoteStatus::Sent) {
            return Err(format!(
                "Cannot reject: quote is in '{}' status (expected 'draft' or 'sent')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Rejected)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote rejected");

        let updated_quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after rejection".to_string())?;

        // Emit QuoteRejected event
        self.emit_quote_rejected(&updated_quote, None)?;

        Ok(updated_quote)
    }

    // ------------------------------------------------------------------
    // Attachments
    // ------------------------------------------------------------------

    /// Get all attachments for a quote.
    pub fn get_attachments(&self, quote_id: &str) -> Result<Vec<QuoteAttachment>, String> {
        self.repo
            .find_attachments_by_quote_id(quote_id)
            .map_err(|e| e.to_string())
    }

    /// Create a new attachment for a quote.
    pub fn create_attachment(
        &self,
        quote_id: &str,
        req: CreateQuoteAttachmentRequest,
        user_id: &str,
    ) -> Result<QuoteAttachment, String> {
        req.validate()?;

        let _quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        quote_validation::validate_attachment_file(&req)?;

        let attachment_id = self
            .repo
            .create_attachment(quote_id, &req, Some(user_id))
            .map_err(|e| e.to_string())?;

        let attachment = self
            .repo
            .find_attachment_by_id(&attachment_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Attachment not found after creation".to_string())?;

        info!(
            quote_id = %quote_id,
            attachment_id = %attachment_id,
            file_name = %req.file_name,
            "Attachment created"
        );

        Ok(attachment)
    }

    /// Update an attachment.
    pub fn update_attachment(
        &self,
        quote_id: &str,
        attachment_id: &str,
        req: UpdateQuoteAttachmentRequest,
    ) -> Result<QuoteAttachment, String> {
        let _quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        self.repo
            .update_attachment(attachment_id, quote_id, &req)
            .map_err(|e| e.to_string())?;

        let attachment = self
            .repo
            .find_attachment_by_id(attachment_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Attachment not found after update".to_string())?;

        info!(
            quote_id = %quote_id,
            attachment_id = %attachment_id,
            "Attachment updated"
        );

        Ok(attachment)
    }

    /// Delete an attachment.
    pub fn delete_attachment(&self, quote_id: &str, attachment_id: &str) -> Result<bool, String> {
        let _quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        let deleted = self
            .repo
            .delete_attachment(attachment_id, quote_id)
            .map_err(|e| e.to_string())?;

        if deleted {
            info!(
                quote_id = %quote_id,
                attachment_id = %attachment_id,
                "Attachment deleted"
            );
        }

        Ok(deleted)
    }
}

#[cfg(test)]
#[path = "quote_service_tests.rs"]
mod tests;
