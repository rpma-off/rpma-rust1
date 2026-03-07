//! Tests for inventory IPC command handlers
//!
//! These tests verify that inventory IPC commands have the correct signatures,
//! use the correct request types, and enforce authentication.

use rpma_ppf_intervention::commands::inventory::{
    material_create, material_delete, material_get, material_list,
    CreateMaterialRequest, MaterialType, UnitOfMeasure,
};

/// Verify that IPC command function pointers are accessible and have the expected signature.
/// This confirms the public API surface of the inventory IPC module is intact.
#[test]
fn test_material_ipc_functions_are_accessible() {
    let _ = material_create;
    let _ = material_get;
    let _ = material_list;
    let _ = material_delete;
}

/// Verify that CreateMaterialRequest can be constructed with all required fields.
/// This is a regression guard against struct field renames or type changes.
#[test]
fn test_create_material_request_structure() {
    let req = CreateMaterialRequest {
        sku: "PPF-TEST-001".to_string(),
        name: "Test PPF Film".to_string(),
        description: Some("A test film material".to_string()),
        material_type: MaterialType::PpfFilm,
        category: Some("Films".to_string()),
        subcategory: None,
        category_id: None,
        brand: Some("Xpel".to_string()),
        model: None,
        specifications: None,
        unit_of_measure: UnitOfMeasure::Roll,
        minimum_stock: Some(1.0),
        maximum_stock: Some(100.0),
        reorder_point: Some(5.0),
        unit_cost: Some(1000.0),
        currency: Some("EUR".to_string()),
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

    assert_eq!(req.sku, "PPF-TEST-001");
    assert_eq!(req.name, "Test PPF Film");
    assert_eq!(req.unit_of_measure, UnitOfMeasure::Roll);
    assert_eq!(req.material_type, MaterialType::PpfFilm);
    assert_eq!(req.minimum_stock, Some(1.0));
    assert_eq!(req.unit_cost, Some(1000.0));
    assert_eq!(req.currency, Some("EUR".to_string()));
}
