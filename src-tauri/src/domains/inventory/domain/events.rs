//! Domain events owned by the inventory bounded context.

use serde::{Deserialize, Serialize};

pub use crate::shared::services::domain_event::DomainEvent;

/// Record of material consumed during a single intervention.
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
        crate::shared::services::event_bus::event_factory::material_consumed(
            event.material_id,
            event.intervention_id,
            event.quantity,
            event.unit.unwrap_or_else(|| "unit".to_string()),
        )
    }
}
