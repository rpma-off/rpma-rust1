use std::collections::HashSet;
use std::sync::{Arc, Mutex};

use crate::models::material::{InventoryStats, Material, MaterialConsumption, MaterialType};
use crate::services::material::{MaterialService, RecordConsumptionRequest, UpdateStockRequest};
use crate::shared::event_bus::{DomainEvent, DomainEventHandler, InterventionFinalized};

use crate::domains::inventory::domain::material::ensure_non_negative_stock;

#[derive(Debug)]
pub struct InventoryService {
    material_service: Arc<MaterialService>,
    processed_interventions: Mutex<HashSet<String>>,
}

impl InventoryService {
    pub fn new(material_service: Arc<MaterialService>) -> Self {
        Self {
            material_service,
            processed_interventions: Mutex::new(HashSet::new()),
        }
    }

    pub fn list_materials(
        &self,
        material_type: Option<MaterialType>,
        category: Option<String>,
        active_only: bool,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<Material>, crate::services::material::MaterialError> {
        self.material_service
            .list_materials(material_type, category, active_only, limit, offset)
    }

    pub fn get_stats(&self) -> Result<InventoryStats, crate::services::material::MaterialError> {
        self.material_service.get_inventory_stats()
    }

    pub fn update_stock(
        &self,
        request: UpdateStockRequest,
    ) -> Result<Material, crate::services::material::MaterialError> {
        let current = self.material_service.get_material_by_id(&request.material_id)?;
        ensure_non_negative_stock(current.current_stock, request.quantity_change)
            .map_err(|e| crate::services::material::MaterialError::Validation(e.to_string()))?;

        self.material_service.update_stock(request)
    }

    pub fn record_consumption(
        &self,
        request: RecordConsumptionRequest,
    ) -> Result<MaterialConsumption, crate::services::material::MaterialError> {
        self.material_service.record_consumption(request)
    }

    pub fn on_intervention_finalized(
        &self,
        event: &InterventionFinalized,
    ) -> Result<(), crate::services::material::MaterialError> {
        let mut processed = self.processed_interventions.lock().unwrap_or_else(|_| {
            panic!(
                "Failed to acquire lock on processed interventions set for intervention {}",
                event.intervention_id
            )
        });
        if !processed.insert(event.intervention_id.clone()) {
            return Ok(());
        }

        // Read is used to surface DB errors for this intervention event path.
        let _consumption_records = self
            .material_service
            .get_intervention_consumption(&event.intervention_id)?;

        Ok(())
    }
}

pub struct InventoryInterventionEventHandler {
    inventory_service: Arc<InventoryService>,
}

impl InventoryInterventionEventHandler {
    pub fn new(inventory_service: Arc<InventoryService>) -> Self {
        Self { inventory_service }
    }
}

impl DomainEventHandler for InventoryInterventionEventHandler {
    fn interested_events(&self) -> Vec<&'static str> {
        vec!["InterventionFinalized"]
    }

    fn handle(&self, event: &DomainEvent) {
        if let DomainEvent::InterventionFinalized(payload) = event {
            if let Err(err) = self.inventory_service.on_intervention_finalized(payload) {
                tracing::error!(error = %err, intervention_id = %payload.intervention_id, "Inventory intervention finalization handler failed");
            }
        }
    }
}
