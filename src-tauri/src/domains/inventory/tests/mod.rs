use std::sync::Arc;

use crate::domains::inventory::application::InventoryService;
use crate::domains::inventory::domain::material::validate_stock_change;
use crate::models::material::{MaterialType, UnitOfMeasure};
use crate::services::material::{CreateMaterialRequest, MaterialService, UpdateStockRequest};
use crate::test_utils::TestDatabase;

#[test]
fn stock_cannot_go_negative() {
    let result = validate_stock_change(5.0, -10.0);
    assert!(result.is_err());
}

#[test]
fn update_stock_validates_invariants() {
    let test_db = TestDatabase::new().expect("create test db");
    let db = test_db.db();
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let inventory_service = InventoryService::new(db.clone(), material_service.clone());

    let request = CreateMaterialRequest {
        sku: "INV-TEST-001".to_string(),
        name: "Inventory Test Material".to_string(),
        description: Some("Test material".to_string()),
        material_type: MaterialType::PpfFilm,
        category: Some("Films".to_string()),
        subcategory: None,
        category_id: None,
        brand: Some("TestBrand".to_string()),
        model: None,
        specifications: None,
        unit_of_measure: UnitOfMeasure::Meter,
        minimum_stock: Some(0.0),
        maximum_stock: Some(100.0),
        reorder_point: Some(10.0),
        unit_cost: Some(12.5),
        currency: Some("EUR".to_string()),
        supplier_id: None,
        supplier_name: None,
        supplier_sku: None,
        quality_grade: None,
        certification: None,
        expiry_date: None,
        batch_number: None,
        storage_location: Some("Test Shelf".to_string()),
        warehouse_id: None,
    };

    let material = material_service
        .create_material(request, Some("test_user".to_string()))
        .expect("create material");

    material_service
        .update_stock(UpdateStockRequest {
            material_id: material.id.clone(),
            quantity_change: 5.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        })
        .expect("seed stock");

    let result = inventory_service.update_stock(UpdateStockRequest {
        material_id: material.id.clone(),
        quantity_change: -10.0,
        reason: "Overdraw".to_string(),
        recorded_by: Some("test_user".to_string()),
    });

    assert!(result.is_err());
}
