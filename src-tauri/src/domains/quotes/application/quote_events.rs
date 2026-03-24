//! Domain event emission helpers for `QuoteService`.
//!
//! Extracted from `quote_service.rs` to keep event-related logic in a
//! single, focused module.  Each method publishes one domain event via
//! the in-memory event bus (ADR-004).

use crate::domains::quotes::domain::models::quote::Quote;

use super::quote_service::QuoteService;

impl QuoteService {
    /// Emit QuoteAccepted event.
    ///
    /// `accepted_by` is the user ID of the person accepting the quote —
    /// NOT the creator of the quote (the previous implementation incorrectly
    /// used `quote.created_by`, which violates the intent of the field).
    pub(super) fn emit_quote_accepted(
        &self,
        quote: &Quote,
        accepted_by: &str,
        error_message: Option<String>,
    ) -> Result<(), String> {
        use crate::shared::services::event_bus::event_factory;
        use crate::shared::services::event_bus::EventPublisher;

        let event = event_factory::quote_accepted(
            quote.id.clone(),
            quote.quote_number.clone(),
            quote.client_id.clone(),
            accepted_by.to_string(),
            quote.task_id.clone(),
            error_message.map(|e| serde_json::json!({ "error": e })),
        );

        self.event_bus
            .publish(event)
            .map_err(|e| format!("Failed to emit QuoteAccepted event: {}", e))
    }

    /// Emit QuoteRejected event.
    pub(super) fn emit_quote_rejected(
        &self,
        quote: &Quote,
        rejected_by: &str,
        reason: Option<String>,
    ) -> Result<(), String> {
        use crate::shared::services::event_bus::event_factory;
        use crate::shared::services::event_bus::EventPublisher;

        let event = event_factory::quote_rejected(
            quote.id.clone(),
            quote.quote_number.clone(),
            quote.client_id.clone(),
            rejected_by.to_string(),
            reason,
        );

        self.event_bus
            .publish(event)
            .map_err(|e| format!("Failed to emit QuoteRejected event: {}", e))
    }

    /// Emit QuoteCreated event.
    pub(super) fn emit_quote_created(&self, quote: &Quote, created_by: &str) {
        use crate::shared::services::event_bus::event_factory;
        use crate::shared::services::event_bus::EventPublisher;

        let event = event_factory::quote_created(
            quote.id.clone(),
            quote.quote_number.clone(),
            quote.client_id.clone(),
            created_by.to_string(),
            quote.task_id.clone(),
        );

        if let Err(e) = self.event_bus.publish(event) {
            tracing::warn!("Failed to emit QuoteCreated event: {}", e);
        }
    }

    /// Emit QuoteUpdated event.
    pub(super) fn emit_quote_updated(&self, quote: &Quote, updated_by: &str) {
        use crate::shared::services::event_bus::event_factory;
        use crate::shared::services::event_bus::EventPublisher;

        let event = event_factory::quote_updated(
            quote.id.clone(),
            quote.quote_number.clone(),
            quote.client_id.clone(),
            updated_by.to_string(),
        );

        if let Err(e) = self.event_bus.publish(event) {
            tracing::warn!("Failed to emit QuoteUpdated event: {}", e);
        }
    }

    /// Emit QuoteDeleted event.
    pub(super) fn emit_quote_deleted(&self, quote: &Quote, deleted_by: &str) {
        use crate::shared::services::event_bus::event_factory;
        use crate::shared::services::event_bus::EventPublisher;

        let event = event_factory::quote_deleted(
            quote.id.clone(),
            quote.quote_number.clone(),
            quote.client_id.clone(),
            deleted_by.to_string(),
        );

        if let Err(e) = self.event_bus.publish(event) {
            tracing::warn!("Failed to emit QuoteDeleted event: {}", e);
        }
    }

    /// Emit QuoteDuplicated event.
    pub(super) fn emit_quote_duplicated(
        &self,
        source: &Quote,
        new_quote: &Quote,
        duplicated_by: &str,
    ) {
        use crate::shared::services::event_bus::event_factory;
        use crate::shared::services::event_bus::EventPublisher;

        let event = event_factory::quote_duplicated(
            source.id.clone(),
            new_quote.id.clone(),
            new_quote.quote_number.clone(),
            new_quote.client_id.clone(),
            duplicated_by.to_string(),
        );

        if let Err(e) = self.event_bus.publish(event) {
            tracing::warn!("Failed to emit QuoteDuplicated event: {}", e);
        }
    }

    /// Emit QuoteConverted event.
    pub(super) fn emit_quote_converted(
        &self,
        quote: &Quote,
        task_id: &str,
        task_number: &str,
        converted_by: &str,
    ) -> Result<(), String> {
        use crate::shared::services::event_bus::event_factory;
        use crate::shared::services::event_bus::EventPublisher;

        let event = event_factory::quote_converted(
            quote.id.clone(),
            quote.quote_number.clone(),
            quote.client_id.clone(),
            task_id.to_string(),
            task_number.to_string(),
            converted_by.to_string(),
        );

        self.event_bus
            .publish(event)
            .map_err(|e| format!("Failed to emit QuoteConverted event: {}", e))
    }
}
