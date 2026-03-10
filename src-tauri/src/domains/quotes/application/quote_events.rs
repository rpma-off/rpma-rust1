//! Domain event emission helpers for `QuoteService`.
//!
//! Extracted from `quote_service.rs` to keep event-related logic in a
//! single, focused module.  Each method publishes one domain event via
//! the in-memory event bus (ADR-004).

use crate::domains::quotes::domain::models::quote::Quote;
use chrono::Utc;

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
        use crate::shared::services::event_system::{DomainEvent, EventPublisher};

        let event = DomainEvent::QuoteAccepted {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            quote_id: quote.id.clone(),
            quote_number: quote.quote_number.clone(),
            client_id: quote.client_id.clone(),
            // Corrected: use the accepting user, not the quote creator
            accepted_by: accepted_by.to_string(),
            task_id: quote.task_id.clone(),
            timestamp: Utc::now(),
            metadata: error_message.map(|e| serde_json::json!({ "error": e })),
        };

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
        use crate::shared::services::event_system::{DomainEvent, EventPublisher};

        let event = DomainEvent::QuoteRejected {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            quote_id: quote.id.clone(),
            quote_number: quote.quote_number.clone(),
            client_id: quote.client_id.clone(),
            rejected_by: rejected_by.to_string(),
            reason,
            timestamp: Utc::now(),
            metadata: None,
        };

        self.event_bus
            .publish(event)
            .map_err(|e| format!("Failed to emit QuoteRejected event: {}", e))
    }

    /// Emit QuoteConverted event.
    pub(super) fn emit_quote_converted(
        &self,
        quote: &Quote,
        task_id: &str,
        task_number: &str,
    ) -> Result<(), String> {
        use crate::shared::services::event_system::{DomainEvent, EventPublisher};

        let event = DomainEvent::QuoteConverted {
            id: crate::shared::utils::uuid::generate_uuid_string(),
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
