use std::sync::Arc;

use tracing::instrument;
use uuid::Uuid;

use crate::domains::inventory::domain::models::material::{
    InventoryDashboardData, InventoryStats, InventoryTransaction, InventoryTransactionType,
    Material, MaterialConsumption, MaterialStats, MaterialType,
};
use crate::domains::inventory::infrastructure::MaterialService;
use crate::shared::db::Database;
use crate::shared::event_bus::InterventionFinalized;

use crate::domains::inventory::domain::material::{
    validate_stock_change, validate_unit_of_measure,
};

use super::errors::{InventoryError, InventoryResult};
use super::input::{RecordConsumptionRequest, UpdateStockRequest};
use crate::domains::inventory::infrastructure::{InventoryTransactionRepository, MaterialGateway};

/// TODO: document
#[derive(Debug)]
pub struct InventoryService {
    db: Arc<Database>,
    gateway: MaterialGateway,
    transaction_repository: InventoryTransactionRepository,
}

impl InventoryService {
    /// TODO: document
    pub fn new(db: Arc<Database>, material_service: Arc<MaterialService>) -> Self {
        Self {
            db: db.clone(),
            gateway: MaterialGateway::new(material_service),
            transaction_repository: InventoryTransactionRepository::new(db),
        }
    }

    /// TODO: document
    #[instrument(skip(self))]
    pub fn list_materials(
        &self,
        material_type: Option<MaterialType>,
        category: Option<String>,
        active_only: bool,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> InventoryResult<Vec<Material>> {
        self.gateway
            .list_materials(material_type, category, active_only, limit, offset)
            .map_err(InventoryError::from)
    }

    /// TODO: document
    #[instrument(skip(self))]
    pub fn get_material_stats(&self) -> InventoryResult<MaterialStats> {
        self.gateway
            .get_material_stats()
            .map_err(InventoryError::from)
    }

    /// S-1 perf: single call that aggregates materials + stats + low_stock + expired.
    /// Replaces 4 IPC round-trips with 1. Uses InventoryStats (matches frontend hook type).
    #[instrument(skip(self))]
    pub fn get_dashboard_data(&self) -> InventoryResult<InventoryDashboardData> {
        let materials = self.list_materials(None, None, true, None, None)?;
        let stats = self.get_inventory_stats()?;
        let low_stock = self
            .gateway
            .get_low_stock_materials()
            .map_err(InventoryError::from)?;
        let expired = self
            .gateway
            .get_expired_materials()
            .map_err(InventoryError::from)?;
        Ok(InventoryDashboardData {
            materials,
            stats,
            low_stock,
            expired,
        })
    }

    /// TODO: document
    #[instrument(skip(self))]
    pub fn get_inventory_stats(&self) -> InventoryResult<InventoryStats> {
        self.gateway
            .get_inventory_stats()
            .map_err(InventoryError::from)
    }

    /// TODO: document
    #[instrument(skip(self))]
    pub fn update_stock(&self, request: UpdateStockRequest) -> InventoryResult<Material> {
        let material = self
            .gateway
            .get_material(&request.material_id)
            .map_err(InventoryError::from)?
            .ok_or_else(|| {
                InventoryError::NotFound(format!("Material {} not found", request.material_id))
            })?;

        validate_unit_of_measure(&material.unit_of_measure)?;
        validate_stock_change(material.current_stock, request.quantity_change)?;

        self.gateway
            .update_stock(request)
            .map_err(InventoryError::from)
    }

    /// TODO: document
    #[instrument(skip(self))]
    pub fn record_consumption(
        &self,
        request: RecordConsumptionRequest,
    ) -> InventoryResult<MaterialConsumption> {
        let material = self
            .gateway
            .get_material(&request.material_id)
            .map_err(InventoryError::from)?
            .ok_or_else(|| {
                InventoryError::NotFound(format!("Material {} not found", request.material_id))
            })?;

        validate_unit_of_measure(&material.unit_of_measure)?;

        self.gateway
            .record_consumption(request)
            .map_err(InventoryError::from)
    }

    /// TODO: document
    #[instrument(skip(self, event), fields(intervention_id = %event.intervention_id))]
    pub fn handle_intervention_finalized(
        &self,
        event: &InterventionFinalized,
    ) -> InventoryResult<usize> {
        let consumptions = self
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
                Uuid::new_v4().to_string(),
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

        self.db
            .with_transaction(|tx| {
                // QW-4 perf: batch existence check — 1 WHERE IN query instead of N individual queries.
                let refs_to_check: Vec<String> = transactions
                    .iter()
                    .filter_map(|t| t.reference_number.clone())
                    .collect();
                let existing_refs = self.transaction_repository.references_exist_batch(
                    tx,
                    "intervention_finalized",
                    &refs_to_check,
                )?;

                let mut inserted = 0usize;
                for transaction in &transactions {
                    if let Some(ref_num) = &transaction.reference_number {
                        if existing_refs.contains(ref_num) {
                            continue;
                        }
                    }
                    self.transaction_repository.insert(tx, transaction)?;
                    inserted += 1;
                }
                Ok(inserted)
            })
            .map_err(InventoryError::Database)
    }
}
