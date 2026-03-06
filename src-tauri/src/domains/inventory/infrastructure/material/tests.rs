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
