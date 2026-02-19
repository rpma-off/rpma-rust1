//! Property-based tests for Inventory Management System
//!
//! Uses proptest to test inventory operations with random inputs

use crate::db::Database;
use crate::models::material::{InventoryTransactionType, Material, MaterialType, UnitOfMeasure};
use crate::services::material::MaterialService;
use proptest::prelude::*;
use rusqlite::params;
use uuid::Uuid;

// Helper to create a test database with inventory tables
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Create inventory tables
    db.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS material_categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            code TEXT UNIQUE,
            parent_id TEXT,
            level INTEGER NOT NULL DEFAULT 1,
            description TEXT,
            color TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_by TEXT,
            updated_by TEXT,
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS materials (
            id TEXT PRIMARY KEY NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            material_type TEXT NOT NULL,
            category TEXT,
            subcategory TEXT,
            category_id TEXT,
            brand TEXT,
            model TEXT,
            specifications TEXT,
            unit_of_measure TEXT NOT NULL,
            current_stock REAL NOT NULL DEFAULT 0,
            minimum_stock REAL DEFAULT 0,
            maximum_stock REAL DEFAULT 0,
            reorder_point REAL DEFAULT 0,
            unit_cost REAL DEFAULT 0,
            currency TEXT DEFAULT 'EUR',
            supplier_id TEXT,
            supplier_name TEXT,
            supplier_sku TEXT,
            quality_grade TEXT,
            certification TEXT,
            expiry_date INTEGER,
            batch_number TEXT,
            storage_location TEXT,
            warehouse_id TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_by TEXT,
            updated_by TEXT,
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id TEXT PRIMARY KEY NOT NULL,
            material_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            previous_stock REAL NOT NULL,
            new_stock REAL NOT NULL,
            reference_number TEXT,
            reference_type TEXT,
            notes TEXT,
            unit_cost REAL,
            total_cost REAL,
            warehouse_id TEXT,
            location_from TEXT,
            location_to TEXT,
            batch_number TEXT,
            expiry_date INTEGER,
            quality_status TEXT,
            intervention_id TEXT,
            step_id TEXT,
            performed_by TEXT NOT NULL,
            performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER
        );
    "#,
    )
    .unwrap();

    db
}

// Strategy for generating valid SKUs
fn sku_strategy() -> impl Strategy<Value = String> {
    "[A-Z]{3}-[0-9]{3}"
}

// Strategy for generating valid material names
fn material_name_strategy() -> impl Strategy<Value = String> {
    "[a-zA-Z\\s]{5,50}"
}

// Strategy for generating valid material descriptions
fn material_description_strategy() -> impl Strategy<Value = Option<String>> {
    prop_oneof![Just(None), "[a-zA-Z0-9\\s\\.\\,]{10,200}".prop_map(Some)]
}

// Strategy for generating valid material types
fn material_type_strategy() -> impl Strategy<Value = MaterialType> {
    prop_oneof![
        Just(MaterialType::Film),
        Just(MaterialType::Adhesive),
        Just(MaterialType::Liquid),
        Just(MaterialType::Tool),
        Just(MaterialType::Consumable),
        Just(MaterialType::Equipment),
    ]
}

// Strategy for generating valid unit of measures
fn unit_of_measure_strategy() -> impl Strategy<Value = UnitOfMeasure> {
    prop_oneof![
        Just(UnitOfMeasure::Meter),
        Just(UnitOfMeasure::Centimeter),
        Just(UnitOfMeasure::Millimeter),
        Just(UnitOfMeasure::Liter),
        Just(UnitOfMeasure::Milliliter),
        Just(UnitOfMeasure::Gram),
        Just(UnitOfMeasure::Kilogram),
        Just(UnitOfMeasure::Piece),
        Just(UnitOfMeasure::Set),
        Just(UnitOfMeasure::Box),
    ]
}

// Strategy for generating valid stock quantities (0-10000)
fn stock_quantity_strategy() -> impl Strategy<Value = f64> {
    prop::num::f64::POSITIVE.prop_map(|v| v % 10000.0)
}

// Strategy for generating valid costs (0-10000)
fn cost_strategy() -> impl Strategy<Value = Option<f64>> {
    prop_oneof![
        Just(None),
        prop::num::f64::POSITIVE.prop_map(|v| Some(v % 10000.0))
    ]
}

// Strategy for generating valid currency codes
fn currency_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("EUR".to_string()),
        Just("USD".to_string()),
        Just("GBP".to_string()),
        Just("CHF".to_string()),
    ]
}

// Strategy for generating transaction types
fn transaction_type_strategy() -> impl Strategy<Value = InventoryTransactionType> {
    prop_oneof![
        Just(InventoryTransactionType::StockIn),
        Just(InventoryTransactionType::StockOut),
        Just(InventoryTransactionType::Adjustment),
        Just(InventoryTransactionType::Transfer),
        Just(InventoryTransactionType::Waste),
        Just(InventoryTransactionType::Return),
    ]
}

// Strategy for generating valid dates (today +/- 1 year)
fn date_strategy() -> impl Strategy<Value = Option<i64>> {
    let now = chrono::Utc::now();
    let year_ago = (now - chrono::Duration::days(365)).timestamp_millis();
    let year_ahead = (now + chrono::Duration::days(365)).timestamp_millis();

    prop_oneof![Just(None), (year_ago..=year_ahead).prop_map(Some)]
}

// Strategy for generating valid reference numbers
fn reference_number_strategy() -> impl Strategy<Value = Option<String>> {
    prop_oneof![Just(None), "[A-Z]{2,4}-[0-9]{4,8}".prop_map(Some)]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn test_create_material_with_random_valid_data(
        sku in sku_strategy(),
        name in material_name_strategy(),
        description in material_description_strategy(),
        material_type in material_type_strategy(),
        unit_of_measure in unit_of_measure_strategy(),
        current_stock in stock_quantity_strategy(),
        minimum_stock in stock_quantity_strategy(),
        maximum_stock in stock_quantity_strategy(),
        reorder_point in stock_quantity_strategy(),
        unit_cost in cost_strategy(),
        currency in currency_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = MaterialService::new(db);

            // Ensure max_stock >= min_stock and reorder_point <= max_stock
            let min_stock = minimum_stock.min(maximum_stock);
            let max_stock = maximum_stock.max(min_stock);
            let reorder = reorder_point.min(max_stock);

            // Create material with random valid data
            let request = crate::services::material::CreateMaterialRequest {
                sku: sku.clone(),
                name: name.clone(),
                description: description.clone(),
                material_type: material_type.clone(),
                category: None,
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure: unit_of_measure.clone(),
                minimum_stock: Some(min_stock),
                maximum_stock: Some(max_stock),
                reorder_point: Some(reorder),
                unit_cost: unit_cost,
                currency: Some(currency.clone()),
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

            let result = service.create_material(request, Some("user_test".to_string()));
            prop_assert!(result.is_ok(), "Should successfully create material with valid random data");

            let material = result.unwrap();
            prop_assert_eq!(material.sku, sku);
            prop_assert_eq!(material.name, name);
            prop_assert_eq!(material.description, description);
            prop_assert_eq!(material.material_type, material_type);
            prop_assert_eq!(material.unit_of_measure, unit_of_measure);
            prop_assert_eq!(material.minimum_stock, Some(min_stock));
            prop_assert_eq!(material.maximum_stock, Some(max_stock));
            prop_assert_eq!(material.reorder_point, Some(reorder));
            prop_assert_eq!(material.unit_cost, unit_cost);
            prop_assert_eq!(material.currency, currency);
        });
    }

    #[test]
    fn test_inventory_transaction_with_random_valid_data(
        transaction_type in transaction_type_strategy(),
        quantity in stock_quantity_strategy(),
        unit_cost in cost_strategy(),
        reference_number in reference_number_strategy(),
        notes in material_description_strategy(),
        batch_number in reference_number_strategy(),
        expiry_date in date_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = MaterialService::new(db);

            // Create a material first
            let material_request = crate::services::material::CreateMaterialRequest {
                sku: "MAT-PROPTEST".to_string(),
                name: "Property Test Material".to_string(),
                description: None,
                material_type: MaterialType::Film,
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
                unit_cost: Some(50.0),
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

            let material = service.create_material(material_request, Some("user_test".to_string())).unwrap();

            // Create inventory transaction with random valid data
            let transaction_request = crate::services::material::CreateInventoryTransactionRequest {
                material_id: material.id.clone(),
                transaction_type: transaction_type.clone(),
                quantity: quantity.clone(),
                reference_number: reference_number.clone(),
                reference_type: Some("test".to_string()),
                notes: notes.clone(),
                unit_cost: unit_cost.clone(),
                warehouse_id: Some("WH-TEST".to_string()),
                location_from: Some("LOC-FROM".to_string()),
                location_to: Some("LOC-TO".to_string()),
                batch_number: batch_number.clone(),
                expiry_date: expiry_date,
                quality_status: Some("approved".to_string()),
                intervention_id: Some("INT-TEST".to_string()),
                step_id: Some("STEP-TEST".to_string()),
            };

            let result = service.create_inventory_transaction(transaction_request, "user_test".to_string());
            prop_assert!(result.is_ok(), "Should successfully create transaction with valid random data");

            let transaction = result.unwrap();
            prop_assert_eq!(transaction.material_id, material.id);
            prop_assert_eq!(transaction.transaction_type, transaction_type);
            prop_assert_eq!(transaction.quantity, quantity);
            prop_assert_eq!(transaction.reference_number, reference_number);
            prop_assert_eq!(transaction.notes, notes);
            prop_assert_eq!(transaction.unit_cost, unit_cost);
            prop_assert_eq!(transaction.location_from, Some("LOC-FROM".to_string()));
            prop_assert_eq!(transaction.location_to, Some("LOC-TO".to_string()));
            prop_assert_eq!(transaction.batch_number, batch_number);
            prop_assert_eq!(transaction.intervention_id, Some("INT-TEST".to_string()));
            prop_assert_eq!(transaction.step_id, Some("STEP-TEST".to_string()));

            // Verify stock was updated appropriately based on transaction type
            let updated_material = service.get_material_by_id(&material.id).unwrap().unwrap();

            match transaction_type {
                InventoryTransactionType::StockIn | InventoryTransactionType::Adjustment => {
                    prop_assert_eq!(updated_material.current_stock, quantity);
                    prop_assert_eq!(transaction.previous_stock, 0.0);
                    prop_assert_eq!(transaction.new_stock, quantity);
                },
                InventoryTransactionType::StockOut | InventoryTransactionType::Waste | InventoryTransactionType::Return => {
                    prop_assert_eq!(updated_material.current_stock, quantity.max(0.0)); // Should not go negative
                    prop_assert_eq!(transaction.previous_stock, 0.0);
                    prop_assert_eq!(transaction.new_stock, quantity.max(0.0));
                },
                InventoryTransactionType::Transfer => {
                    prop_assert_eq!(updated_material.current_stock, quantity); // Transfer doesn't change total stock
                    prop_assert_eq!(transaction.previous_stock, 0.0);
                    prop_assert_eq!(transaction.new_stock, quantity);
                }
            }
        });
    }

    #[test]
    fn test_multiple_transactions_roundtrip(
        transaction_count in 1usize..=20usize
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = MaterialService::new(db);

            // Create a material
            let material_request = crate::services::material::CreateMaterialRequest {
                sku: "MAT-ROUNDTRIP".to_string(),
                name: "Roundtrip Test Material".to_string(),
                description: None,
                material_type: MaterialType::Film,
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

            let material = service.create_material(material_request, Some("user_test".to_string())).unwrap();

            // Create multiple transactions
            let mut expected_stock = 0.0;

            for i in 0..transaction_count {
                let is_stock_in = i % 2 == 0; // Alternate between stock in and out
                let quantity = (i as f64 + 1.0) * 10.0;

                let transaction_type = if is_stock_in {
                    InventoryTransactionType::StockIn
                } else {
                    InventoryTransactionType::StockOut
                };

                let transaction_request = crate::services::material::CreateInventoryTransactionRequest {
                    material_id: material.id.clone(),
                    transaction_type,
                    quantity,
                    reference_number: Some(format!("TX-{}", i)),
                    reference_type: Some("test".to_string()),
                    notes: None,
                    unit_cost: Some(25.0),
                    warehouse_id: None,
                    location_from: None,
                    location_to: None,
                    batch_number: Some(format!("BATCH-{}", i)),
                    expiry_date: None,
                    quality_status: None,
                    intervention_id: None,
                    step_id: None,
                };

                let result = service.create_inventory_transaction(transaction_request, "user_test".to_string());
                prop_assert!(result.is_ok(), "Transaction {} should succeed", i);

                if is_stock_in {
                    expected_stock += quantity;
                } else {
                    expected_stock = (expected_stock - quantity).max(0.0);
                }
            }

            // Verify final stock
            let final_material = service.get_material_by_id(&material.id).unwrap().unwrap();
            prop_assert!((final_material.current_stock - expected_stock).abs() < 0.01,
                "Final stock {} should match expected {}",
                final_material.current_stock, expected_stock);

            // Verify transaction history
            let transactions = service.get_material_transactions(&material.id, None).unwrap();
            prop_assert_eq!(transactions.len(), transaction_count);

            // Verify transaction sequence
            let mut running_stock = 0.0;
            for (i, transaction) in transactions.iter().enumerate() {
                if i % 2 == 0 { // Stock in
                    running_stock += transaction.quantity;
                } else { // Stock out
                    running_stock = (running_stock - transaction.quantity).max(0.0);
                }

                prop_assert_eq!(transaction.new_stock, running_stock,
                    "Transaction {} new_stock should match running stock",
                    i);
            }
        });
    }

    #[test]
    fn test_material_search_with_random_terms(
        materials_count in 10usize..=50usize,
        search_term_length in 1usize..=10usize
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = MaterialService::new(db);

            // Create materials with random names
            let mut material_names = Vec::new();
            for i in 0..materials_count {
                let name = format!("Material {} {}", i, "TestItem");
                material_names.push(name);

                let material_request = crate::services::material::CreateMaterialRequest {
                    sku: format!("MAT-SEARCH-{}", i),
                    name: material_names[i].clone(),
                    description: None,
                    material_type: MaterialType::Film,
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

                service.create_material(material_request, Some("user_test".to_string())).unwrap();
            }

            // Test search functionality
            let search_term = if search_term_length > 0 && material_names.len() > 0 {
                // Pick a random material and use part of its name for search
                let random_material = &material_names[search_term_length % material_names.len()];
                let chars: Vec<char> = random_material.chars().collect();
                if chars.len() >= search_term_length {
                    chars[0..search_term_length].iter().collect()
                } else {
                    random_material.clone()
                }
            } else {
                "TestItem".to_string()
            };

            let search_results = service.list_materials(
                None,
                None,
                Some(search_term.clone())
            ).unwrap();

            // Verify search results contain the search term
            for material in &search_results {
                prop_assert!(
                    material.name.to_lowercase().contains(&search_term.to_lowercase()) ||
                    material.sku.to_lowercase().contains(&search_term.to_lowercase()),
                    "Search result should contain search term"
                );
            }

            // If search term is "TestItem", should find all materials
            if search_term == "TestItem" {
                prop_assert_eq!(search_results.len(), materials_count);
            }
        });
    }

    #[test]
    fn test_stock_levels_boundary_conditions(
        initial_stock in stock_quantity_strategy(),
        transaction_quantity in stock_quantity_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = MaterialService::new(db);

            // Create a material
            let material_request = crate::services::material::CreateMaterialRequest {
                sku: "MAT-BOUNDARY".to_string(),
                name: "Boundary Test Material".to_string(),
                description: None,
                material_type: MaterialType::Film,
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

            let material = service.create_material(material_request, Some("user_test".to_string())).unwrap();

            // Stock in initial amount
            if initial_stock > 0.0 {
                let stock_in_request = crate::services::material::CreateInventoryTransactionRequest {
                    material_id: material.id.clone(),
                    transaction_type: InventoryTransactionType::StockIn,
                    quantity: initial_stock,
                    reference_number: Some("INITIAL-STOCK".to_string()),
                    reference_type: Some("test".to_string()),
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
                };

                service.create_inventory_transaction(stock_in_request, "user_test".to_string()).unwrap();
            }

            // Stock out transaction (could be larger than available stock)
            let stock_out_request = crate::services::material::CreateInventoryTransactionRequest {
                material_id: material.id.clone(),
                transaction_type: InventoryTransactionType::StockOut,
                quantity: transaction_quantity,
                reference_number: Some("BOUNDARY-TEST".to_string()),
                reference_type: Some("test".to_string()),
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
            };

            let result = service.create_inventory_transaction(stock_out_request, "user_test".to_string());

            // Transaction should succeed even if quantity exceeds available stock
            prop_assert!(result.is_ok(), "Stock out transaction should succeed");

            let transaction = result.unwrap();
            let final_material = service.get_material_by_id(&material.id).unwrap().unwrap();

            // Stock should not go negative
            prop_assert!(final_material.current_stock >= 0.0,
                "Final stock should not be negative");

            // If transaction quantity exceeds available stock, final stock should be 0
            if transaction_quantity > initial_stock {
                prop_assert_eq!(final_material.current_stock, 0.0,
                    "Final stock should be 0 when over-consumed");
                prop_assert_eq!(transaction.new_stock, 0.0,
                    "Transaction new_stock should be 0 when over-consumed");
            } else {
                let expected_stock = initial_stock - transaction_quantity;
                prop_assert!((final_material.current_stock - expected_stock).abs() < 0.01,
                    "Final stock should match expected calculation");
            }
        });
    }

    #[test]
    fn test_transaction_cost_calculation(
        unit_cost in cost_strategy(),
        quantity in stock_quantity_strategy()
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = MaterialService::new(db);

            // Create a material
            let material_request = crate::services::material::CreateMaterialRequest {
                sku: "MAT-COST".to_string(),
                name: "Cost Test Material".to_string(),
                description: None,
                material_type: MaterialType::Film,
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

            let material = service.create_material(material_request, Some("user_test".to_string())).unwrap();

            // Create transaction with cost
            let transaction_request = crate::services::material::CreateInventoryTransactionRequest {
                material_id: material.id.clone(),
                transaction_type: InventoryTransactionType::StockIn,
                quantity: quantity.clone(),
                reference_number: Some("COST-TEST".to_string()),
                reference_type: Some("test".to_string()),
                notes: None,
                unit_cost: unit_cost.clone(),
                warehouse_id: None,
                location_from: None,
                location_to: None,
                batch_number: None,
                expiry_date: None,
                quality_status: None,
                intervention_id: None,
                step_id: None,
            };

            let result = service.create_inventory_transaction(transaction_request, "user_test".to_string());
            prop_assert!(result.is_ok());

            let transaction = result.unwrap();

            // Verify cost calculation
            match unit_cost {
                Some(cost) => {
                    let expected_total = cost * quantity;
                    prop_assert!(transaction.total_cost.is_some(),
                        "Total cost should be set when unit cost is provided");
                    prop_assert!((transaction.total_cost.unwrap() - expected_total).abs() < 0.01,
                        "Total cost {} should equal unit cost {} * quantity {}",
                        transaction.total_cost.unwrap(), cost, quantity);
                },
                None => {
                    prop_assert!(transaction.total_cost.is_none(),
                        "Total cost should not be set when unit cost is not provided");
                }
            }
        });
    }
}
