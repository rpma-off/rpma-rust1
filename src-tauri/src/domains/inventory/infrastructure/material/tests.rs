//! Unit tests for MaterialService.

use super::*;
use crate::test_utils::TestDatabase;

#[test]
fn test_inventory_get_stats_empty_db() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = (*test_db.db()).clone();
    let service = MaterialService::new(db);

    let result = service.get_inventory_stats();
    assert!(
        result.is_ok(),
        "get_inventory_stats should succeed on empty DB, got: {:?}",
        result.err()
    );

    let stats = result.unwrap();
    assert_eq!(stats.total_materials, 0);
    assert_eq!(stats.active_materials, 0);
    assert_eq!(stats.low_stock_materials, 0);
    assert_eq!(stats.expired_materials, 0);
    assert_eq!(stats.total_value, 0.0);
    assert!(stats.recent_transactions.is_empty());
}

#[test]
fn test_material_list_categories_empty_db() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = (*test_db.db()).clone();
    let service = MaterialService::new(db);

    let result = service.list_material_categories(true, None, None);
    assert!(
        result.is_ok(),
        "list_material_categories should succeed on empty DB, got: {:?}",
        result.err()
    );
}

#[test]
fn test_material_list_categories_with_pagination_empty_db() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = (*test_db.db()).clone();
    let service = MaterialService::new(db);

    let result = service.list_material_categories(true, Some(10), Some(0));
    assert!(
        result.is_ok(),
        "list_material_categories with pagination should succeed on empty DB, got: {:?}",
        result.err()
    );
}

#[test]
fn test_inventory_movement_summary_empty_db() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = (*test_db.db()).clone();
    let service = MaterialService::new(db);

    let result = service.get_inventory_movement_summary(None, None, None);
    assert!(
        result.is_ok(),
        "get_inventory_movement_summary should succeed on empty DB, got: {:?}",
        result.err()
    );
    assert!(result.unwrap().is_empty());
}

#[test]
fn test_inventory_movement_summary_with_date_range_empty_db() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = (*test_db.db()).clone();
    let service = MaterialService::new(db);

    let result =
        service.get_inventory_movement_summary(None, Some("2024-01-01"), Some("2024-12-31"));
    assert!(
        result.is_ok(),
        "movement summary with dates should succeed on empty DB, got: {:?}",
        result.err()
    );
    assert!(result.unwrap().is_empty());
}

// ── Regression: BUG-1 — soft-deleted materials must be hidden from readers ────

fn seed_user(db: &crate::db::Database, user_id: &str) {
    let now = chrono::Utc::now().timestamp_millis();
    db.execute(
        "INSERT OR IGNORE INTO users (id, email, username, password_hash, full_name, role, created_at, updated_at, is_active)
         VALUES (?, ?, ?, 'hash', ?, 'admin', ?, ?, 1)",
        rusqlite::params![
            user_id,
            format!("{}@test.local", user_id),
            user_id,
            user_id,
            now,
            now
        ],
    ).expect("seed user");
}

fn make_test_material_request(sku: &str, name: &str) -> types::CreateMaterialRequest {
    use crate::domains::inventory::domain::models::material::{MaterialType, UnitOfMeasure};
    types::CreateMaterialRequest {
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
        current_stock: None,
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
    }
}

#[test]
fn test_soft_deleted_material_not_returned_by_id() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    seed_user(&test_db.db(), "user-test");
    let service = MaterialService::new((*test_db.db()).clone());
    let user_id = "user-test".to_string();

    let mat = service
        .create_material(
            make_test_material_request("REG-001", "Regression Test Material"),
            Some(user_id.clone()),
        )
        .expect("create_material failed");

    service
        .delete_material(&mat.id, Some(user_id))
        .expect("delete_material failed");

    // BUG-1 fix: get_material must return None for soft-deleted rows
    let fetched = service.get_material(&mat.id).expect("get_material error");
    assert!(
        fetched.is_none(),
        "Soft-deleted material should not be returned by get_material"
    );
}

#[test]
fn test_soft_deleted_material_not_in_list() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    seed_user(&test_db.db(), "user-test");
    let service = MaterialService::new((*test_db.db()).clone());
    let user_id = "user-test".to_string();

    let mat = service
        .create_material(
            make_test_material_request("REG-LIST-001", "List Regression Material"),
            Some(user_id.clone()),
        )
        .expect("create_material failed");

    service
        .delete_material(&mat.id, Some(user_id))
        .expect("delete_material failed");

    // BUG-1 fix: list_materials must exclude soft-deleted rows
    let list = service
        .list_materials(None, None, false, None, None)
        .expect("list_materials error");
    assert!(
        list.iter().all(|m| m.id != mat.id),
        "Soft-deleted material should not appear in list_materials"
    );
}

// ── Regression: BUG-2 — stats must exclude soft-deleted materials ─────────────

#[test]
fn test_stats_exclude_soft_deleted_material() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    seed_user(&test_db.db(), "user-test");
    let service = MaterialService::new((*test_db.db()).clone());
    let user_id = "user-test".to_string();

    let mat = service
        .create_material(
            make_test_material_request("STATS-001", "Stats Regression Material"),
            Some(user_id.clone()),
        )
        .expect("create_material failed");

    // Before delete: total_materials == 1
    let before = service.get_material_stats().expect("stats before");
    assert_eq!(before.total_materials, 1);

    service
        .delete_material(&mat.id, Some(user_id))
        .expect("delete_material failed");

    // BUG-2 fix: stats must not count soft-deleted rows
    let after = service.get_material_stats().expect("stats after");
    assert_eq!(
        after.total_materials, 0,
        "Soft-deleted material must not be counted in total_materials"
    );
}

// ── Regression: BUG-3 — Adjustment with qty=0 must be rejected ───────────────

#[test]
fn test_adjustment_zero_quantity_rejected() {
    use crate::domains::inventory::domain::models::material::{
        InventoryTransactionType, MaterialType, UnitOfMeasure,
    };

    let test_db = TestDatabase::new().expect("Failed to create test database");
    seed_user(&test_db.db(), "user-test");
    let service = MaterialService::new((*test_db.db()).clone());
    let user_id = "user-test".to_string();

    let mat = service
        .create_material(
            types::CreateMaterialRequest {
                sku: "ADJ-001".to_string(),
                name: "Adjustment Regression Material".to_string(),
                description: None,
                material_type: MaterialType::Tool,
                category: None,
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure: UnitOfMeasure::Piece,
                current_stock: Some(10.0),
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
            },
            Some(user_id.clone()),
        )
        .expect("create_material failed");

    // BUG-3 fix: Adjustment qty=0 must return Err(Validation)
    let result = service.create_inventory_transaction(
        types::CreateInventoryTransactionRequest {
            material_id: mat.id.clone(),
            transaction_type: InventoryTransactionType::Adjustment,
            quantity: 0.0,
            reference_number: None,
            reference_type: None,
            notes: None,
            unit_cost: None,
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        },
        &user_id,
    );

    match result {
        Err(errors::MaterialError::Validation(msg)) => {
            // Passes — qty=0 Adjustment is correctly rejected
            let _ = msg; // message content is flexible
        }
        other => panic!(
            "Expected Err(Validation) for zero Adjustment quantity, got: {:?}",
            other
        ),
    }
}
