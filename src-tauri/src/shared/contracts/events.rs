//! Cross-domain event contract types.
//!
//! Event payload structs used across bounded-context boundaries live here.
//! Domain-internal events stay in `domains/*/domain/events.rs`; only structs
//! consumed by a *different* domain are promoted to this shared contract.

use serde::{Deserialize, Serialize};

use crate::shared::services::domain_event::DomainEvent;

/// Emitted when an intervention is fully finalized (all steps done, task
/// marked complete).  Consumed by the inventory domain to flush any
/// pending material-consumption records for the intervention.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterventionFinalized {
    pub intervention_id: String,
    pub task_id: String,
    pub technician_id: String,
    pub completed_at_ms: i64,
}

impl From<InterventionFinalized> for DomainEvent {
    fn from(e: InterventionFinalized) -> Self {
        DomainEvent::InterventionFinalized {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            intervention_id: e.intervention_id,
            task_id: e.task_id,
            technician_id: e.technician_id,
            completed_at_ms: e.completed_at_ms,
            timestamp: chrono::DateTime::from_timestamp_millis(e.completed_at_ms)
                .unwrap_or_else(chrono::Utc::now),
            metadata: None,
        }
    }
}
