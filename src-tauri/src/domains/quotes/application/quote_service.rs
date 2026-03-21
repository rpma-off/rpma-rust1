//! Quote application service — business logic for quote (devis) management.
//!
//! This service handles CRUD operations and status transitions.
//! Financial calculations (totals, discounts) live in [`super::quote_totals`],
//! domain event emission in [`super::quote_events`], and attachment
//! operations in [`super::quote_attachment_service`].
//!
//! Extracted from `infrastructure/quote.rs` to comply with the layered
//! architecture (ADR-002): business logic belongs in the **application**
//! layer, while SQL and persistence stay in **infrastructure**.

/// ADR-001: Application Layer
use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::infrastructure::quote_validation;
use crate::shared::contracts::auth::UserRole;
use chrono::Utc;
use std::sync::Arc;
use tracing::{info, warn};

/// Service for quote-related business operations.
pub struct QuoteService {
    pub(super) repo: Arc<dyn IQuoteRepository>,
    pub(super) event_bus: Arc<crate::shared::services::event_bus::InMemoryEventBus>,
}

impl QuoteService {
    /// Create a new QuoteService.
    pub fn new(
        repo: Arc<dyn IQuoteRepository>,
        event_bus: Arc<crate::shared::services::event_bus::InMemoryEventBus>,
    ) -> Self {
        Self { repo, event_bus }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /// Enforce quote-level RBAC.
    ///
    /// | Operation          | Viewer | Technician | Supervisor | Admin |
    /// |--------------------|--------|------------|------------|-------|
    /// | create / update    |   ❌   |    ❌      |    ✅      |  ✅   |
    /// | delete             |   ❌   |    ❌      |    ❌      |  ✅   |
    pub(super) fn check_quote_permission(role: &UserRole, operation: &str) -> Result<(), String> {
        let allowed = match operation {
            "create" | "update" | "duplicate" => {
                matches!(role, UserRole::Admin | UserRole::Supervisor)
            }
            "delete" => matches!(role, UserRole::Admin),
            _ => false,
        };
        if !allowed {
            Err(format!("Insufficient permissions to {} quotes", operation))
        } else {
            Ok(())
        }
    }

    /// Fetch a quote by ID with consistent error handling.
    ///
    /// Centralises the `find_by_id + map_err + ok_or_else` boilerplate that
    /// every mutating method needs.  Error text is intentionally generic —
    /// callers add context via their own status-check messages.
    ///
    /// `pub(super)` so that sibling application modules (`quote_status`, etc.)
    /// can reuse it without duplicating the boilerplate.
    pub(super) fn fetch_quote(&self, id: &str) -> Result<Quote, String> {
        self.repo
            .find_by_id(id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())
    }

    // ------------------------------------------------------------------
    // Quote CRUD
    // ------------------------------------------------------------------

    /// Create a new quote.
    pub fn create_quote(
        &self,
        req: CreateQuoteRequest,
        user_id: &str,
        role: &UserRole,
    ) -> Result<Quote, String> {
        Self::check_quote_permission(role, "create")?;
        req.validate()?;

        // Validate discount values
        quote_validation::validate_discount_update(
            req.discount_type.as_deref(),
            req.discount_value,
        )?;

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
            description: req.description.clone(),
            notes: req.notes.clone(),
            terms: req.terms.clone(),
            subtotal: 0,
            tax_total: 0,
            total: 0,
            discount_type: req.discount_type.clone(),
            discount_value: req.discount_value,
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
    pub fn update_quote(
        &self,
        id: &str,
        req: UpdateQuoteRequest,
        role: &UserRole,
    ) -> Result<Quote, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(id)?;

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

        self.fetch_quote(id)
    }

    /// Soft-delete a quote (Draft only).
    pub fn delete_quote(&self, id: &str, role: &UserRole) -> Result<bool, String> {
        Self::check_quote_permission(role, "delete")?;
        let quote = self.fetch_quote(id)?;

        if quote.status != QuoteStatus::Draft {
            return Err("Only draft quotes can be deleted".to_string());
        }

        self.repo.delete(id).map_err(Self::map_repo_error)
    }

    /// Duplicate a quote: create a new Draft with copies of all items.
    pub fn duplicate_quote(
        &self,
        id: &str,
        user_id: &str,
        role: &UserRole,
    ) -> Result<Quote, String> {
        Self::check_quote_permission(role, "duplicate")?;
        let source = self.fetch_quote(id)?;

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

        let result = self.fetch_quote(&new_id)?;

        info!(source_id = %id, new_id = %new_id, "Quote duplicated: {}", result.quote_number);
        Ok(result)
    }

    // ------------------------------------------------------------------
    // Quote Items
    // ------------------------------------------------------------------

    /// Add an item to a quote (Draft only).
    pub fn add_item(
        &self,
        quote_id: &str,
        req: CreateQuoteItemRequest,
        role: &UserRole,
    ) -> Result<Quote, String> {
        Self::check_quote_permission(role, "update")?;
        req.validate()?;

        let quote = self.fetch_quote(quote_id)?;

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

        self.fetch_quote(quote_id)
    }

    /// Update a quote item (Draft only).
    pub fn update_item(
        &self,
        quote_id: &str,
        item_id: &str,
        req: UpdateQuoteItemRequest,
        role: &UserRole,
    ) -> Result<Quote, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(quote_id)?;

        if quote.status != QuoteStatus::Draft {
            return Err("Items can only be updated on draft quotes".to_string());
        }

        self.repo
            .update_item(item_id, quote_id, &req)
            .map_err(Self::map_repo_error)?;

        self.recalculate_totals(quote_id)?;

        self.fetch_quote(quote_id)
    }

    /// Delete a quote item (Draft only).
    pub fn delete_item(
        &self,
        quote_id: &str,
        item_id: &str,
        role: &UserRole,
    ) -> Result<Quote, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(quote_id)?;

        if quote.status != QuoteStatus::Draft {
            return Err("Items can only be deleted from draft quotes".to_string());
        }

        self.repo
            .delete_item(item_id, quote_id)
            .map_err(Self::map_repo_error)?;

        self.recalculate_totals(quote_id)?;

        self.fetch_quote(quote_id)
    }
}
// Status transitions (mark_sent, mark_accepted, mark_rejected, mark_expired,
// mark_changes_requested, reopen) and convert_to_task live in quote_status.rs.

#[cfg(test)]
#[path = "../tests/quote_service_tests.rs"]
mod tests;
