//! Application request DTOs for inventory operations.
//!
//! These types are defined in the domain layer so they can be used by
//! both the application layer and infrastructure layer without violating
//! ADR-001 layering rules.

use ts_rs::TS;

/// Request to update material stock.
#[derive(Debug, serde::Deserialize, Clone, TS)]
#[ts(export)]
#[serde(deny_unknown_fields)]
pub struct UpdateStockRequest {
    pub material_id: String,
    pub quantity_change: f64,
    pub reason: String,
    pub recorded_by: Option<String>,
}

/// Request to record material consumption.
#[derive(Debug, serde::Deserialize, Clone, TS)]
#[ts(export)]
#[serde(deny_unknown_fields)]
pub struct RecordConsumptionRequest {
    pub intervention_id: String,
    pub material_id: String,
    pub step_id: Option<String>,
    pub step_number: Option<i32>,
    pub quantity_used: f64,
    pub waste_quantity: Option<f64>,
    pub waste_reason: Option<String>,
    pub batch_used: Option<String>,
    pub quality_notes: Option<String>,
    pub recorded_by: Option<String>,
}
