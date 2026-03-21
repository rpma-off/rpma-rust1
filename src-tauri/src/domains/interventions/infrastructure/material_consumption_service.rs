//! Material Consumption Service (Group C — Material Recording)
//!
//! Extracted from `InterventionService` to provide a focused interface
//! for material consumption operations, coordinating with `InventoryFacade`.
//!
//! Currently a placeholder — no material consumption methods existed on
//! `InterventionService`. Future methods such as `record_consumption` and
//! `validate_material_availability` will live here.

use crate::db::Database;
use std::sync::Arc;

/// Service responsible for material consumption tracking during interventions.
///
/// Coordinates with `InventoryFacade` for stock validation and consumption recording.
#[derive(Debug)]
pub struct MaterialConsumptionService {
    #[allow(dead_code)]
    db: Arc<Database>,
}

impl MaterialConsumptionService {
    /// Create a new material consumption service from a database handle.
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }
}
