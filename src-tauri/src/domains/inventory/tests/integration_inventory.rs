use std::sync::Arc;

use crate::db::Database;
use crate::domains::inventory::domain::material::DEFAULT_LOW_STOCK_THRESHOLD;
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

/// Helper: build a minimal CreateMaterialRequest for testing.
fn make_material(sku: &str, name: &str, min_stock: Option<f64>) -> CreateMaterialRequest {
    CreateMaterialRequest {
        sku: sku.to_string(),
        name: name.to_string(),
        description: None,
        material_type: MaterialType::Consumable,
        category: None,
        subcategory: None,
        category_id: None,
        brand: None,
        model: None,
        specifications: None,
        unit_of_measure: UnitOfMeasure::Piece,
        minimum_stock: min_stock,
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
    }
}

/// Regression: get_low_stock_materials returns a strict, null-free contract.
/// Items with current_stock <= minimum_stock appear; items above threshold do not.
#[tokio::test]
async fn low_stock_response_contract_is_strict_and_null_free() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));

    // Material A: min_stock=10, current_stock=0 → low stock (shortage=10)
    material_service
        .create_material(make_material("LS-A", "Low Stock A", Some(10.0)), Some("tester".to_string()))
        .expect("create material A");

    // Material B: min_stock=5, current_stock=5 → exactly at threshold → low stock
    material_service
        .create_material(make_material("LS-B", "At Threshold B", Some(5.0)), Some("tester".to_string()))
        .expect("create material B");

    // Material C: min_stock=3, current_stock=10 → above threshold → NOT low stock
    let c = material_service
        .create_material(make_material("LS-C", "Healthy C", Some(3.0)), Some("tester".to_string()))
        .expect("create material C");
    material_service
        .update_stock(UpdateStockRequest {
            material_id: c.id.clone(),
            quantity_change: 10.0,
            reason: "restock".to_string(),
            recorded_by: Some("tester".to_string()),
        })
        .expect("stock up material C");

    // Material D: no min_stock set → only flagged when current_stock <= DEFAULT_LOW_STOCK_THRESHOLD (0)
    // current_stock is 0 by default → counts as low stock
    material_service
        .create_material(make_material("LS-D", "No Min D", None), Some("tester".to_string()))
        .expect("create material D");

    let response = material_service
        .get_low_stock_materials()
        .expect("get low stock materials");

    // Contract: items and total are always present (no null surprises)
    assert_eq!(response.total, response.items.len() as i32, "total must match items.len()");

    // Material C (healthy) must NOT appear
    assert!(
        !response.items.iter().any(|i| i.sku == "LS-C"),
        "healthy material must not appear in low-stock list"
    );

    // Materials A, B, D must appear
    assert!(response.items.iter().any(|i| i.sku == "LS-A"), "low-stock A must appear");
    assert!(response.items.iter().any(|i| i.sku == "LS-B"), "at-threshold B must appear");
    assert!(response.items.iter().any(|i| i.sku == "LS-D"), "zero-stock D (no min) must appear");

    // Every item must have non-negative numeric fields (no NaN / null surprises)
    for item in &response.items {
        assert!(item.current_stock.is_finite(), "current_stock must be finite");
        assert!(item.reserved_stock.is_finite(), "reserved_stock must be finite");
        assert!(item.available_stock.is_finite(), "available_stock must be finite");
        assert!(item.minimum_stock.is_finite(), "minimum_stock must be finite");
        assert!(item.effective_threshold.is_finite(), "effective_threshold must be finite");
        assert!(item.shortage_quantity >= 0.0, "shortage_quantity must be >= 0");
        assert!(!item.material_id.is_empty(), "material_id must be non-empty");
        assert!(!item.sku.is_empty(), "sku must be non-empty");
        assert!(!item.name.is_empty(), "name must be non-empty");
    }

    // Material A: shortage = min − current = 10 − 0 = 10
    let item_a = response.items.iter().find(|i| i.sku == "LS-A").unwrap();
    assert_eq!(item_a.shortage_quantity, 10.0, "material A shortage must be 10");
    assert_eq!(item_a.effective_threshold, 10.0, "material A threshold must be 10");

    // Material D: effective_threshold falls back to DEFAULT_LOW_STOCK_THRESHOLD
    let item_d = response.items.iter().find(|i| i.sku == "LS-D").unwrap();
    assert_eq!(item_d.effective_threshold, DEFAULT_LOW_STOCK_THRESHOLD);
}

/// Regression: stats low_stock_count and get_low_stock_materials total are consistent.
#[tokio::test]
async fn stats_low_stock_count_matches_get_low_stock_materials() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service.clone());

    // Create 2 low-stock materials and 1 healthy
    material_service
        .create_material(make_material("CS-A", "Low A", Some(5.0)), Some("tester".to_string()))
        .expect("create A");
    material_service
        .create_material(make_material("CS-B", "Low B", Some(1.0)), Some("tester".to_string()))
        .expect("create B");
    let healthy = material_service
        .create_material(make_material("CS-H", "Healthy H", Some(2.0)), Some("tester".to_string()))
        .expect("create H");
    material_service
        .update_stock(UpdateStockRequest {
            material_id: healthy.id,
            quantity_change: 10.0,
            reason: "restock".to_string(),
            recorded_by: Some("tester".to_string()),
        })
        .expect("restock H");

    let low_stock_list = material_service
        .get_low_stock_materials()
        .expect("get low stock list");
    let stats = facade.get_material_stats().expect("get stats");

    assert_eq!(
        low_stock_list.total, stats.low_stock_materials,
        "low_stock total from list must match low_stock_materials in stats"
    );
}
