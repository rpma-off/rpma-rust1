use std::sync::Arc;

use async_trait::async_trait;
use tracing::info;

use crate::shared::event_bus::{DomainEvent, DomainEventHandler};

use super::service::InventoryService;

/// Reacts to `InterventionFinalized` / `InterventionCancelled` domain events
/// with **side-effect-only** behaviour (logging).
///
/// ADR-016: Primary inventory operations (stock-out transaction creation,
/// consumption reversal) are now performed synchronously in the application
/// layer (see `InventoryService::consolidate_intervention_finalized` and
/// `InventoryService::revert_intervention_consumptions`).  This handler is
/// kept solely for observability.
pub struct InterventionFinalizedHandler {
    _service: Arc<InventoryService>,
}

impl InterventionFinalizedHandler {
    pub fn new(service: Arc<InventoryService>) -> Self {
        Self { _service: service }
    }
}

#[async_trait]
impl DomainEventHandler for InterventionFinalizedHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        match event {
            DomainEvent::InterventionFinalized {
                intervention_id,
                task_id,
                ..
            } => {
                info!(
                    intervention_id = %intervention_id,
                    task_id = %task_id,
                    "InterventionFinalizedHandler: Intervention finalized (inventory consolidation handled by application layer)"
                );
            }
            DomainEvent::InterventionCancelled {
                intervention_id, ..
            } => {
                info!(
                    intervention_id = %intervention_id,
                    "InterventionFinalizedHandler: Intervention cancelled (consumption reversal handled by application layer)"
                );
            }
            _ => {}
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec![
            DomainEvent::INTERVENTION_FINALIZED,
            DomainEvent::INTERVENTION_CANCELLED,
        ]
    }
}
