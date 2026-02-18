use crate::shared::error::AppError;
use crate::models::material::{
    InventoryStats, Material, MaterialConsumption, MaterialStats, MaterialType,
};
use crate::services::material::{RecordConsumptionRequest, UpdateStockRequest};

use crate::domains::inventory::application::{InventoryError, InventoryService};

fn map_inventory_error(context: &str, error: InventoryError) -> AppError {
    match error {
        InventoryError::Validation(msg) => AppError::Validation(msg),
        InventoryError::Authorization(msg) => AppError::Authorization(msg),
        InventoryError::NotFound(msg) => AppError::NotFound(msg),
        InventoryError::Database(msg) => AppError::Database(msg),
        InventoryError::Domain(err) => AppError::Validation(err.to_string()),
    }
    .with_context(context)
}

trait AppErrorContext {
    fn with_context(self, context: &str) -> AppError;
}

impl AppErrorContext for AppError {
    fn with_context(self, context: &str) -> AppError {
        match self {
            AppError::Internal(msg) => AppError::Internal(format!("{}: {}", context, msg)),
            other => other,
        }
    }
}

pub fn list_materials(
    service: &InventoryService,
    material_type: Option<MaterialType>,
    category: Option<String>,
    active_only: bool,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Material>, AppError> {
    service
        .list_materials(material_type, category, active_only, limit, offset)
        .map_err(|err| map_inventory_error("list_materials", err))
}

pub fn update_stock(
    service: &InventoryService,
    request: UpdateStockRequest,
) -> Result<Material, AppError> {
    service
        .update_stock(request)
        .map_err(|err| map_inventory_error("update_stock", err))
}

pub fn record_consumption(
    service: &InventoryService,
    request: RecordConsumptionRequest,
) -> Result<MaterialConsumption, AppError> {
    service
        .record_consumption(request)
        .map_err(|err| map_inventory_error("record_consumption", err))
}

pub fn get_material_stats(service: &InventoryService) -> Result<MaterialStats, AppError> {
    service
        .get_material_stats()
        .map_err(|err| map_inventory_error("get_material_stats", err))
}

pub fn get_inventory_stats(service: &InventoryService) -> Result<InventoryStats, AppError> {
    service
        .get_inventory_stats()
        .map_err(|err| map_inventory_error("get_inventory_stats", err))
}
