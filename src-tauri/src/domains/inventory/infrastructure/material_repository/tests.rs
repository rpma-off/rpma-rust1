//! Unit tests for `MaterialRepository`.

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::inventory::domain::models::material::{Material, MaterialType};
    use crate::domains::inventory::infrastructure::material_repository::query::MaterialQuery;
    use crate::domains::inventory::infrastructure::material_repository::MaterialRepository;
    use crate::shared::repositories::base::Repository;
    use crate::shared::repositories::cache::Cache;
    use chrono::Utc;
    use std::sync::Arc;

    async fn setup_test_db() -> Database {
        crate::test_utils::setup_test_db().await
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test material
        let material = Material {
            id: "test-1".to_string(),
            sku: "SKU-001".to_string(),
            name: "Test Material".to_string(),
            description: Some("Test description".to_string()),
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure:
                crate::domains::inventory::domain::models::material::UnitOfMeasure::Roll,
            current_stock: 10.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(100.0),
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
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };

        repo.save(material.clone()).await.unwrap();

        // Find by ID
        let found = repo.find_by_id("test-1".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, "test-1");
    }

    #[tokio::test]
    async fn test_find_by_sku() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test material
        let material = Material {
            id: "sku-test".to_string(),
            sku: "SKU-002".to_string(),
            name: "SKU Test Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure:
                crate::domains::inventory::domain::models::material::UnitOfMeasure::Roll,
            current_stock: 15.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(150.0),
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
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };

        repo.save(material).await.unwrap();

        // Find by SKU
        let found = repo.find_by_sku("SKU-002").await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "SKU Test Material");
    }

    #[tokio::test]
    async fn test_find_low_stock() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create material with low stock
        let low_stock_material = Material {
            id: "low-stock".to_string(),
            sku: "SKU-003".to_string(),
            name: "Low Stock Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure:
                crate::domains::inventory::domain::models::material::UnitOfMeasure::Roll,
            current_stock: 3.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(100.0),
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
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };
        repo.save(low_stock_material).await.unwrap();

        // Find low stock materials
        let low_stock = repo.find_low_stock().await.unwrap();
        assert!(low_stock.len() >= 1);
    }

    #[tokio::test]
    async fn test_find_by_type() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test materials
        for i in 0..2 {
            let material = Material {
                id: format!("type-test-{}", i),
                sku: format!("SKU-TYPE-{}", i),
                name: format!("Type Test Material {}", i),
                description: None,
                material_type: MaterialType::Adhesive,
                category: None,
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure:
                    crate::domains::inventory::domain::models::material::UnitOfMeasure::Piece,
                current_stock: 10.0,
                minimum_stock: Some(5.0),
                maximum_stock: Some(20.0),
                reorder_point: Some(8.0),
                unit_cost: Some(50.0),
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
                created_at: Utc::now().timestamp_millis(),
                updated_at: Utc::now().timestamp_millis(),
                created_by: None,
                updated_by: None,
                synced: false,
                last_synced_at: None,
            };
            repo.save(material).await.unwrap();
        }

        // Find by type
        let adhesives = repo.find_by_type(MaterialType::Adhesive).await.unwrap();
        assert!(adhesives.len() >= 2);
    }

    #[tokio::test]
    async fn test_update_stock() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test material
        let material = Material {
            id: "stock-test".to_string(),
            sku: "SKU-004".to_string(),
            name: "Stock Test Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure:
                crate::domains::inventory::domain::models::material::UnitOfMeasure::Roll,
            current_stock: 10.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(100.0),
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
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };
        repo.save(material).await.unwrap();

        // Update stock
        let new_stock = repo.update_stock("stock-test", -2.0).await.unwrap();
        assert_eq!(new_stock, 8.0);

        // Update stock again
        let new_stock = repo.update_stock("stock-test", 5.0).await.unwrap();
        assert_eq!(new_stock, 13.0);
    }

    #[tokio::test]
    async fn test_search() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test materials
        for i in 0..3 {
            let material = Material {
                id: format!("search-{}", i),
                sku: format!("SKU-SEARCH-{}", i),
                name: format!("Search Material {}", i),
                description: Some(format!("Search description {}", i)),
                material_type: MaterialType::Consumable,
                category: None,
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure:
                    crate::domains::inventory::domain::models::material::UnitOfMeasure::Piece,
                current_stock: 10.0,
                minimum_stock: Some(5.0),
                maximum_stock: Some(20.0),
                reorder_point: Some(8.0),
                unit_cost: Some(25.0),
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
                created_at: Utc::now().timestamp_millis(),
                updated_at: Utc::now().timestamp_millis(),
                created_by: None,
                updated_by: None,
                synced: false,
                last_synced_at: None,
            };
            repo.save(material).await.unwrap();
        }

        // Search materials
        let query = MaterialQuery {
            search: Some("Search".to_string()),
            ..Default::default()
        };

        let results = repo.search(query).await.unwrap();
        assert!(results.len() >= 3);
    }

    #[tokio::test]
    async fn test_cache_hit() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(Arc::clone(&db), Arc::clone(&cache));

        // Create test material
        let material = Material {
            id: "cache-test".to_string(),
            sku: "SKU-CACHE".to_string(),
            name: "Cache Test Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure:
                crate::domains::inventory::domain::models::material::UnitOfMeasure::Roll,
            current_stock: 10.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(100.0),
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
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };

        repo.save(material).await.unwrap();

        // First call - cache miss, hit database
        let _ = repo.find_by_id("cache-test".to_string()).await.unwrap();

        // Second call - cache hit
        let found = repo.find_by_id("cache-test".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Cache Test Material");
    }
}
