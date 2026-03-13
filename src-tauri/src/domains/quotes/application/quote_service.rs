//! Quote application service — business logic for quote (devis) management.
//!
//! This service handles CRUD operations, status transitions, and
//! attachment management.  Financial calculations (totals, discounts)
//! live in [`super::quote_totals`], domain event emission in
//! [`super::quote_events`].
//!
//! Extracted from `infrastructure/quote.rs` to comply with the layered
//! architecture (ADR-002): business logic belongs in the **application**
//! layer, while SQL and persistence stay in **infrastructure**.

/// ADR-001: Application Layer
use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::infrastructure::quote_validation;
use chrono::Utc;
use std::sync::Arc;
use tracing::{info, warn};

/// Service for quote-related business operations.
pub struct QuoteService {
    pub(super) repo: Arc<QuoteRepository>,
    pub(super) _db: Arc<crate::db::Database>,
    pub(super) event_bus: Arc<crate::shared::services::event_bus::InMemoryEventBus>,
}

impl QuoteService {
    /// Create a new QuoteService.
    pub fn new(
        repo: Arc<QuoteRepository>,
        db: Arc<crate::db::Database>,
        event_bus: Arc<crate::shared::services::event_bus::InMemoryEventBus>,
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
        let id = crate::shared::utils::uuid::generate_uuid_string();
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

        // Build items before persisting so we can insert quote + items atomically.
        let items: Vec<QuoteItem> = req
            .items
            .iter()
            .enumerate()
            .map(|(i, item_req)| QuoteItem {
                id: crate::shared::utils::uuid::generate_uuid_string(),
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
            })
            .collect();

        // Atomic: quote row + all item rows in a single transaction so a
        // partial failure never leaves an orphaned quote without items.
        self.repo
            .create_with_items(&quote, &items)
            .map_err(Self::map_create_repo_error)?;
        quote.items = items;

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

    /// Soft-delete a quote (Draft only).
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

    /// Duplicate a quote: create a new Draft with copies of all items.
    pub fn duplicate_quote(&self, id: &str, user_id: &str) -> Result<Quote, String> {
        let source = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        let now = Utc::now().timestamp_millis();
        let new_id = crate::shared::utils::uuid::generate_uuid_string();
        let new_number = self
            .repo
            .next_quote_number()
            .map_err(|_| "Impossible de générer le numéro de devis.".to_string())?;

        let new_quote = Quote {
            id: new_id.clone(),
            quote_number: new_number,
            client_id: source.client_id.clone(),
            task_id: None, // Duplicate starts unlinked
            status: QuoteStatus::Draft,
            valid_until: source.valid_until,
            description: source.description.clone(),
            notes: source.notes.clone(),
            terms: source.terms.clone(),
            subtotal: 0,
            tax_total: 0,
            total: 0,
            discount_type: source.discount_type.clone(),
            discount_value: source.discount_value,
            discount_amount: None,
            vehicle_plate: source.vehicle_plate.clone(),
            vehicle_make: source.vehicle_make.clone(),
            vehicle_model: source.vehicle_model.clone(),
            vehicle_year: source.vehicle_year.clone(),
            vehicle_vin: source.vehicle_vin.clone(),
            created_at: now,
            updated_at: now,
            created_by: Some(user_id.to_string()),
            items: Vec::new(),
        };

        self.repo
            .create(&new_quote)
            .map_err(Self::map_create_repo_error)?;

        // Copy items — QW-2: batch insert (1 transaction + 1 cache invalidation instead of N).
        let new_items: Vec<QuoteItem> = source
            .items
            .iter()
            .map(|item| QuoteItem {
                id: crate::shared::utils::uuid::generate_uuid_string(),
                quote_id: new_id.clone(),
                kind: item.kind.clone(),
                label: item.label.clone(),
                description: item.description.clone(),
                qty: item.qty,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                material_id: item.material_id.clone(),
                position: item.position,
                created_at: now,
                updated_at: now,
            })
            .collect();
        self.repo
            .add_items_batch(&new_items)
            .map_err(|_| "Impossible de copier les articles du devis.".to_string())?;

        // Recalculate totals (discount re-applied)
        self.recalculate_totals(&new_id)?;

        let result = self
            .repo
            .find_by_id(&new_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Devis dupliqué introuvable.".to_string())?;

        info!(source_id = %id, new_id = %new_id, "Quote duplicated: {}", result.quote_number);
        Ok(result)
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
            id: crate::shared::utils::uuid::generate_uuid_string(),
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
    /// Requires at least one item and a non-zero total.
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

        // Business rule: cannot send an empty quote
        if quote.items.is_empty() {
            return Err("Impossible d'envoyer un devis sans lignes.".to_string());
        }

        // Business rule: cannot send a zero-value quote
        if quote.total == 0 {
            return Err("Impossible d'envoyer un devis avec un montant total nul.".to_string());
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
    ///
    /// Note: Task creation from accepted quotes is handled via the event bus
    /// (`QuoteAccepted` event).  This method only updates the quote status.
    pub fn mark_accepted(
        &self,
        id: &str,
        accepted_by: &str,
    ) -> Result<QuoteAcceptResponse, String> {
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

        // Emit QuoteAccepted event with the accepting user's ID (not the creator)
        if let Err(e) = self.emit_quote_accepted(&quote, accepted_by, None) {
            warn!(quote_id = %id, error = %e, "Failed to emit QuoteAccepted event");
        }

        let updated_quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after acceptance".to_string())?;

        info!(quote_id = %id, accepted_by = %accepted_by, "Quote accepted");

        Ok(QuoteAcceptResponse {
            quote: updated_quote,
            task_created: None, // Task creation is async via event bus
        })
    }

    /// Mark a quote as rejected (Sent → Rejected only).
    ///
    /// Rejection is only allowed from `Sent` status (once the quote has been
    /// presented to the customer).  Draft quotes can simply be deleted.
    pub fn mark_rejected(&self, id: &str, rejected_by: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        // Only allow rejection from Sent status
        if quote.status != QuoteStatus::Sent {
            return Err(format!(
                "Un devis ne peut être rejeté que depuis l'état 'envoyé' (statut actuel: '{}')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Rejected)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, rejected_by = %rejected_by, "Quote rejected");

        let updated_quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after rejection".to_string())?;

        // Emit QuoteRejected event
        if let Err(e) = self.emit_quote_rejected(&updated_quote, rejected_by, None) {
            warn!(quote_id = %id, error = %e, "Failed to emit QuoteRejected event");
        }

        Ok(updated_quote)
    }

    /// Mark a quote as expired (Draft | Sent → Expired).
    ///
    /// Can be triggered manually (Admin) or automatically when `valid_until`
    /// is in the past.
    pub fn mark_expired(&self, id: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        if !matches!(quote.status, QuoteStatus::Draft | QuoteStatus::Sent) {
            return Err(format!(
                "Seuls les devis en état 'draft' ou 'envoyé' peuvent expirer (statut actuel: '{}')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Expired)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote marked as expired");

        self.repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found after expiry".to_string())
    }

    /// Mark a quote as changes_requested (Sent → ChangesRequested).
    ///
    /// Signals that the customer has reviewed the quote and requested changes.
    pub fn mark_changes_requested(&self, id: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Devis introuvable".to_string())?;

        if quote.status != QuoteStatus::Sent {
            return Err(format!(
                "Des modifications ne peuvent être demandées que depuis l'état 'envoyé' (statut actuel: '{}')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::ChangesRequested)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote marked as changes_requested");

        self.repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Devis introuvable après mise à jour du statut".to_string())
    }

    /// Reopen a quote (ChangesRequested | Rejected → Draft).
    ///
    /// Allows revising a quote that was rejected or needs changes.
    pub fn reopen(&self, id: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Devis introuvable".to_string())?;

        if !matches!(
            quote.status,
            QuoteStatus::ChangesRequested | QuoteStatus::Rejected
        ) {
            return Err(format!(
                "Seuls les devis 'rejeté' ou 'modifications demandées' peuvent être rouverts (statut actuel: '{}')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Draft)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote reopened as draft");

        self.repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Devis introuvable après réouverture".to_string())
    }

    // ------------------------------------------------------------------
    // Convert to Task
    // ------------------------------------------------------------------

    /// Convert an accepted quote to a task (Accepted → Converted).
    ///
    /// Links the given `task_id` to the quote, updates the status to
    /// `Converted`, and emits a `QuoteConverted` domain event so that
    /// downstream handlers (e.g. intervention creation) can react.
    ///
    /// The actual *task creation* is orchestrated at the IPC layer where
    /// cross-domain service access is permitted.
    pub fn convert_to_task(
        &self,
        quote_id: &str,
        task_id: &str,
        task_number: &str,
    ) -> Result<ConvertQuoteToTaskResponse, String> {
        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Devis introuvable".to_string())?;

        if quote.status != QuoteStatus::Accepted {
            return Err(format!(
                "Seuls les devis acceptés peuvent être convertis en tâche (statut actuel: '{}')",
                quote.status
            ));
        }

        // Atomic: link the task and flip the status in a single transaction so a
        // partial failure never leaves a task linked to a quote whose status was
        // not yet updated to Converted.
        self.repo
            .link_task_and_update_status(quote_id, task_id, &QuoteStatus::Converted)
            .map_err(Self::map_repo_error)?;

        // Emit QuoteConverted event so intervention can be created
        if let Err(e) = self.emit_quote_converted(&quote, task_id, task_number) {
            warn!(quote_id = %quote_id, error = %e, "Failed to emit QuoteConverted event");
        }

        let updated_quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Devis introuvable après conversion".to_string())?;

        info!(quote_id = %quote_id, task_id = %task_id, "Quote converted to task");

        Ok(ConvertQuoteToTaskResponse {
            quote: updated_quote,
            task_id: task_id.to_string(),
            task_number: task_number.to_string(),
        })
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

    /// Get a single attachment by its ID.
    pub fn get_attachment(&self, attachment_id: &str) -> Result<Option<QuoteAttachment>, String> {
        self.repo
            .find_attachment_by_id(attachment_id)
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
#[path = "../tests/quote_service_tests.rs"]
mod tests;
