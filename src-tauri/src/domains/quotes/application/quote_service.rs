//! Quote application service — business logic for quote (devis) management.
//!
//! This service handles CRUD operations, status transitions, totals
//! calculation, and task creation on acceptance.
//!
//! Extracted from `infrastructure/quote.rs` to comply with the layered
//! architecture (ADR-002): business logic belongs in the **application**
//! layer, while SQL and persistence stay in **infrastructure**.

use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::infrastructure::quote_validation;
use crate::shared::repositories::base::RepoError;
use chrono::Utc;
use std::sync::Arc;
use tracing::{debug, info, warn};
use uuid::Uuid;

/// Service for quote-related business operations.
pub struct QuoteService {
    repo: Arc<QuoteRepository>,
    _db: Arc<crate::db::Database>,
    event_bus: Arc<crate::shared::services::event_system::InMemoryEventBus>,
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

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    /// Map a repository error from a `create` operation to a user-friendly
    /// string, hiding raw DB details.
    fn map_create_repo_error(error: RepoError) -> String {
        match error {
            RepoError::Database(ref message)
                if message.contains("FOREIGN KEY constraint failed") =>
            {
                "Référence invalide: client ou tâche introuvable.".to_string()
            }
            RepoError::NotFound(msg) => msg,
            _ => "Impossible de créer le devis. Veuillez réessayer.".to_string(),
        }
    }

    /// Map a repository error to a user-friendly string, hiding raw DB details.
    fn map_repo_error(error: RepoError) -> String {
        match error {
            RepoError::NotFound(msg) => msg,
            RepoError::Validation(msg) => msg,
            RepoError::Conflict(msg) => msg,
            _ => "Opération impossible. Veuillez réessayer.".to_string(),
        }
    }

    /// Recalculate subtotal, tax_total, and total from items.
    fn recalculate_totals(&self, quote_id: &str) -> Result<(), String> {
        let items = self
            .repo
            .find_items_by_quote_id(quote_id)
            .map_err(Self::map_repo_error)?;

        let mut subtotal: i64 = 0;

        for item in &items {
            let line_total = (item.qty * item.unit_price as f64) as i64;
            subtotal += line_total;
        }

        // Apply discount
        let (subtotal_after_discount, discount_amount) =
            self.calculate_discount(quote_id, subtotal)?;

        // Recalculate tax on discounted subtotal
        let mut discounted_tax_total: i64 = 0;
        let _quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        for item in &items {
            let line_total = (item.qty * item.unit_price as f64) as i64;
            if let Some(tax_rate) = item.tax_rate {
                discounted_tax_total += (line_total as f64 * tax_rate / 100.0) as i64;
            }
        }

        // If discount is applied proportionally, adjust tax
        if discount_amount > 0 {
            discounted_tax_total =
                (discounted_tax_total * subtotal_after_discount) / (subtotal.max(1));
        }

        let total = subtotal_after_discount + discounted_tax_total;

        self.repo
            .update_totals_with_discount(
                quote_id,
                subtotal_after_discount,
                discount_amount,
                discounted_tax_total,
                total,
            )
            .map_err(Self::map_repo_error)?;

        debug!(quote_id = %quote_id, subtotal = subtotal_after_discount, tax_total = discounted_tax_total, total, discount_amount, "Recalculated totals");
        Ok(())
    }

    /// Calculate discount amount based on quote settings.
    fn calculate_discount(&self, quote_id: &str, subtotal: i64) -> Result<(i64, i64), String> {
        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        let discount_amount = match (quote.discount_type.as_deref(), quote.discount_value) {
            (Some("percentage"), Some(value)) => {
                // Calculate percentage discount
                (subtotal as f64 * (value as f64 / 100.0)) as i64
            }
            (Some("fixed"), Some(value)) => {
                // Fixed amount discount (capped at subtotal)
                value.min(subtotal)
            }
            _ => 0,
        };

        let subtotal_after_discount = subtotal - discount_amount;
        Ok((subtotal_after_discount.max(0), discount_amount))
    }

    /// Create a task from a quote, delegating to the repository for SQL.
    fn create_task_from_quote(&self, quote: &Quote) -> Result<String, String> {
        use crate::domains::quotes::infrastructure::quote_repository::CreateTaskFromQuoteParams;

        let task_id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        let task_number = format!("TASK-Q-{:05}", now % 100000);
        let title = format!("Tâche issue du devis {}", quote.quote_number);
        let scheduled_date = Utc::now().format("%Y-%m-%d").to_string();

        let params = CreateTaskFromQuoteParams {
            task_id: task_id.clone(),
            task_number,
            title,
            client_id: quote.client_id.clone(),
            vehicle_plate: quote.vehicle_plate.clone(),
            vehicle_model: quote.vehicle_model.clone(),
            vehicle_make: quote.vehicle_make.clone(),
            vehicle_year: quote.vehicle_year.clone(),
            vehicle_vin: quote.vehicle_vin.clone(),
            notes: quote.notes.clone(),
            created_by: quote.created_by.clone(),
            now,
            scheduled_date,
        };

        self.repo
            .create_task_from_quote(&params)
            .map_err(|e| format!("Failed to create task from quote: {}", e))?;

        Ok(task_id)
    }

    // ------------------------------------------------------------------
    // Domain event emission
    // ------------------------------------------------------------------

    /// Emit QuoteAccepted event.
    fn emit_quote_accepted(
        &self,
        quote: &Quote,
        error_message: Option<String>,
    ) -> Result<(), String> {
        use crate::shared::services::event_system::{DomainEvent, EventPublisher};

        let event = DomainEvent::QuoteAccepted {
            id: uuid::Uuid::new_v4().to_string(),
            quote_id: quote.id.clone(),
            quote_number: quote.quote_number.clone(),
            client_id: quote.client_id.clone(),
            accepted_by: quote
                .created_by
                .clone()
                .unwrap_or_else(|| "system".to_string()),
            task_id: quote.task_id.clone(),
            timestamp: Utc::now(),
            metadata: error_message.map(|e| serde_json::json!({ "error": e })),
        };

        self.event_bus
            .publish(event)
            .map_err(|e| format!("Failed to emit QuoteAccepted event: {}", e))
    }

    /// Emit QuoteRejected event.
    fn emit_quote_rejected(&self, quote: &Quote, reason: Option<String>) -> Result<(), String> {
        use crate::shared::services::event_system::{DomainEvent, EventPublisher};

        let event = DomainEvent::QuoteRejected {
            id: uuid::Uuid::new_v4().to_string(),
            quote_id: quote.id.clone(),
            quote_number: quote.quote_number.clone(),
            client_id: quote.client_id.clone(),
            rejected_by: quote
                .created_by
                .clone()
                .unwrap_or_else(|| "system".to_string()),
            reason,
            timestamp: Utc::now(),
            metadata: None,
        };

        self.event_bus
            .publish(event)
            .map_err(|e| format!("Failed to emit QuoteRejected event: {}", e))
    }

    /// Emit QuoteConverted event.
    fn emit_quote_converted(
        &self,
        quote: &Quote,
        task_id: &str,
        task_number: &str,
    ) -> Result<(), String> {
        use crate::shared::services::event_system::{DomainEvent, EventPublisher};

        let event = DomainEvent::QuoteConverted {
            id: uuid::Uuid::new_v4().to_string(),
            quote_id: quote.id.clone(),
            quote_number: quote.quote_number.clone(),
            client_id: quote.client_id.clone(),
            task_id: task_id.to_string(),
            task_number: task_number.to_string(),
            converted_by: quote
                .created_by
                .clone()
                .unwrap_or_else(|| "system".to_string()),
            timestamp: Utc::now(),
            metadata: None,
        };

        self.event_bus
            .publish(event)
            .map_err(|e| format!("Failed to emit QuoteConverted event: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
    use crate::shared::repositories::cache::Cache;

    fn setup_service() -> (QuoteService, Arc<Database>) {
        let db = Arc::new(crate::test_utils::setup_test_db_sync());
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
        let event_bus = Arc::new(crate::shared::services::event_system::InMemoryEventBus::new());
        let service = QuoteService::new(repo, db.clone(), event_bus);

        // Insert test client
        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            r#"INSERT INTO clients (id, name, email, customer_type, total_tasks, active_tasks, completed_tasks, created_at, updated_at, synced)
               VALUES ('test-client', 'Test Client', 'test@example.com', 'individual', 0, 0, 0, ?, ?, 0)"#,
            rusqlite::params![now, now],
        )
        .expect("insert test client");

        (service, db)
    }

    #[test]
    fn test_create_quote_with_items_calculates_totals() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: Some("ABC123".to_string()),
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![
                CreateQuoteItemRequest {
                    kind: QuoteItemKind::Service,
                    label: "PPF Full Hood".to_string(),
                    description: None,
                    qty: 1.0,
                    unit_price: 50000, // 500.00
                    tax_rate: Some(20.0),
                    material_id: None,
                    position: Some(0),
                },
                CreateQuoteItemRequest {
                    kind: QuoteItemKind::Material,
                    label: "Film PPF".to_string(),
                    description: None,
                    qty: 2.0,
                    unit_price: 10000, // 100.00
                    tax_rate: Some(20.0),
                    material_id: None,
                    position: Some(1),
                },
            ],
        };

        let quote = service.create_quote(req, "test-user").unwrap();
        assert_eq!(quote.items.len(), 2);
        // subtotal = 50000 + 2*10000 = 70000
        assert_eq!(quote.subtotal, 70000);
        // tax = 50000*0.2 + 20000*0.2 = 10000 + 4000 = 14000
        assert_eq!(quote.tax_total, 14000);
        assert_eq!(quote.total, 84000);
    }

    #[test]
    fn test_create_quote_with_missing_client_returns_validation() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "missing-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![],
        };

        let result = service.create_quote(req, "test-user");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Client introuvable"));
    }

    #[test]
    fn test_create_quote_with_existing_client_succeeds() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![],
        };

        let quote = service.create_quote(req, "test-user").unwrap();
        assert_eq!(quote.client_id, "test-client");
    }

    #[test]
    fn test_update_forbidden_when_not_draft() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![],
        };

        let quote = service.create_quote(req, "test-user").unwrap();

        // Mark as sent
        service.mark_sent(&quote.id).unwrap();

        // Try to update - should fail
        let result = service.update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
                notes: Some("new notes".to_string()),
                terms: None,
                discount_type: None,
                discount_value: None,
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
            },
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("draft"));
    }

    #[test]
    fn test_mark_accepted_creates_task_when_no_task_id() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: Some("Test notes".to_string()),
            terms: None,
            vehicle_plate: Some("XYZ789".to_string()),
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![],
        };

        let quote = service.create_quote(req, "test-user").unwrap();
        service.mark_sent(&quote.id).unwrap();

        let result = service.mark_accepted(&quote.id).unwrap();
        assert!(result.task_created.is_some());
        assert!(!result.task_created.unwrap().task_id.is_empty());
        assert_eq!(result.quote.status, QuoteStatus::Accepted);
    }

    #[test]
    fn test_status_transitions() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![],
        };

        let quote = service.create_quote(req, "test-user").unwrap();
        assert_eq!(quote.status, QuoteStatus::Draft);

        // Cannot accept a draft directly
        let result = service.mark_accepted(&quote.id);
        assert!(result.is_err());

        // Can reject a draft
        let rejected = service.mark_rejected(&quote.id).unwrap();
        assert_eq!(rejected.status, QuoteStatus::Rejected);
    }

    #[test]
    fn test_list_filters() {
        let (service, _db) = setup_service();

        // Create 3 quotes
        for _ in 0..3 {
            let req = CreateQuoteRequest {
                client_id: "test-client".to_string(),
                task_id: None,
                valid_until: None,
                notes: None,
                terms: None,
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
                items: vec![],
            };
            service.create_quote(req, "test-user").unwrap();
        }

        let list = service
            .list_quotes(&QuoteQuery {
                client_id: Some("test-client".to_string()),
                ..Default::default()
            })
            .unwrap();

        assert_eq!(list.total, 3);
        assert_eq!(list.data.len(), 3);
    }

    #[test]
    fn test_discount_calculation_percentage() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![CreateQuoteItemRequest {
                kind: QuoteItemKind::Service,
                label: "PPF Service".to_string(),
                description: None,
                qty: 1.0,
                unit_price: 10000, // $100.00
                tax_rate: Some(20.0),
                material_id: None,
                position: Some(0),
            }],
        };

        let quote = service.create_quote(req, "test-user").unwrap();
        // subtotal = 10000
        assert_eq!(quote.subtotal, 10000);

        // Apply 10% discount
        let updated = service
            .update_quote(
                &quote.id,
                UpdateQuoteRequest {
                    valid_until: None,
                    notes: None,
                    terms: None,
                    discount_type: Some("percentage".to_string()),
                    discount_value: Some(10), // 10%
                    vehicle_plate: None,
                    vehicle_make: None,
                    vehicle_model: None,
                    vehicle_year: None,
                    vehicle_vin: None,
                },
            )
            .unwrap();

        // subtotal after 10% discount = 9000
        assert_eq!(updated.subtotal, 9000);
        // discount_amount = 1000
        assert_eq!(updated.discount_amount, Some(1000));
        // tax = 20% on 9000 = 1800
        assert_eq!(updated.tax_total, 1800);
        // total = 9000 + 1800 = 10800
        assert_eq!(updated.total, 10800);
    }

    #[test]
    fn test_discount_calculation_fixed() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![CreateQuoteItemRequest {
                kind: QuoteItemKind::Service,
                label: "PPF Service".to_string(),
                description: None,
                qty: 1.0,
                unit_price: 10000, // $100.00
                tax_rate: Some(20.0),
                material_id: None,
                position: Some(0),
            }],
        };

        let quote = service.create_quote(req, "test-user").unwrap();
        // subtotal = 10000
        assert_eq!(quote.subtotal, 10000);

        // Apply $5 fixed discount
        let updated = service
            .update_quote(
                &quote.id,
                UpdateQuoteRequest {
                    valid_until: None,
                    notes: None,
                    terms: None,
                    discount_type: Some("fixed".to_string()),
                    discount_value: Some(500), // $5.00
                    vehicle_plate: None,
                    vehicle_make: None,
                    vehicle_model: None,
                    vehicle_year: None,
                    vehicle_vin: None,
                },
            )
            .unwrap();

        // subtotal after $5 discount = 9500
        assert_eq!(updated.subtotal, 9500);
        // discount_amount = 500
        assert_eq!(updated.discount_amount, Some(500));
        // tax = 20% on 9500 = 1900
        assert_eq!(updated.tax_total, 1900);
        // total = 9500 + 1900 = 11400
        assert_eq!(updated.total, 11400);
    }

    #[test]
    fn test_discount_validation_percentage_over_100() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![],
        };

        let quote = service.create_quote(req, "test-user").unwrap();

        // Try to apply 150% discount - should fail
        let result = service.update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
                notes: None,
                terms: None,
                discount_type: Some("percentage".to_string()),
                discount_value: Some(150), // 150% - should fail
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
            },
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("exceed 100%"));
    }

    #[test]
    fn test_remove_discount() {
        let (service, _db) = setup_service();

        let req = CreateQuoteRequest {
            client_id: "test-client".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![CreateQuoteItemRequest {
                kind: QuoteItemKind::Service,
                label: "PPF Service".to_string(),
                description: None,
                qty: 1.0,
                unit_price: 10000,
                tax_rate: Some(20.0),
                material_id: None,
                position: Some(0),
            }],
        };

        let quote = service.create_quote(req, "test-user").unwrap();

        // Apply 10% discount
        let discounted = service
            .update_quote(
                &quote.id,
                UpdateQuoteRequest {
                    valid_until: None,
                    notes: None,
                    terms: None,
                    discount_type: Some("percentage".to_string()),
                    discount_value: Some(10),
                    vehicle_plate: None,
                    vehicle_make: None,
                    vehicle_model: None,
                    vehicle_year: None,
                    vehicle_vin: None,
                },
            )
            .unwrap();

        assert_eq!(discounted.subtotal, 9000);
        assert_eq!(discounted.discount_amount, Some(1000));

        // Remove discount
        let no_discount = service
            .update_quote(
                &quote.id,
                UpdateQuoteRequest {
                    valid_until: None,
                    notes: None,
                    terms: None,
                    discount_type: None,
                    discount_value: Some(0),
                    vehicle_plate: None,
                    vehicle_make: None,
                    vehicle_model: None,
                    vehicle_year: None,
                    vehicle_vin: None,
                },
            )
            .unwrap();

        // Should return to original values
        assert_eq!(no_discount.subtotal, 10000);
        assert_eq!(no_discount.discount_amount, Some(0));
        assert_eq!(no_discount.tax_total, 2000);
        assert_eq!(no_discount.total, 12000);
    }
}
