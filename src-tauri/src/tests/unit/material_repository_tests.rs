//! Unit tests for Material Repository
//!
//! This module contains comprehensive unit tests for material repository functionality,
//! focusing on repository layer, caching, and database operations.

use crate::models::material::{Material, MaterialType, UnitOfMeasure};
use crate::repositories::base::Repository;
use crate::repositories::material_repository::{MaterialQuery, MaterialRepository};
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

    #[test]
    fn test_find_by_id_cache_hit() {
        let test_db = TestDatabase::new();
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
    fn test_find_by_sku() {
        let test_db = TestDatabase::new();
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
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Try to find non-existent SKU
        let result = repository.find_by_sku("NON-EXISTENT");
        assert!(result.is_err());
    }

    #[test]
    fn test_find_low_stock() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create materials with different stock levels
        let material1 = create_test_material(
            &test_db,
            "LOW-STOCK-001",
            "Low Stock Material 1",
            MaterialType::PpfFilm,
        );

        let material2 = create_test_material(
            &test_db,
            "LOW-STOCK-002",
            "Low Stock Material 2",
            MaterialType::Adhesive,
        );

        let material3 = create_test_material(
            &test_db,
            "LOW-STOCK-003",
            "Normal Stock Material",
            MaterialType::Tool,
        );

        // Update stock levels
        let conn = test_db.db().connection();

        // Material 1: below minimum stock
        conn.execute(
            "UPDATE materials SET current_stock = 5.0, minimum_stock = 10.0 WHERE id = ?",
            (&material1.id,),
        )
        .unwrap();

        // Material 2: exactly at minimum stock
        conn.execute(
            "UPDATE materials SET current_stock = 15.0, minimum_stock = 15.0 WHERE id = ?",
            (&material2.id,),
        )
        .unwrap();

        // Material 3: above minimum stock
        conn.execute(
            "UPDATE materials SET current_stock = 50.0, minimum_stock = 10.0 WHERE id = ?",
            (&material3.id,),
        )
        .unwrap();

        // Find low stock materials
        let result = repository.find_low_stock().unwrap();
        assert_eq!(result.len(), 2); // material1 and material2

        // Verify the correct materials are returned
        let skus: Vec<String> = result.iter().map(|m| m.sku.clone()).collect();
        assert!(skus.contains(&"LOW-STOCK-001".to_string()));
        assert!(skus.contains(&"LOW-STOCK-002".to_string()));
        assert!(!skus.contains(&"LOW-STOCK-003".to_string()));
    }

    #[test]
    fn test_find_by_type() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create materials of different types
        let film1 = create_test_material(&test_db, "FILM-001", "PPF Film 1", MaterialType::PpfFilm);

        let film2 = create_test_material(&test_db, "FILM-002", "PPF Film 2", MaterialType::PpfFilm);

        let adhesive = create_test_material(
            &test_db,
            "ADHESIVE-001",
            "Adhesive 1",
            MaterialType::Adhesive,
        );

        // Find materials by type
        let result = repository.find_by_type(MaterialType::PpfFilm).unwrap();
        assert_eq!(result.len(), 2);

        let skus: Vec<String> = result.iter().map(|m| m.sku.clone()).collect();
        assert!(skus.contains(&"FILM-001".to_string()));
        assert!(skus.contains(&"FILM-002".to_string()));
        assert!(!skus.contains(&"ADHESIVE-001".to_string()));
    }

    #[test]
    fn test_search_materials() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create materials with searchable terms
        create_test_material(
            &test_db,
            "SEARCH-001",
            "Clear PPF Film for Tesla",
            MaterialType::PpfFilm,
        );

        create_test_material(
            &test_db,
            "SEARCH-002",
            "Matte PPF Film for BMW",
            MaterialType::PpfFilm,
        );

        create_test_material(
            &test_db,
            "SEARCH-003",
            "Adhesive for PPF Installation",
            MaterialType::Adhesive,
        );

        // Search by name
        let query = MaterialQuery {
            search: Some("Tesla".to_string()),
            material_type: None,
            category: None,
            limit: Some(10),
            offset: Some(0),
        };

        let result = repository.search(query).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "Clear PPF Film for Tesla");

        // Search by multiple terms
        let query = MaterialQuery {
            search: Some("PPF Film".to_string()),
            material_type: None,
            category: None,
            limit: Some(10),
            offset: Some(0),
        };

        let result = repository.search(query).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_update_stock_invalidates_cache() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create a material
        let material = create_test_material(
            &test_db,
            "CACHE-INVALIDATE-001",
            "Cache Invalidate Test",
            MaterialType::PpfFilm,
        );

        // First call to populate cache
        let result1 = repository.find_by_id(&material.id).unwrap();
        assert_eq!(result1.current_stock, 0.0);

        // Update stock
        repository
            .update_stock(&material.id, 50.0, "Test update")
            .unwrap();

        // Second call should get updated data (cache invalidated)
        let result2 = repository.find_by_id(&material.id).unwrap();
        assert_eq!(result2.current_stock, 50.0);
    }

    #[test]
    fn test_count_materials() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create multiple materials
        create_test_material(&test_db, "COUNT-001", "Material 1", MaterialType::PpfFilm);
        create_test_material(&test_db, "COUNT-002", "Material 2", MaterialType::Adhesive);
        create_test_material(&test_db, "COUNT-003", "Material 3", MaterialType::Tool);

        // Count all materials
        let total_count = repository.count(None).unwrap();
        assert_eq!(total_count, 3);

        // Count by type
        let film_count = repository.count(Some(MaterialType::PpfFilm)).unwrap();
        assert_eq!(film_count, 1);

        let adhesive_count = repository.count(Some(MaterialType::Adhesive)).unwrap();
        assert_eq!(adhesive_count, 1);
    }

    #[test]
    fn test_find_with_pagination() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create multiple materials
        for i in 1..=15 {
            create_test_material(
                &test_db,
                &format!("PAGINATE-{:03}", i),
                &format!("Material {}", i),
                if i % 3 == 0 {
                    MaterialType::Adhesive
                } else {
                    MaterialType::PpfFilm
                },
            );
        }

        // Get first page
        let query1 = MaterialQuery {
            search: None,
            material_type: None,
            category: None,
            limit: Some(5),
            offset: Some(0),
        };

        let page1 = repository.search(query1).unwrap();
        assert_eq!(page1.len(), 5);

        // Get second page
        let query2 = MaterialQuery {
            search: None,
            material_type: None,
            category: None,
            limit: Some(5),
            offset: Some(5),
        };

        let page2 = repository.search(query2).unwrap();
        assert_eq!(page2.len(), 5);

        // Verify no duplicates between pages
        let page1_ids: Vec<String> = page1.iter().map(|m| m.id.clone()).collect();
        let page2_ids: Vec<String> = page2.iter().map(|m| m.id.clone()).collect();

        for id in &page1_ids {
            assert!(!page2_ids.contains(id));
        }
    }

    #[test]
    fn test_find_expired_materials() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create materials
        let material1 = create_test_material(
            &test_db,
            "EXPIRED-001",
            "Expired Material",
            MaterialType::Adhesive,
        );

        let material2 = create_test_material(
            &test_db,
            "EXPIRED-002",
            "Valid Material",
            MaterialType::Adhesive,
        );

        // Set expiry dates
        let conn = test_db.db().connection();
        let yesterday = chrono::Utc::now() - chrono::Duration::days(1);
        let next_month = chrono::Utc::now() + chrono::Duration::days(30);

        conn.execute(
            "UPDATE materials SET expiry_date = ? WHERE id = ?",
            (&yesterday, &material1.id),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET expiry_date = ? WHERE id = ?",
            (&next_month, &material2.id),
        )
        .unwrap();

        // Find expired materials
        let result = repository.find_expired().unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].sku, "EXPIRED-001");
    }

    #[test]
    fn test_find_by_category() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create materials with categories
        let material1 = create_test_material(
            &test_db,
            "CATEGORY-001",
            "Film Material",
            MaterialType::PpfFilm,
        );

        let material2 = create_test_material(
            &test_db,
            "CATEGORY-002",
            "Another Film",
            MaterialType::PpfFilm,
        );

        let material3 = create_test_material(
            &test_db,
            "CATEGORY-003",
            "Adhesive Material",
            MaterialType::Adhesive,
        );

        // Set categories
        let conn = test_db.db().connection();

        conn.execute(
            "UPDATE materials SET category = ? WHERE id = ?",
            ("Films", &material1.id),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET category = ? WHERE id = ?",
            ("Films", &material2.id),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET category = ? WHERE id = ?",
            ("Adhesives", &material3.id),
        )
        .unwrap();

        // Find by category
        let result = repository.find_by_category("Films").unwrap();
        assert_eq!(result.len(), 2);

        let skus: Vec<String> = result.iter().map(|m| m.sku.clone()).collect();
        assert!(skus.contains(&"CATEGORY-001".to_string()));
        assert!(skus.contains(&"CATEGORY-002".to_string()));
        assert!(!skus.contains(&"CATEGORY-003".to_string()));
    }

    #[test]
    fn test_complex_query_search() {
        let test_db = TestDatabase::new();
        let repository = MaterialRepository::new(test_db.db());

        // Create materials with various attributes
        let material1 = create_test_material(
            &test_db,
            "COMPLEX-001",
            "Clear PPF Film for Luxury Cars",
            MaterialType::PpfFilm,
        );

        let material2 = create_test_material(
            &test_db,
            "COMPLEX-002",
            "Matte PPF Film for Sports Cars",
            MaterialType::PpfFilm,
        );

        let material3 = create_test_material(
            &test_db,
            "COMPLEX-003",
            "High-Performance Adhesive",
            MaterialType::Adhesive,
        );

        // Set categories
        let conn = test_db.db().connection();

        conn.execute(
            "UPDATE materials SET category = ? WHERE id = ?",
            ("Premium Films", &material1.id),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET category = ? WHERE id = ?",
            ("Premium Films", &material2.id),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET category = ? WHERE id = ?",
            ("Adhesives", &material3.id),
        )
        .unwrap();

        // Complex query: search for "PPF" in category "Premium Films"
        let query = MaterialQuery {
            search: Some("PPF".to_string()),
            material_type: Some(MaterialType::PpfFilm),
            category: Some("Premium Films".to_string()),
            limit: Some(10),
            offset: Some(0),
        };

        let result = repository.search(query).unwrap();
        assert_eq!(result.len(), 2);

        let skus: Vec<String> = result.iter().map(|m| m.sku.clone()).collect();
        assert!(skus.contains(&"COMPLEX-001".to_string()));
        assert!(skus.contains(&"COMPLEX-002".to_string()));
    }
}
