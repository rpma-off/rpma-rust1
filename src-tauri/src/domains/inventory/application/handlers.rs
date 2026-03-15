use std::sync::Arc;

use async_trait::async_trait;
use tracing::instrument;

use crate::domains::inventory::domain::models::material::{
    InventoryTransaction, InventoryTransactionType,
};
use crate::shared::contracts::events::InterventionFinalized;
use crate::shared::event_bus::{DomainEvent, DomainEventHandler};

use super::errors::{InventoryError, InventoryResult};
use super::service::InventoryService;

/// Handles `InterventionFinalized` domain events by converting recorded
/// consumptions into persisted inventory stock-out transactions.
///
/// Owns the event-processing logic that was previously embedded in
/// `InventoryService::handle_intervention_finalized` (ADR-001: single
/// responsibility per application layer unit).
pub struct InterventionFinalizedHandler {
    service: Arc<InventoryService>,
}

impl InterventionFinalizedHandler {
    /// TODO: document
    pub fn new(service: Arc<InventoryService>) -> Self {
        Self { service }
    }

    /// Build and persist stock-out transactions for all consumptions recorded
    /// during the finalized intervention.
    #[instrument(skip(self, event), fields(intervention_id = %event.intervention_id))]
    fn process_finalized(&self, event: &InterventionFinalized) -> InventoryResult<usize> {
        let consumptions = self
            .service
            .gateway
            .get_intervention_consumption(&event.intervention_id)
            .map_err(InventoryError::from)?;

        if consumptions.is_empty() {
            return Ok(0);
        }

        let material_ids: Vec<&str> = consumptions
            .iter()
            .map(|c| c.material_id.as_str())
            .collect();
        let materials = self
            .service
            .gateway
            .get_materials_by_ids(&material_ids)
            .map_err(InventoryError::from)?;

        let mut transactions = Vec::new();
        for consumption in consumptions {
            let material = materials.get(&consumption.material_id).ok_or_else(|| {
                InventoryError::NotFound(format!("Material {} not found", consumption.material_id))
            })?;

            let total_used = consumption.quantity_used + consumption.waste_quantity;
            let mut transaction = InventoryTransaction::new(
                crate::shared::utils::uuid::generate_uuid_string(),
                consumption.material_id.clone(),
                InventoryTransactionType::StockOut,
                total_used,
                material.current_stock + total_used,
                material.current_stock,
                event.technician_id.clone(),
            );

            transaction.reference_number = Some(consumption.id.clone());
            transaction.reference_type = Some("intervention_finalized".to_string());
            transaction.notes = Some("Finalized intervention consumption".to_string());
            transaction.unit_cost = material.unit_cost;
            transaction.total_cost = consumption.total_cost;
            transaction.batch_number = consumption.batch_used.clone();
            transaction.expiry_date = consumption.expiry_used;
            transaction.intervention_id = Some(consumption.intervention_id.clone());
            transaction.step_id = consumption.step_id.clone();
            transaction.performed_at = event.completed_at_ms;
            transaction.created_at = event.completed_at_ms;
            transaction.updated_at = event.completed_at_ms;

            transactions.push(transaction);
        }

        self.service
            .transaction_repository
            .upsert_intervention_consumptions("intervention_finalized", &transactions)
            .map_err(InventoryError::Database)
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
            self.process_finalized(&payload).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec!["InterventionFinalized"]
    }
}
