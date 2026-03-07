//! Financial calculation helpers for `QuoteService`.
//!
//! Extracted from `quote_service.rs` to isolate the totals recalculation
//! and discount computation logic into a single module.
//!
//! # Rounding rule
//! ROUND_HALF_UP (`f64::round`) applied at each line-total and tax computation.
//! All monetary amounts are stored as **integer cents** (EUR × 100).
//! Percentage `discount_value` is treated as a value in [0, 100].
//! Fixed `discount_value` is in cents and is capped at the subtotal.

use crate::shared::repositories::base::RepoError;
use chrono::Utc;
use tracing::debug;

use super::quote_service::QuoteService;

impl QuoteService {
    /// Recalculate subtotal, tax_total, and total from items.
    pub(super) fn recalculate_totals(&self, quote_id: &str) -> Result<(), String> {
        let items = self
            .repo
            .find_items_by_quote_id(quote_id)
            .map_err(Self::map_repo_error)?;

        let mut subtotal: i64 = 0;

        for item in &items {
            // ROUND_HALF_UP at each line to avoid accumulation of truncation errors
            let line_total = (item.qty * item.unit_price as f64).round() as i64;
            subtotal += line_total;
        }

        // Apply discount
        let (subtotal_after_discount, discount_amount) =
            self.calculate_discount(quote_id, subtotal)?;

        // Recalculate tax on discounted subtotal
        let mut discounted_tax_total: i64 = 0;

        for item in &items {
            let line_total = (item.qty * item.unit_price as f64).round() as i64;
            if let Some(tax_rate) = item.tax_rate {
                discounted_tax_total += (line_total as f64 * tax_rate / 100.0).round() as i64;
            }
        }

        // Proportionally adjust tax when a discount is applied
        if discount_amount > 0 {
            discounted_tax_total =
                (discounted_tax_total as f64 * subtotal_after_discount as f64
                    / subtotal.max(1) as f64)
                    .round() as i64;
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
    pub(super) fn calculate_discount(
        &self,
        quote_id: &str,
        subtotal: i64,
    ) -> Result<(i64, i64), String> {
        let quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(Self::map_repo_error)?
            .ok_or_else(|| "Quote not found".to_string())?;

        let discount_amount = match (quote.discount_type.as_deref(), quote.discount_value) {
            (Some("percentage"), Some(value)) => {
                // ROUND_HALF_UP on percentage discount
                (subtotal as f64 * (value as f64 / 100.0)).round() as i64
            }
            (Some("fixed"), Some(value)) => {
                // Fixed amount discount (capped at subtotal, never negative)
                value.min(subtotal).max(0)
            }
            _ => 0,
        };

        let subtotal_after_discount = (subtotal - discount_amount).max(0);
        Ok((subtotal_after_discount, discount_amount))
    }

    /// Current timestamp in milliseconds.
    pub(super) fn now_ms() -> i64 {
        Utc::now().timestamp_millis()
    }

    /// Map a repository error from a `create` operation to a user-friendly
    /// string, hiding raw DB details.
    pub(super) fn map_create_repo_error(error: RepoError) -> String {
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
    pub(super) fn map_repo_error(error: RepoError) -> String {
        match error {
            RepoError::NotFound(msg) => msg,
            RepoError::Validation(msg) => msg,
            RepoError::Conflict(msg) => msg,
            _ => "Opération impossible. Veuillez réessayer.".to_string(),
        }
    }
}

#[cfg(test)]
mod totals_tests {
    use super::*;
    use crate::shared::repositories::cache::Cache;
    use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
    use crate::domains::quotes::domain::models::quote::*;
    use std::sync::Arc;

    fn setup_service() -> (QuoteService, Arc<crate::db::Database>) {
        let db = Arc::new(crate::test_utils::setup_test_db_sync());
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
        let event_bus = Arc::new(crate::shared::services::event_system::InMemoryEventBus::new());
        let service = QuoteService::new(repo, db.clone(), event_bus);

        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            r#"INSERT INTO clients (id, name, email, customer_type, total_tasks, active_tasks, completed_tasks, created_at, updated_at, synced)
               VALUES ('client-totals', 'Totals Client', 'totals@example.com', 'individual', 0, 0, 0, ?, ?, 0)"#,
            rusqlite::params![now, now],
        )
        .expect("insert test client");

        (service, db)
    }

    fn make_item_req(unit_price: i64, qty: f64, tax_rate: f64) -> CreateQuoteItemRequest {
        CreateQuoteItemRequest {
            kind: QuoteItemKind::Service,
            label: "Test item".to_string(),
            description: None,
            qty,
            unit_price,
            tax_rate: Some(tax_rate),
            material_id: None,
            position: Some(0),
        }
    }

    #[test]
    fn test_rounding_line_total() {
        // qty=1.5, unit_price=333 cents → exact = 499.5 → rounded = 500
        let (service, _db) = setup_service();
        let req = CreateQuoteRequest {
            client_id: "client-totals".to_string(),
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
                label: "Rounded item".to_string(),
                description: None,
                qty: 1.5,
                unit_price: 333,
                tax_rate: None,
                material_id: None,
                position: Some(0),
            }],
        };
        let quote = service.create_quote(req, "test-user").unwrap();
        // 1.5 * 333 = 499.5 → rounds to 500
        assert_eq!(quote.subtotal, 500);
    }

    #[test]
    fn test_percentage_discount_rounds_correctly() {
        let (service, _db) = setup_service();
        let req = CreateQuoteRequest {
            client_id: "client-totals".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![make_item_req(10001, 1.0, 0.0)],
        };
        let quote = service.create_quote(req, "test-user").unwrap();
        // Apply 10% discount: 10001 * 0.10 = 1000.1 → rounds to 1000
        let updated = service
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
        assert_eq!(updated.discount_amount, Some(1000));
        assert_eq!(updated.subtotal, 10001 - 1000);
    }

    #[test]
    fn test_fixed_discount_capped_at_subtotal() {
        let (service, _db) = setup_service();
        let req = CreateQuoteRequest {
            client_id: "client-totals".to_string(),
            task_id: None,
            valid_until: None,
            notes: None,
            terms: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            items: vec![make_item_req(1000, 1.0, 0.0)],
        };
        let quote = service.create_quote(req, "test-user").unwrap();
        // discount_value > subtotal: capped at subtotal
        let updated = service
            .update_quote(
                &quote.id,
                UpdateQuoteRequest {
                    valid_until: None,
                    notes: None,
                    terms: None,
                    discount_type: Some("fixed".to_string()),
                    discount_value: Some(99999), // way more than subtotal
                    vehicle_plate: None,
                    vehicle_make: None,
                    vehicle_model: None,
                    vehicle_year: None,
                    vehicle_vin: None,
                },
            )
            .unwrap();
        assert_eq!(updated.subtotal, 0);
        assert_eq!(updated.total, 0);
    }

    #[test]
    fn test_zero_items_all_totals_zero() {
        let (service, _db) = setup_service();
        let req = CreateQuoteRequest {
            client_id: "client-totals".to_string(),
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
        assert_eq!(quote.subtotal, 0);
        assert_eq!(quote.tax_total, 0);
        assert_eq!(quote.total, 0);
    }
}
