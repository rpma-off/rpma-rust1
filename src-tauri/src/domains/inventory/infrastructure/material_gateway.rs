use std::sync::Arc;

use crate::models::material::{
    InventoryStats, Material, MaterialConsumption, MaterialStats, MaterialType,
};
use crate::services::material::{
    MaterialResult, MaterialService, RecordConsumptionRequest, UpdateStockRequest,
};

#[derive(Debug)]
pub struct MaterialGateway {
    service: Arc<MaterialService>,
}

impl MaterialGateway {
    pub fn new(service: Arc<MaterialService>) -> Self {
        Self { service }
    }

    pub fn list_materials(
        &self,
        material_type: Option<MaterialType>,
        category: Option<String>,
        active_only: bool,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<Material>> {
        self.service
            .list_materials(material_type, category, active_only, limit, offset)
    }

    pub fn get_material(&self, material_id: &str) -> MaterialResult<Option<Material>> {
        self.service.get_material(material_id)
    }

    pub fn update_stock(&self, request: UpdateStockRequest) -> MaterialResult<Material> {
        self.service.update_stock(request)
    }

    pub fn record_consumption(
        &self,
        request: RecordConsumptionRequest,
    ) -> MaterialResult<MaterialConsumption> {
        self.service.record_consumption(request)
    }

    pub fn get_material_stats(&self) -> MaterialResult<MaterialStats> {
        self.service.get_material_stats()
    }

    pub fn get_inventory_stats(&self) -> MaterialResult<InventoryStats> {
        self.service.get_inventory_stats()
    }

    pub fn get_intervention_consumption(
        &self,
        intervention_id: &str,
    ) -> MaterialResult<Vec<MaterialConsumption>> {
        self.service.get_intervention_consumption(intervention_id)
    }
}
