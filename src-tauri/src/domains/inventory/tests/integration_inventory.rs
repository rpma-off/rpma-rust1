use std::sync::Arc;

use crate::db::Database;
use crate::domains::inventory::domain::models::material::{MaterialType, UnitOfMeasure};
use crate::domains::inventory::infrastructure::material::{
    CreateMaterialRequest, MaterialService, UpdateStockRequest,
};
use crate::domains::inventory::InventoryFacade;

#[tokio::test]
async fn create_and_list_materials_round_trip() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service.clone());

    let request = CreateMaterialRequest {
        sku: "INT-TEST-001".to_string(),
        name: "Integration Test Film".to_string(),
        description: Some("Test material for integration".to_string()),
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
        unit_cost: Some(15.0),
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

    material_service
        .create_material(request, Some("test_user".to_string()))
        .expect("create material");

    let materials = facade
        .list_materials(None, None, false, None, None)
        .expect("list materials");
    assert!(!materials.is_empty());
    assert_eq!(materials[0].name, "Integration Test Film");
}

#[tokio::test]
async fn stats_reflect_created_materials() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service.clone());

    let stats_before = facade.get_material_stats().expect("get stats before");

    let request = CreateMaterialRequest {
        sku: "INT-STATS-001".to_string(),
        name: "Stats Test Film".to_string(),
        description: None,
        material_type: MaterialType::PpfFilm,
        category: None,
        subcategory: None,
        category_id: None,
        brand: None,
        model: None,
        specifications: None,
        unit_of_measure: UnitOfMeasure::Meter,
        minimum_stock: None,
        maximum_stock: None,
        reorder_point: None,
        unit_cost: None,
        currency: None,
        supplier_id: None,
        supplier_name: None,
        supplier_sku: None,
        quality_grade: None,
        certification: None,
        expiry_date: None,
        batch_number: None,
        storage_location: None,
        warehouse_id: None,
    };

    material_service
        .create_material(request, Some("test_user".to_string()))
        .expect("create material");

    let stats_after = facade.get_material_stats().expect("get stats after");
    assert!(stats_after.total_materials > stats_before.total_materials);
}
