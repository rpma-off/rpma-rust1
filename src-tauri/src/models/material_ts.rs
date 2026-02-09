//! Material Model - TypeScript compatible version
//!
//! This module defines TypeScript-compatible data models for PPF materials
//! inventory management and consumption tracking for interventions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// Re-export the main types
pub use super::material::{
    Material, MaterialCategory, MaterialConsumption, MaterialConsumptionSummary, MaterialStats,
    MaterialType, Supplier, UnitOfMeasure,
};

/// TypeScript-compatible Material with i64 timestamps
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct MaterialTS {
    // Identifiers
    pub id: String,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,

    // Material type and category
    pub material_type: MaterialType,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub category_id: Option<String>,

    // Specifications
    pub brand: Option<String>,
    pub model: Option<String>,
    pub specifications: Option<String>, // JSON string instead of Value

    // Inventory
    pub unit_of_measure: UnitOfMeasure,
    pub current_stock: f64,
    pub minimum_stock: Option<f64>,
    pub maximum_stock: Option<f64>,
    pub reorder_point: Option<f64>,

    // Pricing
    pub unit_cost: Option<f64>,
    pub currency: String,

    // Supplier information
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub supplier_sku: Option<String>,

    // Quality and compliance
    pub quality_grade: Option<String>,
    pub certification: Option<String>,
    pub expiry_date: Option<i64>, // Unix timestamp
    pub batch_number: Option<String>,
    pub serial_numbers: Option<Vec<String>>,

    // Status
    pub is_active: bool,
    pub is_discontinued: bool,

    // Location
    pub storage_location: Option<String>,
    pub warehouse_id: Option<String>,

    // Audit
    pub created_at: i64,
    pub updated_at: i64,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,

    // Sync
    pub synced: bool,
    pub last_synced_at: Option<i64>,
}

impl From<&Material> for MaterialTS {
    fn from(material: &Material) -> Self {
        Self {
            id: material.id.clone(),
            sku: material.sku.clone(),
            name: material.name.clone(),
            description: material.description.clone(),
            material_type: material.material_type.clone(),
            category: material.category.clone(),
            subcategory: material.subcategory.clone(),
            category_id: material.category_id.clone(),
            brand: material.brand.clone(),
            model: material.model.clone(),
            specifications: material.specifications.as_ref().map(|v| v.to_string()),
            unit_of_measure: material.unit_of_measure.clone(),
            current_stock: material.current_stock,
            minimum_stock: material.minimum_stock,
            maximum_stock: material.maximum_stock,
            reorder_point: material.reorder_point,
            unit_cost: material.unit_cost,
            currency: material.currency.clone(),
            supplier_id: material.supplier_id.clone(),
            supplier_name: material.supplier_name.clone(),
            supplier_sku: material.supplier_sku.clone(),
            quality_grade: material.quality_grade.clone(),
            certification: material.certification.clone(),
            expiry_date: material.expiry_date.map(|dt| dt.timestamp_millis()),
            batch_number: material.batch_number.clone(),
            serial_numbers: material.serial_numbers.clone(),
            is_active: material.is_active,
            is_discontinued: material.is_discontinued,
            storage_location: material.storage_location.clone(),
            warehouse_id: material.warehouse_id.clone(),
            created_at: material.created_at.timestamp_millis(),
            updated_at: material.updated_at.timestamp_millis(),
            created_by: material.created_by.clone(),
            updated_by: material.updated_by.clone(),
            synced: material.synced,
            last_synced_at: material.last_synced_at.map(|dt| dt.timestamp_millis()),
        }
    }
}

/// TypeScript-compatible MaterialConsumption
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct MaterialConsumptionTS {
    // Identifiers
    pub id: String,
    pub intervention_id: String,
    pub material_id: String,
    pub step_id: Option<String>,

    // Consumption details
    pub quantity_used: f64,
    pub unit_cost: Option<f64>,
    pub total_cost: Option<f64>,
    pub waste_quantity: f64,
    pub waste_reason: Option<String>,

    // Quality tracking
    pub batch_used: Option<String>,
    pub expiry_used: Option<i64>, // Unix timestamp
    pub quality_notes: Option<String>,

    // Workflow integration
    pub step_number: Option<i32>,
    pub recorded_by: Option<String>,
    pub recorded_at: i64,

    // Audit
    pub created_at: i64,
    pub updated_at: i64,

    // Sync
    pub synced: bool,
    pub last_synced_at: Option<i64>,
}

impl From<&MaterialConsumption> for MaterialConsumptionTS {
    fn from(consumption: &MaterialConsumption) -> Self {
        Self {
            id: consumption.id.clone(),
            intervention_id: consumption.intervention_id.clone(),
            material_id: consumption.material_id.clone(),
            step_id: consumption.step_id.clone(),
            quantity_used: consumption.quantity_used,
            unit_cost: consumption.unit_cost,
            total_cost: consumption.total_cost,
            waste_quantity: consumption.waste_quantity,
            waste_reason: consumption.waste_reason.clone(),
            batch_used: consumption.batch_used.clone(),
            expiry_used: consumption.expiry_used.map(|dt| dt.timestamp_millis()),
            quality_notes: consumption.quality_notes.clone(),
            step_number: consumption.step_number,
            recorded_by: consumption.recorded_by.clone(),
            recorded_at: consumption.recorded_at.timestamp_millis(),
            created_at: consumption.created_at.timestamp_millis(),
            updated_at: consumption.updated_at.timestamp_millis(),
            synced: consumption.synced,
            last_synced_at: consumption.last_synced_at.map(|dt| dt.timestamp_millis()),
        }
    }
}

/// TypeScript-compatible InventoryTransaction
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct InventoryTransactionTS {
    // Identifiers
    pub id: String,
    pub material_id: String,
    pub transaction_type: String, // String enum instead of enum

    // Quantities
    pub quantity: f64,
    pub previous_stock: f64,
    pub new_stock: f64,

    // Transaction details
    pub reference_number: Option<String>,
    pub reference_type: Option<String>,
    pub notes: Option<String>,

    // Cost tracking
    pub unit_cost: Option<f64>,
    pub total_cost: Option<f64>,

    // Location tracking
    pub warehouse_id: Option<String>,
    pub location_from: Option<String>,
    pub location_to: Option<String>,

    // Quality and batch tracking
    pub batch_number: Option<String>,
    pub expiry_date: Option<i64>, // Unix timestamp
    pub quality_status: Option<String>,

    // Workflow integration
    pub intervention_id: Option<String>,
    pub step_id: Option<String>,

    // User and audit
    pub performed_by: String,
    pub performed_at: i64,

    // Audit
    pub created_at: i64,
    pub updated_at: i64,

    // Sync
    pub synced: bool,
    pub last_synced_at: Option<i64>,
}
