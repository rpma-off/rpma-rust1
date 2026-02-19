pub(crate) mod errors;
pub(crate) mod handlers;
pub(crate) mod input;
pub(crate) mod service;

pub(crate) use errors::InventoryError;
pub(crate) use handlers::InterventionFinalizedHandler;
pub(crate) use input::{parse_material_type, RecordConsumptionRequest, UpdateStockRequest};
pub(crate) use service::InventoryService;
