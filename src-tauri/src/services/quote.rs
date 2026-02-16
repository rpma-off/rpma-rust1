//! Quote Service - Business logic for quote (devis) management
//!
//! This service handles CRUD operations, status transitions, totals
//! calculation, and task creation on acceptance.

use crate::models::quote::*;
use crate::repositories::QuoteRepository;
use chrono::Utc;
use std::sync::Arc;
use tracing::{debug, info, warn};
use uuid::Uuid;

/// Service for quote-related business operations
#[derive(Debug)]
pub struct QuoteService {
    repo: Arc<QuoteRepository>,
    db: Arc<crate::db::Database>,
}

impl QuoteService {
    /// Create a new QuoteService
    pub fn new(repo: Arc<QuoteRepository>, db: Arc<crate::db::Database>) -> Self {
        Self { repo, db }
    }

    /// Create a new quote
    pub fn create_quote(
        &self,
        req: CreateQuoteRequest,
        user_id: &str,
    ) -> Result<Quote, String> {
        req.validate()?;

        let now = Utc::now().timestamp_millis();
        let id = Uuid::new_v4().to_string();
        let quote_number = self.repo.next_quote_number().map_err(|e| e.to_string())?;

        let mut quote = Quote {
            id: id.clone(),
            quote_number,
            client_id: req.client_id.clone(),
            task_id: req.task_id.clone(),
            status: QuoteStatus::Draft,
            valid_until: req.valid_until,
            notes: req.notes.clone(),
            terms: req.terms.clone(),
            subtotal: 0,
            tax_total: 0,
            total: 0,
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

        self.repo.create(&quote).map_err(|e| e.to_string())?;

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
            self.repo.add_item(&item).map_err(|e| e.to_string())?;
            quote.items.push(item);
        }

        // Recalculate totals
        self.recalculate_totals(&id)?;

        // Re-fetch to get updated totals
        let quote = self
            .repo
            .find_by_id(&id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found after creation".to_string())?;

        info!(quote_id = %id, "Quote created: {}", quote.quote_number);
        Ok(quote)
    }

    /// Get a quote by ID
    pub fn get_quote(&self, id: &str) -> Result<Option<Quote>, String> {
        self.repo.find_by_id(id).map_err(|e| e.to_string())
    }

    /// List quotes with filters
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

    /// Update a quote (Draft only)
    pub fn update_quote(
        &self,
        id: &str,
        req: UpdateQuoteRequest,
    ) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Only draft quotes can be edited".to_string());
        }

        self.repo.update(id, &req).map_err(|e| e.to_string())?;

        self.repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found after update".to_string())
    }

    /// Delete a quote (Draft only)
    pub fn delete_quote(&self, id: &str) -> Result<bool, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Only draft quotes can be deleted".to_string());
        }

        self.repo.delete(id).map_err(|e| e.to_string())
    }

    /// Add an item to a quote (Draft only)
    pub fn add_item(
        &self,
        quote_id: &str,
        req: CreateQuoteItemRequest,
    ) -> Result<Quote, String> {
        req.validate()?;

        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Items can only be added to draft quotes".to_string());
        }

        let now = Utc::now().timestamp_millis();
        let position = req
            .position
            .unwrap_or(quote.items.len() as i32);

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

        self.repo.add_item(&item).map_err(|e| e.to_string())?;
        self.recalculate_totals(quote_id)?;

        self.repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found after item add".to_string())
    }

    /// Update a quote item (Draft only)
    pub fn update_item(
        &self,
        quote_id: &str,
        item_id: &str,
        req: UpdateQuoteItemRequest,
    ) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Items can only be updated on draft quotes".to_string());
        }

        self.repo
            .update_item(item_id, quote_id, &req)
            .map_err(|e| e.to_string())?;

        self.recalculate_totals(quote_id)?;

        self.repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found after item update".to_string())
    }

    /// Delete a quote item (Draft only)
    pub fn delete_item(
        &self,
        quote_id: &str,
        item_id: &str,
    ) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err("Items can only be deleted from draft quotes".to_string());
        }

        self.repo
            .delete_item(item_id, quote_id)
            .map_err(|e| e.to_string())?;

        self.recalculate_totals(quote_id)?;

        self.repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found after item delete".to_string())
    }

    /// Mark a quote as sent (Draft -> Sent)
    pub fn mark_sent(&self, id: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Draft {
            return Err(format!(
                "Cannot mark as sent: quote is in '{}' status (expected 'draft')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Sent)
            .map_err(|e| e.to_string())?;

        info!(quote_id = %id, "Quote marked as sent");

        self.repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found after status update".to_string())
    }

    /// Mark a quote as accepted (Sent -> Accepted)
    /// Optionally creates a task if task_id is null
    pub fn mark_accepted(&self, id: &str) -> Result<QuoteAcceptResponse, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        if quote.status != QuoteStatus::Sent {
            return Err(format!(
                "Cannot accept: quote is in '{}' status (expected 'sent')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Accepted)
            .map_err(|e| e.to_string())?;

        let mut task_created = None;

        // Create task if no task linked
        if quote.task_id.is_none() {
            match self.create_task_from_quote(&quote) {
                Ok(task_id) => {
                    self.repo
                        .link_task(id, &task_id)
                        .map_err(|e| e.to_string())?;
                    task_created = Some(TaskCreatedInfo { task_id });
                    info!(quote_id = %id, "Task created from accepted quote");
                }
                Err(e) => {
                    warn!(quote_id = %id, error = %e, "Failed to create task from quote, continuing");
                }
            }
        }

        let updated_quote = self
            .repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found after acceptance".to_string())?;

        info!(quote_id = %id, "Quote accepted");

        Ok(QuoteAcceptResponse {
            quote: updated_quote,
            task_created,
        })
    }

    /// Mark a quote as rejected (Sent -> Rejected, or Draft -> Rejected)
    pub fn mark_rejected(&self, id: &str) -> Result<Quote, String> {
        let quote = self
            .repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        if !matches!(quote.status, QuoteStatus::Draft | QuoteStatus::Sent) {
            return Err(format!(
                "Cannot reject: quote is in '{}' status (expected 'draft' or 'sent')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Rejected)
            .map_err(|e| e.to_string())?;

        info!(quote_id = %id, "Quote rejected");

        self.repo
            .find_by_id(id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found after rejection".to_string())
    }

    /// Recalculate subtotal, tax_total, and total from items
    fn recalculate_totals(&self, quote_id: &str) -> Result<(), String> {
        let items = self
            .repo
            .find_items_by_quote_id(quote_id)
            .map_err(|e| e.to_string())?;

        let mut subtotal: i64 = 0;
        let mut tax_total: i64 = 0;

        for item in &items {
            let line_total = (item.qty * item.unit_price as f64) as i64;
            subtotal += line_total;
            if let Some(tax_rate) = item.tax_rate {
                tax_total += (line_total as f64 * tax_rate / 100.0) as i64;
            }
        }

        let total = subtotal + tax_total;

        self.repo
            .update_totals(quote_id, subtotal, tax_total, total)
            .map_err(|e| e.to_string())?;

        debug!(quote_id = %quote_id, subtotal, tax_total, total, "Recalculated totals");
        Ok(())
    }

    /// Create a task from a quote using direct SQL
    fn create_task_from_quote(&self, quote: &Quote) -> Result<String, String> {
        let task_id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        let task_number = format!("TASK-Q-{:05}", now % 100000);

        self.db
            .execute(
                r#"
                INSERT INTO tasks (
                    id, task_number, title, status, priority,
                    vehicle_plate, vehicle_model, vehicle_make, vehicle_year, vin,
                    client_id, notes,
                    scheduled_date, ppf_zones,
                    created_at, updated_at, created_by
                ) VALUES (?, ?, ?, 'draft', 'medium', ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)
                "#,
                rusqlite::params![
                    task_id,
                    task_number,
                    format!("Tâche issue du devis {}", quote.quote_number),
                    quote.vehicle_plate,
                    quote.vehicle_model,
                    quote.vehicle_make,
                    quote.vehicle_year,
                    quote.vehicle_vin,
                    quote.client_id,
                    quote.notes,
                    Utc::now().format("%Y-%m-%d").to_string(),
                    now,
                    now,
                    quote.created_by,
                ],
            )
            .map_err(|e| format!("Failed to create task from quote: {}", e))?;

        Ok(task_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::repositories::cache::Cache;
    use crate::repositories::QuoteRepository;

    fn setup_service() -> (QuoteService, Arc<Database>) {
        let db = Arc::new(crate::test_utils::setup_test_db_sync());
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
        let service = QuoteService::new(repo, db.clone());

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
}
