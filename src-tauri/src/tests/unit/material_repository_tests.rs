//! Unit tests for Material Repository
//!
//! This module contains comprehensive unit tests for material repository functionality,
//! focusing on repository layer, caching, and database operations.

use crate::domains::inventory::infrastructure::material_repository::{
    MaterialQuery, MaterialRepository,
};
use crate::domains::inventory::domain::models::material::{Material, MaterialType, UnitOfMeasure};
use crate::repositories::base::Repository;
use crate::test_utils::TestDatabase;
use std::collections::HashMap;

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper function to create a test material in the database
    fn create_test_material(
        test_db: &TestDatabase,
        sku: &str,
        name: &str,
        material_type: MaterialType,
    ) -> Material {
        let material = Material::new(
            uuid::Uuid::new_v4().to_string(),
            sku.to_string(),
            name.to_string(),
            material_type,
        );

        // Insert into database
        let conn = test_db.db().connection();
        let stmt = conn
            .prepare(
                "
            INSERT INTO materials (
                id, sku, name, material_type, unit_of_measure, 
                current_stock, created_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ",
            )
            .unwrap();

        stmt.execute((
            &material.id,
            &material.sku,
            &material.name,
            &material.material_type,
            &material.unit_of_measure,
            &material.current_stock,
            &material.created_at,
            &material.created_by,
        ))
        .unwrap();

        material
    }

    /// Helper function to create a test material with full details
    fn create_test_material_with_details(
        test_db: &TestDatabase,
        sku: &str,
        name: &str,
        material_type: MaterialType,
        current_stock: f64,
        minimum_stock: Option<f64>,
        unit_cost: Option<f64>,
    ) -> Material {
        let mut material = Material::new(
            uuid::Uuid::new_v4().to_string(),
            sku.to_string(),
            name.to_string(),
            material_type,
        );

        material.current_stock = current_stock;
        material.minimum_stock = minimum_stock;
        material.unit_cost = unit_cost;

        // Insert into database
        let conn = test_db.db().connection();
        let stmt = conn
            .prepare(
                "
            INSERT INTO materials (
                id, sku, name, material_type, unit_of_measure, 
                current_stock, minimum_stock, unit_cost,
                created_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ",
            )
            .unwrap();

        stmt.execute((
            &material.id,
            &material.sku,
            &material.name,
            &material.material_type,
            &material.unit_of_measure,
            &material.current_stock,
            &material.minimum_stock,
            &material.unit_cost,
            &material.created_at,
            &material.created_by,
        ))
        .unwrap();

        material
    }

    #[test]
    fn test_find_by_id_cache_hit() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create a material
        let material = create_test_material(
            &test_db,
            "CACHE-HIT-001",
            "Cache Test Material",
            MaterialType::PpfFilm,
        );

        // First call should fetch from database
        let result1 = repository.find_by_id(&material.id).unwrap();
        assert_eq!(result1.sku, "CACHE-HIT-001");

        // Second call should use cache
        let result2 = repository.find_by_id(&material.id).unwrap();
        assert_eq!(result2.sku, "CACHE-HIT-001");

        // Verify it's the same cached object
        assert_eq!(result1.id, result2.id);
    }

    #[test]
    fn test_find_by_id_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        let result = repository.find_by_id("non-existent-id");
        assert!(result.is_err());

        match result.unwrap_err() {
            crate::repositories::base::RepoError::NotFound(_) => {
                // Expected
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_find_by_sku() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create a material
        let material = create_test_material(
            &test_db,
            "SKU-TEST-001",
            "SKU Test Material",
            MaterialType::Adhesive,
        );

        // Find by SKU
        let result = repository.find_by_sku("SKU-TEST-001").unwrap();
        assert_eq!(result.id, material.id);
        assert_eq!(result.sku, "SKU-TEST-001");
        assert_eq!(result.name, "SKU Test Material");
        assert_eq!(result.material_type, MaterialType::Adhesive);
    }

    #[test]
    fn test_find_by_sku_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        let result = repository.find_by_sku("NON-EXISTENT-SKU");
        assert!(result.is_err());

        match result.unwrap_err() {
            crate::repositories::base::RepoError::NotFound(_) => {
                // Expected
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_find_many_with_empty_query() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _material1 = create_test_material(
            &test_db,
            "FIND-MANY-001",
            "Find Many Material 1",
            MaterialType::PpfFilm,
        );
        let _material2 = create_test_material(
            &test_db,
            "FIND-MANY-002",
            "Find Many Material 2",
            MaterialType::Adhesive,
        );
        let _material3 = create_test_material(
            &test_db,
            "FIND-MANY-003",
            "Find Many Material 3",
            MaterialType::Tool,
        );

        // Find all materials
        let query = MaterialQuery::default();
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_find_many_with_material_type_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _material1 = create_test_material(
            &test_db,
            "TYPE-FILTER-001",
            "Type Filter Material 1",
            MaterialType::PpfFilm,
        );
        let _material2 = create_test_material(
            &test_db,
            "TYPE-FILTER-002",
            "Type Filter Material 2",
            MaterialType::PpfFilm,
        );
        let _material3 = create_test_material(
            &test_db,
            "TYPE-FILTER-003",
            "Type Filter Material 3",
            MaterialType::Adhesive,
        );

        // Find only PPF films
        let query = MaterialQuery {
            material_type: Some(MaterialType::PpfFilm),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 2);
        assert!(results
            .iter()
            .all(|m| matches!(m.material_type, MaterialType::PpfFilm)));
    }

    #[test]
    fn test_find_many_with_active_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _active_material = create_test_material(
            &test_db,
            "ACTIVE-001",
            "Active Material",
            MaterialType::PpfFilm,
        );

        // Create an inactive material directly in database
        let mut inactive_material = Material::new(
            uuid::Uuid::new_v4().to_string(),
            "INACTIVE-001".to_string(),
            "Inactive Material".to_string(),
            MaterialType::Adhesive,
        );
        inactive_material.is_active = false;

        let conn = test_db.db().connection();
        let stmt = conn
            .prepare(
                "
            INSERT INTO materials (
                id, sku, name, material_type, unit_of_measure, 
                is_active, created_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ",
            )
            .unwrap();

        stmt.execute((
            &inactive_material.id,
            &inactive_material.sku,
            &inactive_material.name,
            &inactive_material.material_type,
            &inactive_material.unit_of_measure,
            &inactive_material.is_active,
            &inactive_material.created_at,
            &inactive_material.created_by,
        ))
        .unwrap();

        // Find only active materials
        let query = MaterialQuery {
            is_active: Some(true),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results.iter().all(|m| m.is_active));

        // Find only inactive materials
        let query = MaterialQuery {
            is_active: Some(false),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results.iter().all(|m| !m.is_active));
    }

    #[test]
    fn test_find_many_with_discontinued_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _active_material = create_test_material(
            &test_db,
            "DISC-ACTIVE-001",
            "Active Material",
            MaterialType::PpfFilm,
        );

        // Create a discontinued material directly in database
        let mut discontinued_material = Material::new(
            uuid::Uuid::new_v4().to_string(),
            "DISC-DISCONTINUED-001".to_string(),
            "Discontinued Material".to_string(),
            MaterialType::Adhesive,
        );
        discontinued_material.is_discontinued = true;

        let conn = test_db.db().connection();
        let stmt = conn
            .prepare(
                "
            INSERT INTO materials (
                id, sku, name, material_type, unit_of_measure, 
                is_discontinued, created_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ",
            )
            .unwrap();

        stmt.execute((
            &discontinued_material.id,
            &discontinued_material.sku,
            &discontinued_material.name,
            &discontinued_material.material_type,
            &discontinued_material.unit_of_measure,
            &discontinued_material.is_discontinued,
            &discontinued_material.created_at,
            &discontinued_material.created_by,
        ))
        .unwrap();

        // Find only non-discontinued materials
        let query = MaterialQuery {
            is_discontinued: Some(false),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results.iter().all(|m| !m.is_discontinued));

        // Find only discontinued materials
        let query = MaterialQuery {
            is_discontinued: Some(true),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results.iter().all(|m| m.is_discontinued));
    }

    #[test]
    fn test_find_many_with_sku_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _material1 = create_test_material(
            &test_db,
            "SKU-FILTER-001",
            "SKU Filter Material 1",
            MaterialType::PpfFilm,
        );
        let _material2 = create_test_material(
            &test_db,
            "SKU-FILTER-002",
            "SKU Filter Material 2",
            MaterialType::Adhesive,
        );
        let _material3 =
            create_test_material(&test_db, "OTHER-001", "Other Material", MaterialType::Tool);

        // Find by specific SKU
        let query = MaterialQuery {
            sku: Some("SKU-FILTER-001".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].sku, "SKU-FILTER-001");
    }

    #[test]
    fn test_find_many_with_category_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials with categories
        let mut material1 = create_test_material(
            &test_db,
            "CAT-FILTER-001",
            "Category Filter Material 1",
            MaterialType::PpfFilm,
        );
        material1.category = Some("Films".to_string());

        let mut material2 = create_test_material(
            &test_db,
            "CAT-FILTER-002",
            "Category Filter Material 2",
            MaterialType::Adhesive,
        );
        material2.category = Some("Adhesives".to_string());

        let mut material3 = create_test_material(
            &test_db,
            "CAT-FILTER-003",
            "Category Filter Material 3",
            MaterialType::Tool,
        );
        material3.category = Some("Films".to_string());

        // Update materials with categories in database
        for material in [&material1, &material2, &material3] {
            let conn = test_db.db().connection();
            let stmt = conn
                .prepare("UPDATE materials SET category = ? WHERE id = ?")
                .unwrap();

            stmt.execute((&material.category, &material.id)).unwrap();
        }

        // Find materials in "Films" category
        let query = MaterialQuery {
            category: Some("Films".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 2);
        assert!(results
            .iter()
            .all(|m| m.category.as_ref().unwrap() == "Films"));
    }

    #[test]
    fn test_find_many_with_supplier_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials with supplier IDs
        let mut material1 = create_test_material(
            &test_db,
            "SUP-FILTER-001",
            "Supplier Filter Material 1",
            MaterialType::PpfFilm,
        );
        material1.supplier_id = Some("SUPPLIER-001".to_string());

        let mut material2 = create_test_material(
            &test_db,
            "SUP-FILTER-002",
            "Supplier Filter Material 2",
            MaterialType::Adhesive,
        );
        material2.supplier_id = Some("SUPPLIER-002".to_string());

        let mut material3 = create_test_material(
            &test_db,
            "SUP-FILTER-003",
            "Supplier Filter Material 3",
            MaterialType::Tool,
        );
        material3.supplier_id = Some("SUPPLIER-001".to_string());

        // Update materials with supplier IDs in database
        for material in [&material1, &material2, &material3] {
            let conn = test_db.db().connection();
            let stmt = conn
                .prepare("UPDATE materials SET supplier_id = ? WHERE id = ?")
                .unwrap();

            stmt.execute((&material.supplier_id, &material.id)).unwrap();
        }

        // Find materials from "SUPPLIER-001"
        let query = MaterialQuery {
            supplier_id: Some("SUPPLIER-001".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 2);
        assert!(results
            .iter()
            .all(|m| m.supplier_id.as_ref().unwrap() == "SUPPLIER-001"));
    }

    #[test]
    fn test_find_many_with_search_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _material1 = create_test_material(
            &test_db,
            "SEARCH-001",
            "Premium PPF Film Clear",
            MaterialType::PpfFilm,
        );
        let _material2 = create_test_material(
            &test_db,
            "SEARCH-002",
            "Premium PPF Film Matte",
            MaterialType::PpfFilm,
        );
        let _material3 = create_test_material(
            &test_db,
            "SEARCH-003",
            "Standard Adhesive",
            MaterialType::Adhesive,
        );

        // Search for "Premium"
        let query = MaterialQuery {
            search: Some("Premium".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|m| m.name.contains("Premium")));

        // Search for "PPF"
        let query = MaterialQuery {
            search: Some("PPF".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|m| m.name.contains("PPF")));

        // Search for SKU
        let query = MaterialQuery {
            search: Some("SEARCH-001".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].sku, "SEARCH-001");
    }

    #[test]
    fn test_find_many_with_limit_and_offset() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        for i in 1..=10 {
            create_test_material(
                &test_db,
                &format!("LIMIT-OFFSET-{:03}", i),
                &format!("Limit Offset Material {}", i),
                MaterialType::PpfFilm,
            );
        }

        // Get first page (limit 5, offset 0)
        let query = MaterialQuery {
            limit: Some(5),
            offset: Some(0),
            ..Default::default()
        };
        let first_page = repository.find_many(&query).unwrap();
        assert_eq!(first_page.len(), 5);

        // Get second page (limit 5, offset 5)
        let query = MaterialQuery {
            limit: Some(5),
            offset: Some(5),
            ..Default::default()
        };
        let second_page = repository.find_many(&query).unwrap();
        assert_eq!(second_page.len(), 5);

        // Verify no overlap
        let first_ids: std::collections::HashSet<String> =
            first_page.iter().map(|m| m.id.clone()).collect();
        let second_ids: std::collections::HashSet<String> =
            second_page.iter().map(|m| m.id.clone()).collect();
        assert!(first_ids.intersection(&second_ids).count() == 0);
    }

    #[test]
    fn test_find_many_with_sorting() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _material1 = create_test_material(
            &test_db,
            "SORT-001",
            "Zebra Material",
            MaterialType::PpfFilm,
        );
        let _material2 = create_test_material(
            &test_db,
            "SORT-002",
            "Apple Material",
            MaterialType::Adhesive,
        );
        let _material3 =
            create_test_material(&test_db, "SORT-003", "Banana Material", MaterialType::Tool);

        // Sort by name ASC
        let query = MaterialQuery {
            sort_by: Some("name".to_string()),
            sort_order: Some("ASC".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].name, "Apple Material");
        assert_eq!(results[1].name, "Banana Material");
        assert_eq!(results[2].name, "Zebra Material");

        // Sort by name DESC
        let query = MaterialQuery {
            sort_by: Some("name".to_string()),
            sort_order: Some("DESC".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].name, "Zebra Material");
        assert_eq!(results[1].name, "Banana Material");
        assert_eq!(results[2].name, "Apple Material");

        // Sort by SKU ASC
        let query = MaterialQuery {
            sort_by: Some("sku".to_string()),
            sort_order: Some("ASC".to_string()),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].sku, "SORT-001");
        assert_eq!(results[1].sku, "SORT-002");
        assert_eq!(results[2].sku, "SORT-003");
    }

    #[test]
    fn test_find_many_with_invalid_sort_column() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create a test material
        let _material = create_test_material(
            &test_db,
            "INVALID-SORT-001",
            "Invalid Sort Material",
            MaterialType::PpfFilm,
        );

        // Try to sort by invalid column
        let query = MaterialQuery {
            sort_by: Some("invalid_column".to_string()),
            ..Default::default()
        };
        let result = repository.find_many(&query);
        assert!(result.is_err());

        match result.unwrap_err() {
            crate::repositories::base::RepoError::Validation(msg) => {
                assert!(msg.contains("Invalid sort column"));
                assert!(msg.contains("invalid_column"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_find_many_with_multiple_filters() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials with different properties
        let _active_ppf = create_test_material_with_details(
            &test_db,
            "MULTI-001",
            "Active PPF Material",
            MaterialType::PpfFilm,
            100.0,
            Some(20.0),
            Some(15.50),
        );
        let _inactive_ppf = create_test_material_with_details(
            &test_db,
            "MULTI-002",
            "Inactive PPF Material",
            MaterialType::PpfFilm,
            50.0,
            Some(10.0),
            Some(12.50),
        );
        let _active_adhesive = create_test_material_with_details(
            &test_db,
            "MULTI-003",
            "Active Adhesive Material",
            MaterialType::Adhesive,
            75.0,
            Some(15.0),
            Some(8.75),
        );

        // Update the inactive material
        let conn = test_db.db().connection();
        let stmt = conn
            .prepare("UPDATE materials SET is_active = 0 WHERE sku = ?")
            .unwrap();
        stmt.execute(("MULTI-002",)).unwrap();

        // Find active PPF materials
        let query = MaterialQuery {
            material_type: Some(MaterialType::PpfFilm),
            is_active: Some(true),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].sku, "MULTI-001");

        // Find materials with search "Material" and active only
        let query = MaterialQuery {
            search: Some("Material".to_string()),
            is_active: Some(true),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();
        assert_eq!(results.len(), 2);
        assert!(results
            .iter()
            .all(|m| m.is_active && m.name.contains("Material")));
    }

    #[test]
    fn test_count_with_empty_query() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _material1 = create_test_material(
            &test_db,
            "COUNT-001",
            "Count Material 1",
            MaterialType::PpfFilm,
        );
        let _material2 = create_test_material(
            &test_db,
            "COUNT-002",
            "Count Material 2",
            MaterialType::Adhesive,
        );
        let _material3 = create_test_material(
            &test_db,
            "COUNT-003",
            "Count Material 3",
            MaterialType::Tool,
        );

        // Count all materials
        let query = MaterialQuery::default();
        let count = repository.count(&query).unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_count_with_filters() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials
        let _material1 = create_test_material(
            &test_db,
            "COUNT-FILTER-001",
            "Count Filter Material 1",
            MaterialType::PpfFilm,
        );
        let _material2 = create_test_material(
            &test_db,
            "COUNT-FILTER-002",
            "Count Filter Material 2",
            MaterialType::PpfFilm,
        );
        let _material3 = create_test_material(
            &test_db,
            "COUNT-FILTER-003",
            "Count Filter Material 3",
            MaterialType::Adhesive,
        );

        // Count only PPF materials
        let query = MaterialQuery {
            material_type: Some(MaterialType::PpfFilm),
            ..Default::default()
        };
        let count = repository.count(&query).unwrap();
        assert_eq!(count, 2);

        // Count materials with search "Filter"
        let query = MaterialQuery {
            search: Some("Filter".to_string()),
            ..Default::default()
        };
        let count = repository.count(&query).unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_save_create() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        let mut material = Material::new(
            uuid::Uuid::new_v4().to_string(),
            "SAVE-001".to_string(),
            "Save Test Material".to_string(),
            MaterialType::PpfFilm,
        );
        material.description = Some("Test description".to_string());
        material.minimum_stock = Some(20.0);
        material.unit_cost = Some(15.50);

        // Save new material
        let result = repository.save(&material).unwrap();
        assert_eq!(result.id, material.id);
        assert_eq!(result.sku, "SAVE-001");

        // Verify it was saved
        let found = repository.find_by_id(&material.id).unwrap();
        assert_eq!(found.id, material.id);
        assert_eq!(found.description.unwrap(), "Test description");
        assert_eq!(found.minimum_stock, Some(20.0));
        assert_eq!(found.unit_cost, Some(15.50));
    }

    #[test]
    fn test_save_update() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create a material
        let mut material = create_test_material(
            &test_db,
            "SAVE-UPDATE-001",
            "Save Update Material",
            MaterialType::PpfFilm,
        );

        // Update the material
        material.name = "Updated Save Update Material".to_string();
        material.description = Some("Updated description".to_string());
        material.minimum_stock = Some(25.0);

        // Save updated material
        let result = repository.save(&material).unwrap();
        assert_eq!(result.id, material.id);
        assert_eq!(result.name, "Updated Save Update Material");
        assert_eq!(result.description.unwrap(), "Updated description");

        // Verify it was updated
        let found = repository.find_by_id(&material.id).unwrap();
        assert_eq!(found.name, "Updated Save Update Material");
        assert_eq!(found.description.unwrap(), "Updated description");
        assert_eq!(found.minimum_stock, Some(25.0));
    }

    #[test]
    fn test_delete() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create a material
        let material = create_test_material(
            &test_db,
            "DELETE-001",
            "Delete Test Material",
            MaterialType::PpfFilm,
        );

        // Verify it exists
        let found = repository.find_by_id(&material.id).unwrap();
        assert_eq!(found.id, material.id);

        // Delete the material
        repository.delete(&material.id).unwrap();

        // Verify it no longer exists
        let result = repository.find_by_id(&material.id);
        assert!(result.is_err());

        match result.unwrap_err() {
            crate::repositories::base::RepoError::NotFound(_) => {
                // Expected
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_delete_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Try to delete non-existent material
        let result = repository.delete("non-existent-id");
        assert!(result.is_err());

        match result.unwrap_err() {
            crate::repositories::base::RepoError::NotFound(_) => {
                // Expected
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_find_many_with_complex_where_clause() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let repository = MaterialRepository::new(test_db.db());

        // Create test materials with different properties
        let _material1 = create_test_material_with_details(
            &test_db,
            "COMPLEX-001",
            "Complex Material 1",
            MaterialType::PpfFilm,
            100.0,
            Some(20.0),
            Some(15.50),
        );
        let _material2 = create_test_material_with_details(
            &test_db,
            "COMPLEX-002",
            "Complex Material 2",
            MaterialType::Adhesive,
            50.0,
            Some(10.0),
            Some(12.50),
        );
        let _material3 = create_test_material_with_details(
            &test_db,
            "COMPLEX-003",
            "Complex Material 3",
            MaterialType::PpfFilm,
            75.0,
            None,
            Some(18.75),
        );

        // Find PPF materials with minimum stock set
        let query = MaterialQuery {
            material_type: Some(MaterialType::PpfFilm),
            ..Default::default()
        };
        let results = repository.find_many(&query).unwrap();

        // Verify the WHERE clause construction works
        assert_eq!(results.len(), 2);
        assert!(results
            .iter()
            .all(|m| matches!(m.material_type, MaterialType::PpfFilm)));

        // Check that one has minimum_stock set and one doesn't
        let with_min_stock = results.iter().find(|m| m.minimum_stock.is_some()).unwrap();
        let without_min_stock = results.iter().find(|m| m.minimum_stock.is_none()).unwrap();

        assert_eq!(with_min_stock.sku, "COMPLEX-001");
        assert_eq!(without_min_stock.sku, "COMPLEX-003");
    }
}
