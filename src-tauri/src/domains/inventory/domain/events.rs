//! Domain events owned by the inventory bounded context.

use chrono::Utc;
use serde::{Deserialize, Serialize};

pub use crate::shared::services::event_system::DomainEvent;

/// TODO: document
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
            id: crate::shared::utils::uuid::generate_uuid_string(),
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
