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
#[path = "../tests/quote_totals_tests.rs"]
mod totals_tests;
