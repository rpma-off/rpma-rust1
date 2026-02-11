//! Material Model - PPF Material Inventory and Consumption Tracking
//!
//! This module defines the data models for PPF materials inventory management
//! and consumption tracking for interventions.

use crate::db::FromSqlRow;
use crate::models::common::{serialize_optional_timestamp, serialize_timestamp};
use chrono::{DateTime, Utc};
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Material types for PPF workflows
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ts_rs::TS)]
#[ts(export)]
pub enum MaterialType {
    #[serde(rename = "ppf_film")]
    PpfFilm,
    #[serde(rename = "adhesive")]
    Adhesive,
    #[serde(rename = "cleaning_solution")]
    CleaningSolution,
    #[serde(rename = "tool")]
    Tool,
    #[serde(rename = "consumable")]
    Consumable,
}

impl std::fmt::Display for MaterialType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MaterialType::PpfFilm => write!(f, "ppf_film"),
            MaterialType::Adhesive => write!(f, "adhesive"),
            MaterialType::CleaningSolution => write!(f, "cleaning_solution"),
            MaterialType::Tool => write!(f, "tool"),
            MaterialType::Consumable => write!(f, "consumable"),
        }
    }
}

/// Unit of measure for materials
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ts_rs::TS)]
#[ts(export)]
pub enum UnitOfMeasure {
    #[serde(rename = "piece")]
    Piece,
    #[serde(rename = "meter")]
    Meter,
    #[serde(rename = "liter")]
    Liter,
    #[serde(rename = "gram")]
    Gram,
    #[serde(rename = "roll")]
    Roll,
}

impl std::fmt::Display for UnitOfMeasure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UnitOfMeasure::Piece => write!(f, "piece"),
            UnitOfMeasure::Meter => write!(f, "meter"),
            UnitOfMeasure::Liter => write!(f, "liter"),
            UnitOfMeasure::Gram => write!(f, "gram"),
            UnitOfMeasure::Roll => write!(f, "roll"),
        }
    }
}

/// Material inventory item
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct Material {
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
    #[ts(type = "JsonValue")]
    pub specifications: Option<serde_json::Value>,

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
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub expiry_date: Option<i64>,
    pub batch_number: Option<String>,
    pub serial_numbers: Option<Vec<String>>,

    // Status
    pub is_active: bool,
    pub is_discontinued: bool,

    // Location
    pub storage_location: Option<String>,
    pub warehouse_id: Option<String>,

    // Audit
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,

    // Sync
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,
}

impl Material {
    /// Create a new material
    pub fn new(id: String, sku: String, name: String, material_type: MaterialType) -> Self {
        let now = crate::models::common::now();
        Self {
            id,
            sku,
            name,
            description: None,
            material_type,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Piece,
            current_stock: 0.0,
            minimum_stock: None,
            maximum_stock: None,
            reorder_point: None,
            unit_cost: None,
            currency: "EUR".to_string(),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            serial_numbers: None,
            is_active: true,
            is_discontinued: false,
            storage_location: None,
            warehouse_id: None,
            created_at: now,
            updated_at: now,
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        }
    }

    /// Check if material needs reordering
    pub fn needs_reorder(&self) -> bool {
        if let Some(reorder_point) = self.reorder_point {
            self.current_stock <= reorder_point
        } else if let Some(min_stock) = self.minimum_stock {
            self.current_stock <= min_stock
        } else {
            false
        }
    }

    /// Check if material is expired
    pub fn is_expired(&self) -> bool {
        if let Some(expiry) = self.expiry_date {
            let now = crate::models::common::now();
            expiry <= now
        } else {
            false
        }
    }

    /// Check if material is low stock
    pub fn is_low_stock(&self) -> bool {
        if let Some(min_stock) = self.minimum_stock {
            self.current_stock <= min_stock
        } else {
            false
        }
    }
}

impl FromSqlRow for Material {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let material_type_str: String = row.get("material_type")?;
        let material_type = match material_type_str.as_str() {
            "ppf_film" => MaterialType::PpfFilm,
            "adhesive" => MaterialType::Adhesive,
            "cleaning_solution" => MaterialType::CleaningSolution,
            "tool" => MaterialType::Tool,
            "consumable" => MaterialType::Consumable,
            _ => {
                return Err(rusqlite::Error::InvalidColumnType(
                    0,
                    "material_type".to_string(),
                    rusqlite::types::Type::Text,
                ))
            }
        };

        let unit_str: String = row.get("unit_of_measure")?;
        let unit_of_measure = match unit_str.as_str() {
            "piece" => UnitOfMeasure::Piece,
            "meter" => UnitOfMeasure::Meter,
            "liter" => UnitOfMeasure::Liter,
            "gram" => UnitOfMeasure::Gram,
            "roll" => UnitOfMeasure::Roll,
            _ => UnitOfMeasure::Piece, // Default fallback
        };

        Ok(Self {
            id: row.get("id")?,
            sku: row.get("sku")?,
            name: row.get("name")?,
            description: row.get("description")?,
            material_type,
            category: row.get("category")?,
            subcategory: row.get("subcategory")?,
            category_id: match row.get::<_, Option<String>>("category_id") {
                Ok(value) => value,
                Err(rusqlite::Error::InvalidColumnName(_)) => None,
                Err(err) => return Err(err),
            },
            brand: row.get("brand")?,
            model: row.get("model")?,
            specifications: row
                .get::<_, Option<String>>("specifications")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            unit_of_measure,
            current_stock: row.get("current_stock")?,
            minimum_stock: row.get("minimum_stock")?,
            maximum_stock: row.get("maximum_stock")?,
            reorder_point: row.get("reorder_point")?,
            unit_cost: row.get("unit_cost")?,
            currency: row.get("currency")?,
            supplier_id: row.get("supplier_id")?,
            supplier_name: row.get("supplier_name")?,
            supplier_sku: row.get("supplier_sku")?,
            quality_grade: row.get("quality_grade")?,
            certification: row.get("certification")?,
            expiry_date: row.get("expiry_date")?,
            batch_number: row.get("batch_number")?,
            serial_numbers: row
                .get::<_, Option<String>>("serial_numbers")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            is_active: row.get::<_, i32>("is_active")? != 0,
            is_discontinued: row.get::<_, i32>("is_discontinued")? != 0,
            storage_location: row.get("storage_location")?,
            warehouse_id: row.get("warehouse_id")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            created_by: row.get("created_by")?,
            updated_by: row.get("updated_by")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
        })
    }
}

/// Material consumption record for interventions
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct MaterialConsumption {
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
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub expiry_used: Option<i64>,
    pub quality_notes: Option<String>,

    // Workflow integration
    pub step_number: Option<i32>,
    pub recorded_by: Option<String>,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub recorded_at: i64,

    // Audit
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,

    // Sync
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,
}

impl MaterialConsumption {
    /// Create a new material consumption record
    pub fn new(
        id: String,
        intervention_id: String,
        material_id: String,
        quantity_used: f64,
    ) -> Self {
        let now = crate::models::common::now();
        Self {
            id,
            intervention_id,
            material_id,
            step_id: None,
            quantity_used,
            unit_cost: None,
            total_cost: None,
            waste_quantity: 0.0,
            waste_reason: None,
            batch_used: None,
            expiry_used: None,
            quality_notes: None,
            step_number: None,
            recorded_by: None,
            recorded_at: now,
            created_at: now,
            updated_at: now,
            synced: false,
            last_synced_at: None,
        }
    }

    /// Calculate total cost if unit cost is available
    pub fn calculate_total_cost(&mut self) {
        if let Some(unit_cost) = self.unit_cost {
            self.total_cost = Some(unit_cost * self.quantity_used);
        }
    }
}

impl FromSqlRow for MaterialConsumption {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            intervention_id: row.get("intervention_id")?,
            material_id: row.get("material_id")?,
            step_id: row.get("step_id")?,
            quantity_used: row.get("quantity_used")?,
            unit_cost: row.get("unit_cost")?,
            total_cost: row.get("total_cost")?,
            waste_quantity: row.get("waste_quantity")?,
            waste_reason: row.get("waste_reason")?,
            batch_used: row.get("batch_used")?,
            expiry_used: row.get("expiry_used")?,
            quality_notes: row.get("quality_notes")?,
            step_number: row.get("step_number")?,
            recorded_by: row.get("recorded_by")?,
            recorded_at: row.get("recorded_at")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
        })
    }
}

/// Material inventory statistics
#[derive(Debug, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct MaterialStats {
    pub total_materials: i32,
    pub active_materials: i32,
    pub low_stock_materials: i32,
    pub expired_materials: i32,
    pub total_value: f64,
    pub materials_by_type: std::collections::HashMap<String, i32>,
}

/// Material consumption summary for an intervention
#[derive(Debug, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct InterventionMaterialSummary {
    pub intervention_id: String,
    pub total_materials_used: i32,
    pub total_cost: f64,
    pub materials: Vec<MaterialConsumptionSummary>,
}

/// Summary of material consumption
#[derive(Debug, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct MaterialConsumptionSummary {
    pub material_id: String,
    pub material_name: String,
    pub material_type: String,
    pub quantity_used: f64,
    pub unit_cost: Option<f64>,
    pub total_cost: Option<f64>,
    pub waste_quantity: f64,
}

/// Supplier information
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct Supplier {
    // Identifiers
    pub id: String,
    pub name: String,
    pub code: Option<String>,

    // Contact information
    pub contact_person: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub website: Option<String>,

    // Address
    pub address_street: Option<String>,
    pub address_city: Option<String>,
    pub address_state: Option<String>,
    pub address_zip: Option<String>,
    pub address_country: Option<String>,

    // Business information
    pub tax_id: Option<String>,
    pub business_license: Option<String>,
    pub payment_terms: Option<String>,
    pub lead_time_days: i32,

    // Status
    pub is_active: bool,
    pub is_preferred: bool,

    // Quality metrics
    pub quality_rating: Option<f64>,
    pub delivery_rating: Option<f64>,
    pub on_time_delivery_rate: Option<f64>,

    // Notes
    pub notes: Option<String>,
    pub special_instructions: Option<String>,

    // Audit
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,

    // Sync
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,
}

impl Supplier {
    /// Create a new supplier
    pub fn new(id: String, name: String) -> Self {
        let now = crate::models::common::now();
        Self {
            id,
            name,
            code: None,
            contact_person: None,
            email: None,
            phone: None,
            website: None,
            address_street: None,
            address_city: None,
            address_state: None,
            address_zip: None,
            address_country: None,
            tax_id: None,
            business_license: None,
            payment_terms: None,
            lead_time_days: 0,
            is_active: true,
            is_preferred: false,
            quality_rating: None,
            delivery_rating: None,
            on_time_delivery_rate: None,
            notes: None,
            special_instructions: None,
            created_at: now,
            updated_at: now,
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        }
    }
}

impl FromSqlRow for Supplier {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            code: row.get("code")?,
            contact_person: row.get("contact_person")?,
            email: row.get("email")?,
            phone: row.get("phone")?,
            website: row.get("website")?,
            address_street: row.get("address_street")?,
            address_city: row.get("address_city")?,
            address_state: row.get("address_state")?,
            address_zip: row.get("address_zip")?,
            address_country: row.get("address_country")?,
            tax_id: row.get("tax_id")?,
            business_license: row.get("business_license")?,
            payment_terms: row.get("payment_terms")?,
            lead_time_days: row.get("lead_time_days")?,
            is_active: row.get::<_, i32>("is_active")? != 0,
            is_preferred: row.get::<_, i32>("is_preferred")? != 0,
            quality_rating: row.get("quality_rating")?,
            delivery_rating: row.get("delivery_rating")?,
            on_time_delivery_rate: row.get("on_time_delivery_rate")?,
            notes: row.get("notes")?,
            special_instructions: row.get("special_instructions")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            created_by: row.get("created_by")?,
            updated_by: row.get("updated_by")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
        })
    }
}

/// Transaction types for inventory movements
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ts_rs::TS)]
#[ts(export)]
pub enum InventoryTransactionType {
    #[serde(rename = "stock_in")]
    StockIn,
    #[serde(rename = "stock_out")]
    StockOut,
    #[serde(rename = "adjustment")]
    Adjustment,
    #[serde(rename = "transfer")]
    Transfer,
    #[serde(rename = "waste")]
    Waste,
    #[serde(rename = "return")]
    Return,
}

impl std::fmt::Display for InventoryTransactionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            InventoryTransactionType::StockIn => write!(f, "stock_in"),
            InventoryTransactionType::StockOut => write!(f, "stock_out"),
            InventoryTransactionType::Adjustment => write!(f, "adjustment"),
            InventoryTransactionType::Transfer => write!(f, "transfer"),
            InventoryTransactionType::Waste => write!(f, "waste"),
            InventoryTransactionType::Return => write!(f, "return"),
        }
    }
}

/// Material category for hierarchical organization
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct MaterialCategory {
    // Identifiers
    pub id: String,
    pub name: String,
    pub code: Option<String>,

    // Hierarchy
    pub parent_id: Option<String>,
    pub level: i32,

    // Description and metadata
    pub description: Option<String>,
    pub color: Option<String>,

    // Status
    pub is_active: bool,

    // Audit
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,

    // Sync
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,
}

impl MaterialCategory {
    /// Create a new material category
    pub fn new(id: String, name: String, level: i32) -> Self {
        let now = crate::models::common::now();
        Self {
            id,
            name,
            code: None,
            parent_id: None,
            level,
            description: None,
            color: None,
            is_active: true,
            created_at: now,
            updated_at: now,
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        }
    }
}

impl FromSqlRow for MaterialCategory {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            code: row.get("code")?,
            parent_id: row.get("parent_id")?,
            level: row.get("level")?,
            description: row.get("description")?,
            color: row.get("color")?,
            is_active: row.get::<_, i32>("is_active")? != 0,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            created_by: row.get("created_by")?,
            updated_by: row.get("updated_by")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
        })
    }
}

/// Inventory transaction record
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct InventoryTransaction {
    // Identifiers
    pub id: String,
    pub material_id: String,
    pub transaction_type: InventoryTransactionType,

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
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub expiry_date: Option<i64>,
    pub quality_status: Option<String>,

    // Workflow integration
    pub intervention_id: Option<String>,
    pub step_id: Option<String>,

    // User and audit
    pub performed_by: String,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub performed_at: i64,

    // Audit
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,

    // Sync
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,
}

impl InventoryTransaction {
    /// Create a new inventory transaction
    pub fn new(
        id: String,
        material_id: String,
        transaction_type: InventoryTransactionType,
        quantity: f64,
        previous_stock: f64,
        new_stock: f64,
        performed_by: String,
    ) -> Self {
        let now = crate::models::common::now();
        Self {
            id,
            material_id,
            transaction_type,
            quantity,
            previous_stock,
            new_stock,
            reference_number: None,
            reference_type: None,
            notes: None,
            unit_cost: None,
            total_cost: None,
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
            performed_by,
            performed_at: now,
            created_at: now,
            updated_at: now,
            synced: false,
            last_synced_at: None,
        }
    }
}

impl FromSqlRow for InventoryTransaction {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let transaction_type_str: String = row.get("transaction_type")?;
        let transaction_type = match transaction_type_str.as_str() {
            "stock_in" => InventoryTransactionType::StockIn,
            "stock_out" => InventoryTransactionType::StockOut,
            "adjustment" => InventoryTransactionType::Adjustment,
            "transfer" => InventoryTransactionType::Transfer,
            "waste" => InventoryTransactionType::Waste,
            "return" => InventoryTransactionType::Return,
            _ => {
                return Err(rusqlite::Error::InvalidColumnType(
                    0,
                    "transaction_type".to_string(),
                    rusqlite::types::Type::Text,
                ))
            }
        };

        Ok(Self {
            id: row.get("id")?,
            material_id: row.get("material_id")?,
            transaction_type,
            quantity: row.get("quantity")?,
            previous_stock: row.get("previous_stock")?,
            new_stock: row.get("new_stock")?,
            reference_number: row.get("reference_number")?,
            reference_type: row.get("reference_type")?,
            notes: row.get("notes")?,
            unit_cost: row.get("unit_cost")?,
            total_cost: row.get("total_cost")?,
            warehouse_id: row.get("warehouse_id")?,
            location_from: row.get("location_from")?,
            location_to: row.get("location_to")?,
            batch_number: row.get("batch_number")?,
            expiry_date: row.get("expiry_date")?,
            quality_status: row.get("quality_status")?,
            intervention_id: row.get("intervention_id")?,
            step_id: row.get("step_id")?,
            performed_by: row.get("performed_by")?,
            performed_at: row.get("performed_at")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
        })
    }
}

/// Enhanced inventory statistics
#[derive(Debug, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct InventoryStats {
    pub total_materials: i32,
    pub active_materials: i32,
    pub low_stock_materials: i32,
    pub expired_materials: i32,
    pub total_value: f64,
    pub materials_by_category: std::collections::HashMap<String, i32>,
    pub recent_transactions: Vec<InventoryTransaction>,
    pub stock_turnover_rate: f64,
    pub average_inventory_age: f64,
}

/// Inventory movement summary
#[derive(Debug, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct InventoryMovementSummary {
    pub material_id: String,
    pub material_name: String,
    pub total_stock_in: f64,
    pub total_stock_out: f64,
    pub net_movement: f64,
    pub current_stock: f64,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_transaction_date: Option<i64>,
}
