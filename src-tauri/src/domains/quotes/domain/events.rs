//! Domain events owned by the quotes bounded context.

use serde::{Deserialize, Serialize};

pub use crate::shared::services::domain_event::DomainEvent;

/// Event emitted when a quote is shared with a customer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteShared {
    pub quote_id: String,
    pub quote_number: String,
    pub shared_by: String,
    pub shared_at_ms: i64,
}

/// Event emitted when a customer responds to a shared quote.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteCustomerResponded {
    pub quote_id: String,
    pub quote_number: String,
    pub action: String,
    pub customer_id: Option<String>,
    pub responded_at_ms: i64,
}

impl From<QuoteShared> for DomainEvent {
    fn from(event: QuoteShared) -> Self {
        crate::shared::services::event_bus::event_factory::quote_shared(
            event.quote_id,
            event.quote_number,
            event.shared_by,
            event.shared_at_ms,
        )
    }
}

impl From<QuoteCustomerResponded> for DomainEvent {
    fn from(event: QuoteCustomerResponded) -> Self {
        crate::shared::services::event_bus::event_factory::quote_customer_responded(
            event.quote_id,
            event.quote_number,
            event.action,
            event.customer_id,
            event.responded_at_ms,
        )
    }
}
