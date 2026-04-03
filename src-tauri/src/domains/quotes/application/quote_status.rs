//! Status transition methods for `QuoteService`.
//!
//! Extracted from `quote_service.rs` to keep that module focused on CRUD and
//! item management.  Each method here represents a single status-machine edge
//! and follows the invariant: fetch → validate current status → persist → emit
//! event (where applicable) → return updated quote.
//!
//! Helpers (`fetch_quote`, `map_repo_error`, `emit_*`) are defined in their
//! respective sibling modules and are accessible here via `pub(super)`.

use tracing::{info, warn};

use crate::domains::quotes::domain::models::quote::*;
use crate::shared::contracts::auth::UserRole;

use super::quote_service::QuoteService;

impl QuoteService {
    // ------------------------------------------------------------------
    // Status Transitions
    // ------------------------------------------------------------------

    /// Mark a quote as sent (Draft → Sent).
    /// Requires at least one item and a non-zero total.
    pub fn mark_sent(&self, id: &str, role: &UserRole) -> Result<Quote, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(id)?;

        quote.can_be_sent()?;

        self.repo
            .update_status(id, &QuoteStatus::Sent)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote marked as sent");

        self.fetch_quote(id)
    }

    /// Mark a quote as accepted (Sent → Accepted).
    ///
    /// Note: Task creation from accepted quotes is handled via the event bus
    /// (`QuoteAccepted` event).  This method only updates the quote status.
    pub fn mark_accepted(
        &self,
        id: &str,
        accepted_by: &str,
        role: &UserRole,
    ) -> Result<QuoteAcceptResponse, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(id)?;

        if !quote.status.can_transition_to(&QuoteStatus::Accepted) {
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

        let updated_quote = self.fetch_quote(id)?;

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
    pub fn mark_rejected(
        &self,
        id: &str,
        rejected_by: &str,
        role: &UserRole,
    ) -> Result<Quote, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(id)?;

        if !quote.status.can_transition_to(&QuoteStatus::Rejected) {
            return Err(format!(
                "Un devis ne peut être rejeté que depuis l'état 'envoyé' (statut actuel: '{}')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Rejected)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, rejected_by = %rejected_by, "Quote rejected");

        let updated_quote = self.fetch_quote(id)?;

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
    pub fn mark_expired(&self, id: &str, role: &UserRole) -> Result<Quote, String> {
        Self::check_quote_permission(role, "delete")?;
        let quote = self.fetch_quote(id)?;

        if !quote.status.can_transition_to(&QuoteStatus::Expired) {
            return Err(format!(
                "Seuls les devis en état 'draft' ou 'envoyé' peuvent expirer (statut actuel: '{}')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Expired)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote marked as expired");

        self.fetch_quote(id)
    }

    /// Mark a quote as changes_requested (Sent → ChangesRequested).
    ///
    /// Signals that the customer has reviewed the quote and requested changes.
    pub fn mark_changes_requested(&self, id: &str, role: &UserRole) -> Result<Quote, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(id)?;

        if !quote.status.can_transition_to(&QuoteStatus::ChangesRequested) {
            return Err(format!(
                "Des modifications ne peuvent être demandées que depuis l'état 'envoyé' (statut actuel: '{}')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::ChangesRequested)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote marked as changes_requested");

        self.fetch_quote(id)
    }

    /// Reopen a quote (ChangesRequested | Rejected → Draft).
    ///
    /// Allows revising a quote that was rejected or needs changes.
    pub fn reopen(&self, id: &str, role: &UserRole) -> Result<Quote, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(id)?;

        if !quote.status.can_transition_to(&QuoteStatus::Draft) {
            return Err(format!(
                "Seuls les devis 'rejeté' ou 'modifications demandées' peuvent être rouverts (statut actuel: '{}')",
                quote.status
            ));
        }

        self.repo
            .update_status(id, &QuoteStatus::Draft)
            .map_err(Self::map_repo_error)?;

        info!(quote_id = %id, "Quote reopened as draft");

        self.fetch_quote(id)
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
        converted_by: &str,
        role: &UserRole,
    ) -> Result<ConvertQuoteToTaskResponse, String> {
        Self::check_quote_permission(role, "update")?;
        let quote = self.fetch_quote(quote_id)?;

        if !quote.status.can_transition_to(&QuoteStatus::Converted) {
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
        if let Err(e) = self.emit_quote_converted(&quote, task_id, task_number, converted_by) {
            warn!(quote_id = %quote_id, error = %e, "Failed to emit QuoteConverted event");
        }

        let updated_quote = self.fetch_quote(quote_id)?;

        info!(quote_id = %quote_id, task_id = %task_id, "Quote converted to task");

        Ok(ConvertQuoteToTaskResponse {
            quote: updated_quote,
            task_id: task_id.to_string(),
            task_number: task_number.to_string(),
        })
    }
}
