//! Request DTOs for material operations.

use crate::domains::inventory::domain::models::material::{
    InventoryTransactionType, MaterialType, UnitOfMeasure,
};

/// Request to create a new material.
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateMaterialRequest {
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub material_type: MaterialType,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub category_id: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub specifications: Option<serde_json::Value>,
    pub unit_of_measure: UnitOfMeasure,
    pub current_stock: Option<f64>,
    pub minimum_stock: Option<f64>,
    pub maximum_stock: Option<f64>,
    pub reorder_point: Option<f64>,
    pub unit_cost: Option<f64>,
    pub currency: Option<String>,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub supplier_sku: Option<String>,
    pub quality_grade: Option<String>,
    pub certification: Option<String>,
    pub expiry_date: Option<i64>,
    pub batch_number: Option<String>,
    pub storage_location: Option<String>,
    pub warehouse_id: Option<String>,
}

/// Request to update material stock.
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateStockRequest {
    pub material_id: String,
    pub quantity_change: f64,
    pub reason: String,
    pub recorded_by: Option<String>,
}

/// Request to record material consumption.
#[derive(Debug, serde::Deserialize)]
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

/// Request to create a material category.
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateMaterialCategoryRequest {
    pub name: String,
    pub code: Option<String>,
    pub parent_id: Option<String>,
    pub level: Option<i32>,
    pub description: Option<String>,
    pub color: Option<String>,
}

/// Request to create a supplier.
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateSupplierRequest {
    pub name: String,
    pub code: Option<String>,
    pub contact_person: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub website: Option<String>,
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,
    pub tax_id: Option<String>,
    pub business_license: Option<String>,
    pub payment_terms: Option<String>,
    pub lead_time_days: Option<i32>,
    pub is_preferred: Option<bool>,
    pub quality_rating: Option<f64>,
    pub delivery_rating: Option<f64>,
    pub on_time_delivery_rate: Option<f64>,
    pub notes: Option<String>,
    pub special_instructions: Option<String>,
}

/// Request to create an inventory transaction.
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateInventoryTransactionRequest {
    pub material_id: String,
    pub transaction_type: InventoryTransactionType,
    pub quantity: f64,
    pub reference_number: Option<String>,
    pub reference_type: Option<String>,
    pub notes: Option<String>,
    pub unit_cost: Option<f64>,
    pub warehouse_id: Option<String>,
    pub location_from: Option<String>,
    pub location_to: Option<String>,
    pub batch_number: Option<String>,
    pub expiry_date: Option<i64>,
    pub quality_status: Option<String>,
    pub intervention_id: Option<String>,
    pub step_id: Option<String>,
}
