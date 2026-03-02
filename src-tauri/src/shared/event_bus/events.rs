use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub use crate::shared::services::event_system::DomainEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterventionFinalized {
    pub intervention_id: String,
    pub task_id: String,
    pub technician_id: String,
    pub completed_at_ms: i64,
}

impl From<InterventionFinalized> for DomainEvent {
    fn from(event: InterventionFinalized) -> Self {
        DomainEvent::InterventionFinalized {
            id: Uuid::new_v4().to_string(),
            intervention_id: event.intervention_id,
            task_id: event.task_id,
            technician_id: event.technician_id,
            completed_at_ms: event.completed_at_ms,
            timestamp: chrono::DateTime::from_timestamp_millis(event.completed_at_ms)
                .unwrap_or_else(|| Utc::now()),
            metadata: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialConsumed {
    pub material_id: String,
    pub quantity: f64,
    pub intervention_id: String,
    pub at_ms: i64,
    pub unit: Option<String>,
}

impl From<MaterialConsumed> for DomainEvent {
    fn from(event: MaterialConsumed) -> Self {
        DomainEvent::MaterialConsumed {
            id: Uuid::new_v4().to_string(),
            material_id: event.material_id,
            intervention_id: event.intervention_id,
            quantity: event.quantity,
            unit: event.unit.unwrap_or_else(|| "unit".to_string()),
            consumed_by: "system".to_string(),
            timestamp: chrono::DateTime::from_timestamp_millis(event.at_ms)
                .unwrap_or_else(|| Utc::now()),
            metadata: None,
        }
    }
}

// Quote Events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteShared {
    pub quote_id: String,
    pub quote_number: String,
    pub shared_by: String,
    pub shared_at_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteCustomerResponded {
    pub quote_id: String,
    pub quote_number: String,
    pub action: String,
    pub customer_id: Option<String>,
    pub responded_at_ms: i64,
}

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
