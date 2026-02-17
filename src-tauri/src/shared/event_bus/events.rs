use chrono::{TimeZone, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub use crate::services::event_system::DomainEvent;

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
            timestamp: Utc.timestamp_millis(event.completed_at_ms),
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
            timestamp: Utc.timestamp_millis(event.at_ms),
            metadata: None,
        }
    }
}
