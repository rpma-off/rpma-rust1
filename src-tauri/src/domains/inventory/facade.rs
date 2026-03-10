use std::sync::Arc;

use crate::domains::inventory::domain::models::material::{
    InventoryDashboardData, InventoryStats, Material, MaterialConsumption, MaterialStats,
};
use crate::shared::db::Database;
use crate::shared::error::AppError;
use crate::shared::event_bus::DomainEventHandler;

use super::application::{
    parse_material_type, InterventionFinalizedHandler, InventoryError, InventoryService,
    RecordConsumptionRequest, UpdateStockRequest,
};
use super::infrastructure::MaterialService;

/// TODO: document
#[derive(Debug)]
pub struct InventoryFacade {
    service: Arc<InventoryService>,
}

impl InventoryFacade {
    /// TODO: document
    pub fn new(db: Arc<Database>, material_service: Arc<MaterialService>) -> Self {
        Self {
            service: Arc::new(InventoryService::new(db, material_service)),
        }
    }

    /// TODO: document
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

    /// TODO: document
    pub fn update_stock(&self, request: UpdateStockRequest) -> Result<Material, AppError> {
        self.service
            .update_stock(request)
            .map_err(|err| map_inventory_error("update_stock", err))
    }

    /// TODO: document
    pub fn record_consumption(
        &self,
        request: RecordConsumptionRequest,
    ) -> Result<MaterialConsumption, AppError> {
        self.service
            .record_consumption(request)
            .map_err(|err| map_inventory_error("record_consumption", err))
    }

    /// TODO: document
    pub fn get_material_stats(&self) -> Result<MaterialStats, AppError> {
        self.service
            .get_material_stats()
            .map_err(|err| map_inventory_error("get_material_stats", err))
    }

    /// TODO: document
    pub fn get_inventory_stats(&self) -> Result<InventoryStats, AppError> {
        self.service
            .get_inventory_stats()
            .map_err(|err| map_inventory_error("get_inventory_stats", err))
    }

    /// S-1: aggregated dashboard — 4 IPC calls → 1.
    pub fn get_dashboard_data(&self) -> Result<InventoryDashboardData, AppError> {
        self.service
            .get_dashboard_data()
            .map_err(|err| map_inventory_error("get_dashboard_data", err))
    }

    /// TODO: document
    pub fn intervention_finalized_handler(&self) -> Arc<dyn DomainEventHandler> {
        Arc::new(InterventionFinalizedHandler::new(self.service.clone()))
    }

    /// TODO: document
    pub fn is_ready(&self) -> bool {
        true
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
