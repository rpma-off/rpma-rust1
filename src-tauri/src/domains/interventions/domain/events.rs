//! Domain events owned by the interventions bounded context.

use chrono::Utc;
use serde::{Deserialize, Serialize};

pub use crate::shared::services::event_system::DomainEvent;

/// TODO: document
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
            id: crate::shared::utils::uuid::generate_uuid_string(),
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
