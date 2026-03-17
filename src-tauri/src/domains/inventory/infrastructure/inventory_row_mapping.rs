//! Row-to-domain mapping for inventory entities.

use crate::db::FromSqlRow;
use crate::domains::inventory::domain::models::material::{
    parse_unit_of_measure, InventoryTransaction, InventoryTransactionType, LowStockMaterial,
    Material, MaterialCategory, MaterialConsumption, MaterialType, Supplier,
};
use rusqlite::Row;

fn parse_material_type(material_type: &str) -> rusqlite::Result<MaterialType> {
    match material_type {
        "ppf_film" => Ok(MaterialType::PpfFilm),
        "adhesive" => Ok(MaterialType::Adhesive),
        "cleaning_solution" => Ok(MaterialType::CleaningSolution),
        "tool" => Ok(MaterialType::Tool),
        "consumable" => Ok(MaterialType::Consumable),
        _ => Err(rusqlite::Error::InvalidColumnType(
            0,
            "material_type".to_string(),
            rusqlite::types::Type::Text,
        )),
    }
}

fn parse_transaction_type(transaction_type: &str) -> rusqlite::Result<InventoryTransactionType> {
    match transaction_type {
        "stock_in" => Ok(InventoryTransactionType::StockIn),
        "stock_out" => Ok(InventoryTransactionType::StockOut),
        "adjustment" => Ok(InventoryTransactionType::Adjustment),
        "transfer" => Ok(InventoryTransactionType::Transfer),
        "waste" => Ok(InventoryTransactionType::Waste),
        "return" => Ok(InventoryTransactionType::Return),
        _ => Err(rusqlite::Error::InvalidColumnType(
            0,
            "transaction_type".to_string(),
            rusqlite::types::Type::Text,
        )),
    }
}

impl FromSqlRow for LowStockMaterial {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let unit_str: String = row.get("unit_of_measure")?;
        Ok(Self {
            material_id: row.get("material_id")?,
            sku: row.get("sku")?,
            name: row.get("name")?,
            unit_of_measure: parse_unit_of_measure(&unit_str),
            current_stock: row.get("current_stock")?,
            reserved_stock: row.get("reserved_stock")?,
            available_stock: row.get("available_stock")?,
            minimum_stock: row.get("minimum_stock")?,
            effective_threshold: row.get("effective_threshold")?,
            shortage_quantity: row.get("shortage_quantity")?,
        })
    }
}

impl FromSqlRow for Material {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let material_type_str: String = row.get("material_type")?;
        let unit_str: String = row.get("unit_of_measure")?;

        let material = Self {
            id: row.get("id")?,
            sku: row.get("sku")?,
            name: row.get("name")?,
            description: row.get("description")?,
            material_type: parse_material_type(&material_type_str)?,
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
            unit_of_measure: parse_unit_of_measure(&unit_str),
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
            is_expired: false,
            is_low_stock: false,
            storage_location: row.get("storage_location")?,
            warehouse_id: row.get("warehouse_id")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            created_by: row.get("created_by")?,
            updated_by: row.get("updated_by")?,
            deleted_at: row.get("deleted_at")?,
            deleted_by: row.get("deleted_by")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
        };

        Ok(Self {
            is_expired: material.is_expired(),
            is_low_stock: material.is_low_stock(),
            ..material
        })
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

impl FromSqlRow for InventoryTransaction {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let transaction_type_str: String = row.get("transaction_type")?;

        Ok(Self {
            id: row.get("id")?,
            material_id: row.get("material_id")?,
            transaction_type: parse_transaction_type(&transaction_type_str)?,
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
