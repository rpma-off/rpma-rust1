use std::sync::Arc;

use tracing::instrument;

use crate::domains::inventory::domain::models::material::{
    IInventoryTransactionRepository, InventoryDashboardData, InventoryStats, Material,
    MaterialConsumption, MaterialStats, MaterialType,
};
use crate::domains::inventory::infrastructure::MaterialService;

use crate::domains::inventory::domain::material::{
    validate_stock_change, validate_unit_of_measure,
};

use super::errors::{InventoryError, InventoryResult};
use super::input::{RecordConsumptionRequest, UpdateStockRequest};
use crate::domains::inventory::infrastructure::{InventoryTransactionRepository, MaterialGateway};

/// TODO: document
#[derive(Debug)]
pub struct InventoryService {
    // pub(in ...) allows InterventionFinalizedHandler (same application module) to access these
    // fields directly for event-processing logic, without going through InventoryService methods.
    pub(in crate::domains::inventory::application) gateway: MaterialGateway,
    pub(in crate::domains::inventory::application) transaction_repository:
        Arc<dyn IInventoryTransactionRepository>,
}

impl InventoryService {
    /// TODO: document
    pub fn new(
        material_service: Arc<MaterialService>,
        transaction_repository: Arc<dyn IInventoryTransactionRepository>,
    ) -> Self {
        Self {
            gateway: MaterialGateway::new(material_service),
            transaction_repository,
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

}
// TODO(ADR-001): handle_intervention_finalized has been moved to InterventionFinalizedHandler
// in handlers.rs. InventoryService is now a pure CRUD/query service with no event-handling logic.
