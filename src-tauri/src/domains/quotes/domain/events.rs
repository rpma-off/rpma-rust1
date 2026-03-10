//! Domain events owned by the quotes bounded context.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub use crate::shared::services::event_system::DomainEvent;

/// TODO: document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteShared {
    pub quote_id: String,
    pub quote_number: String,
    pub shared_by: String,
    pub shared_at_ms: i64,
}

/// TODO: document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteCustomerResponded {
    pub quote_id: String,
    pub quote_number: String,
    pub action: String,
    pub customer_id: Option<String>,
    pub responded_at_ms: i64,
}

/// TODO: document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteConvertedToTask {
    pub quote_id: String,
    pub quote_number: String,
    pub task_id: String,
    pub converted_by: String,
    pub converted_at_ms: i64,
}

impl From<QuoteShared> for DomainEvent {
    fn from(event: QuoteShared) -> Self {
        DomainEvent::QuoteShared {
            id: Uuid::new_v4().to_string(),
            quote_id: event.quote_id,
            quote_number: event.quote_number,
            shared_by: event.shared_by,
            shared_at_ms: event.shared_at_ms,
            timestamp: chrono::DateTime::from_timestamp_millis(event.shared_at_ms)
                .unwrap_or_else(|| Utc::now()),
            metadata: None,
        }
    }
}

impl From<QuoteCustomerResponded> for DomainEvent {
    fn from(event: QuoteCustomerResponded) -> Self {
        DomainEvent::QuoteCustomerResponded {
            id: Uuid::new_v4().to_string(),
            quote_id: event.quote_id,
            quote_number: event.quote_number,
            action: event.action,
            customer_id: event.customer_id,
            responded_at_ms: event.responded_at_ms,
            timestamp: chrono::DateTime::from_timestamp_millis(event.responded_at_ms)
                .unwrap_or_else(|| Utc::now()),
            metadata: None,
        }
    }
}

impl From<QuoteConvertedToTask> for DomainEvent {
    fn from(event: QuoteConvertedToTask) -> Self {
        DomainEvent::QuoteConvertedToTask {
            id: Uuid::new_v4().to_string(),
            quote_id: event.quote_id,
            quote_number: event.quote_number,
            task_id: event.task_id,
            converted_by: event.converted_by,
            converted_at_ms: event.converted_at_ms,
            timestamp: chrono::DateTime::from_timestamp_millis(event.converted_at_ms)
                .unwrap_or_else(|| Utc::now()),
            metadata: None,
        }
    }
}
