use crate::models::material::{InventoryStats, Material, MaterialConsumption, MaterialStats};
use crate::shared::error::AppError;

use crate::domains::inventory::application::{RecordConsumptionRequest, UpdateStockRequest};
use crate::domains::inventory::InventoryFacade;

pub fn list_materials(
    service: &InventoryFacade,
    material_type: Option<String>,
    category: Option<String>,
    active_only: bool,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Material>, AppError> {
    service.list_materials(material_type, category, active_only, limit, offset)
}

pub fn update_stock(
    service: &InventoryFacade,
    request: UpdateStockRequest,
) -> Result<Material, AppError> {
    service.update_stock(request)
}

pub fn record_consumption(
    service: &InventoryFacade,
    request: RecordConsumptionRequest,
) -> Result<MaterialConsumption, AppError> {
    service.record_consumption(request)
}

pub fn get_material_stats(service: &InventoryFacade) -> Result<MaterialStats, AppError> {
    service.get_material_stats()
}

pub fn get_inventory_stats(service: &InventoryFacade) -> Result<InventoryStats, AppError> {
    service.get_inventory_stats()
}
