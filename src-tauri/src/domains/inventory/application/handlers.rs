use std::sync::Arc;

use async_trait::async_trait;

use crate::shared::event_bus::{DomainEvent, DomainEventHandler, InterventionFinalized};

use super::service::InventoryService;

pub struct InterventionFinalizedHandler {
    service: Arc<InventoryService>,
}

impl InterventionFinalizedHandler {
    pub fn new(service: Arc<InventoryService>) -> Self {
        Self { service }
    }
}

#[async_trait]
impl DomainEventHandler for InterventionFinalizedHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        if let DomainEvent::InterventionFinalized {
            intervention_id,
            task_id,
            technician_id,
            completed_at_ms,
            ..
        } = event
        {
            let payload = InterventionFinalized {
                intervention_id: intervention_id.clone(),
                task_id: task_id.clone(),
                technician_id: technician_id.clone(),
                completed_at_ms: *completed_at_ms,
            };
            self.service
                .handle_intervention_finalized(&payload)
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec!["InterventionFinalized"]
    }
}
