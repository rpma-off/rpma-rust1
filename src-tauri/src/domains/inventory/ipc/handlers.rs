use crate::domains::inventory::domain::models::material::{
    InventoryStats, Material, MaterialConsumption, MaterialStats,
};
use crate::shared::contracts::auth::UserRole;
use crate::shared::error::AppError;

use crate::domains::inventory::application::{RecordConsumptionRequest, UpdateStockRequest};
use crate::domains::inventory::InventoryFacade;

/// TODO: document
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

/// TODO: document
pub fn update_stock(
    service: &InventoryFacade,
    request: UpdateStockRequest,
    role: &UserRole,
) -> Result<Material, AppError> {
    service.update_stock(request, role)
}

/// TODO: document
pub fn record_consumption(
    service: &InventoryFacade,
    request: RecordConsumptionRequest,
    role: &UserRole,
) -> Result<MaterialConsumption, AppError> {
    service.record_consumption(request, role)
}

/// TODO: document
pub fn get_material_stats(service: &InventoryFacade) -> Result<MaterialStats, AppError> {
    service.get_material_stats()
}

/// TODO: document
pub fn get_inventory_stats(service: &InventoryFacade) -> Result<InventoryStats, AppError> {
    service.get_inventory_stats()
}
