use std::sync::Arc;

use crate::models::material::{InventoryStats, Material, MaterialConsumption, MaterialStats};
use crate::shared::db::Database;
use crate::shared::error::AppError;
use crate::shared::event_bus::DomainEventHandler;

use super::application::{
    parse_material_type, InterventionFinalizedHandler, InventoryError, InventoryService,
    RecordConsumptionRequest, UpdateStockRequest,
};
use super::infrastructure::MaterialService;

#[derive(Debug)]
pub struct InventoryFacade {
    service: Arc<InventoryService>,
}

impl InventoryFacade {
    pub fn new(db: Arc<Database>, material_service: Arc<MaterialService>) -> Self {
        Self {
            service: Arc::new(InventoryService::new(db, material_service)),
        }
    }

    pub fn list_materials(
        &self,
        material_type: Option<String>,
        category: Option<String>,
        active_only: bool,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<Material>, AppError> {
        let parsed_type = parse_material_type(material_type.as_deref());
        self.service
            .list_materials(parsed_type, category, active_only, limit, offset)
            .map_err(|err| map_inventory_error("list_materials", err))
    }

    pub fn update_stock(&self, request: UpdateStockRequest) -> Result<Material, AppError> {
        self.service
            .update_stock(request)
            .map_err(|err| map_inventory_error("update_stock", err))
    }

    pub fn record_consumption(
        &self,
        request: RecordConsumptionRequest,
    ) -> Result<MaterialConsumption, AppError> {
        self.service
            .record_consumption(request)
            .map_err(|err| map_inventory_error("record_consumption", err))
    }

    pub fn get_material_stats(&self) -> Result<MaterialStats, AppError> {
        self.service
            .get_material_stats()
            .map_err(|err| map_inventory_error("get_material_stats", err))
    }

    pub fn get_inventory_stats(&self) -> Result<InventoryStats, AppError> {
        self.service
            .get_inventory_stats()
            .map_err(|err| map_inventory_error("get_inventory_stats", err))
    }

    pub fn intervention_finalized_handler(&self) -> Arc<dyn DomainEventHandler> {
        Arc::new(InterventionFinalizedHandler::new(self.service.clone()))
    }
}

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
