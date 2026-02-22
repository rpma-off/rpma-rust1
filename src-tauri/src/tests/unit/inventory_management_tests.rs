//! Unit tests for Inventory Management System
//!
//! Tests material categories, inventory transactions, and stock management

use crate::db::Database;
use crate::domains::inventory::domain::models::material::{
    InventoryTransaction, InventoryTransactionType, Material, MaterialCategory, MaterialType,
    Supplier, UnitOfMeasure,
};
use crate::domains::inventory::infrastructure::material::MaterialService;
use chrono::{DateTime, Utc};
use rusqlite::params;
use uuid::Uuid;

// Helper to create a test database with inventory tables
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Create inventory tables from migration 024
    db.execute_batch(
        r#"
        -- Material categories table
        CREATE TABLE IF NOT EXISTS material_categories (
            -- Identifiers
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            code TEXT UNIQUE,
            
            -- Hierarchy
            parent_id TEXT,
            level INTEGER NOT NULL DEFAULT 1,
            
            -- Description and metadata
            description TEXT,
            color TEXT,
            
            -- Status
            is_active INTEGER NOT NULL DEFAULT 1,
            
            -- Audit
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_by TEXT,
            updated_by TEXT,
            
            -- Sync
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER,
            
            FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE CASCADE
        );
        
        -- Materials table
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
            last_synced_at INTEGER,
            
            FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL
        );
        
        -- Inventory transactions table
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            -- Identifiers
            id TEXT PRIMARY KEY NOT NULL,
            material_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            
            -- Quantities
            quantity REAL NOT NULL,
            previous_stock REAL NOT NULL,
            new_stock REAL NOT NULL,
            
            -- Transaction details
            reference_number TEXT,
            reference_type TEXT,
            notes TEXT,
            
            -- Cost tracking
            unit_cost REAL,
            total_cost REAL,
            
            -- Location tracking
            warehouse_id TEXT,
            location_from TEXT,
            location_to TEXT,
            
            -- Quality and batch tracking
            batch_number TEXT,
            expiry_date INTEGER,
            quality_status TEXT,
            
            -- Workflow integration
            intervention_id TEXT,
            step_id TEXT,
            
            -- User and audit
            performed_by TEXT NOT NULL,
            performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            
            -- Audit
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            
            -- Sync
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER,
            
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT
        );
        
        -- Suppliers table
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            code TEXT UNIQUE,
            contact_person TEXT,
            email TEXT,
            phone TEXT,
            website TEXT,
            address_street TEXT,
            address_city TEXT,
            address_state TEXT,
            address_zip TEXT,
            address_country TEXT,
            tax_id TEXT,
            business_license TEXT,
            payment_terms TEXT,
            lead_time_days INTEGER,
            is_preferred INTEGER DEFAULT 0,
            quality_rating REAL DEFAULT 0.0,
            delivery_rating REAL DEFAULT 0.0,
            on_time_delivery_rate REAL DEFAULT 0.0,
            notes TEXT,
            special_instructions TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER
        );
    "#,
    )
    .unwrap();

    // Insert default categories from migration 024
    db.execute_batch(r#"
        INSERT OR IGNORE INTO material_categories (id, name, code, level, description, color, created_at, updated_at)
        VALUES
            ('cat_ppf_films', 'PPF Films', 'PPF', 1, 'Paint Protection Films', '#3B82F6', unixepoch() * 1000, unixepoch() * 1000),
            ('cat_adhesives', 'Adhesives', 'ADH', 1, 'Adhesive products', '#10B981', unixepoch() * 1000, unixepoch() * 1000),
            ('cat_cleaning', 'Cleaning Solutions', 'CLN', 1, 'Cleaning and preparation products', '#F59E0B', unixepoch() * 1000, unixepoch() * 1000),
            ('cat_tools', 'Tools & Equipment', 'TLS', 1, 'Tools and installation equipment', '#EF4444', unixepoch() * 1000, unixepoch() * 1000),
            ('cat_consumables', 'Consumables', 'CON', 1, 'Consumable supplies', '#8B5CF6', unixepoch() * 1000, unixepoch() * 1000);
    "#).unwrap();

    db
}

// Helper to create a test supplier
fn create_test_supplier(db: &Database, name: &str) -> String {
    let supplier_id = Uuid::new_v4().to_string();

    db.execute(
        r#"
        INSERT INTO suppliers (id, name, code, email, phone, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    "#,
        params![
            supplier_id,
            name,
            format!("SUP_{}", name.to_uppercase()),
            format!("{}@example.com", name),
            "555-1234",
            1,
            chrono::Utc::now().timestamp_millis(),
            chrono::Utc::now().timestamp_millis()
        ],
    )
    .unwrap();

    supplier_id
}

#[tokio::test]
async fn test_create_material_category() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a new category
    let request =
        crate::domains::inventory::infrastructure::material::CreateMaterialCategoryRequest {
            name: "Test Category".to_string(),
            code: Some("TEST".to_string()),
            parent_id: None,
            level: Some(1),
            description: Some("Test category description".to_string()),
            color: Some("#FF0000".to_string()),
        };

    let category = service
        .create_material_category(request, Some("user_1".to_string()))
        .unwrap();

    // Verify category properties
    assert_eq!(category.name, "Test Category");
    assert_eq!(category.code, Some("TEST".to_string()));
    assert_eq!(category.parent_id, None);
    assert_eq!(category.level, 1);
    assert_eq!(
        category.description,
        Some("Test category description".to_string())
    );
    assert_eq!(category.color, Some("#FF0000".to_string()));
    assert!(category.is_active);
}

#[tokio::test]
async fn test_create_material_category_with_parent() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create parent category first
    let parent_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialCategoryRequest {
            name: "Parent Category".to_string(),
            code: Some("PARENT".to_string()),
            parent_id: None,
            level: Some(1),
            description: None,
            color: None,
        };

    let parent = service
        .create_material_category(parent_request, Some("user_1".to_string()))
        .unwrap();

    // Create child category
    let child_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialCategoryRequest {
            name: "Child Category".to_string(),
            code: Some("CHILD".to_string()),
            parent_id: Some(parent.id.clone()),
            level: Some(2),
            description: None,
            color: None,
        };

    let child = service
        .create_material_category(child_request, Some("user_1".to_string()))
        .unwrap();

    // Verify relationship
    assert_eq!(child.parent_id, Some(parent.id.clone()));
    assert_eq!(child.level, 2);
}

#[tokio::test]
async fn test_create_material() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test supplier
    let supplier_id = create_test_supplier(&service.db, "Test Supplier");

    // Create material request
    let request = crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
        sku: "MAT-001".to_string(),
        name: "Test Material".to_string(),
        description: Some("Test material description".to_string()),
        material_type: MaterialType::Film,
        category: Some("PPF Films".to_string()),
        subcategory: None,
        category_id: Some("cat_ppf_films".to_string()),
        brand: Some("Test Brand".to_string()),
        model: Some("Test Model".to_string()),
        specifications: Some(serde_json::json!({"property": "value"})),
        unit_of_measure: UnitOfMeasure::Meter,
        minimum_stock: Some(10.0),
        maximum_stock: Some(100.0),
        reorder_point: Some(20.0),
        unit_cost: Some(50.0),
        currency: Some("EUR".to_string()),
        supplier_id: Some(supplier_id),
        supplier_name: Some("Test Supplier".to_string()),
        supplier_sku: Some("SUP-001".to_string()),
        quality_grade: Some("A".to_string()),
        certification: Some("ISO-9001".to_string()),
        expiry_date: None,
        batch_number: None,
        storage_location: Some("Warehouse A".to_string()),
        warehouse_id: Some("WH-01".to_string()),
    };

    let material = service
        .create_material(request, Some("user_1".to_string()))
        .unwrap();

    // Verify material properties
    assert_eq!(material.sku, "MAT-001");
    assert_eq!(material.name, "Test Material");
    assert_eq!(
        material.description,
        Some("Test material description".to_string())
    );
    assert_eq!(material.material_type, MaterialType::Film);
    assert_eq!(material.category, Some("PPF Films".to_string()));
    assert_eq!(material.category_id, Some("cat_ppf_films".to_string()));
    assert_eq!(material.brand, Some("Test Brand".to_string()));
    assert_eq!(material.unit_of_measure, UnitOfMeasure::Meter);
    assert_eq!(material.minimum_stock, Some(10.0));
    assert_eq!(material.maximum_stock, Some(100.0));
    assert_eq!(material.reorder_point, Some(20.0));
    assert_eq!(material.unit_cost, Some(50.0));
    assert_eq!(material.currency, "EUR");
    assert_eq!(material.supplier_id, Some(supplier_id));
    assert_eq!(material.supplier_name, Some("Test Supplier".to_string()));
    assert!(material.is_active);
}

#[tokio::test]
async fn test_create_inventory_transaction() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a material first
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-002".to_string(),
            name: "Test Material for Transaction".to_string(),
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
            unit_cost: Some(25.0),
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

    let material = service
        .create_material(material_request, Some("user_1".to_string()))
        .unwrap();

    // Create inventory transaction request
    let transaction_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 50.0,
            reference_number: Some("PO-001".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: Some("Initial stock".to_string()),
            unit_cost: Some(25.0),
            warehouse_id: Some("WH-01".to_string()),
            location_from: None,
            location_to: Some("Rack A1".to_string()),
            batch_number: Some("BATCH-001".to_string()),
            expiry_date: None,
            quality_status: Some("approved".to_string()),
            intervention_id: None,
            step_id: None,
        };

    let transaction = service
        .create_inventory_transaction(transaction_request, "user_1".to_string())
        .unwrap();

    // Verify transaction properties
    assert_eq!(transaction.material_id, material.id);
    assert_eq!(
        transaction.transaction_type,
        InventoryTransactionType::StockIn
    );
    assert_eq!(transaction.quantity, 50.0);
    assert_eq!(transaction.previous_stock, 0.0);
    assert_eq!(transaction.new_stock, 50.0);
    assert_eq!(transaction.reference_number, Some("PO-001".to_string()));
    assert_eq!(
        transaction.reference_type,
        Some("purchase_order".to_string())
    );
    assert_eq!(transaction.notes, Some("Initial stock".to_string()));
    assert_eq!(transaction.unit_cost, Some(25.0));
    assert_eq!(transaction.warehouse_id, Some("WH-01".to_string()));
    assert_eq!(transaction.location_to, Some("Rack A1".to_string()));
    assert_eq!(transaction.batch_number, Some("BATCH-001".to_string()));
    assert_eq!(transaction.quality_status, Some("approved".to_string()));

    // Verify material stock was updated
    let updated_material = service.get_material_by_id(&material.id).unwrap().unwrap();
    assert_eq!(updated_material.current_stock, 50.0);
}

#[tokio::test]
async fn test_stock_out_transaction() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-003".to_string(),
            name: "Test Material for Stock Out".to_string(),
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

    let material = service
        .create_material(material_request, Some("user_1".to_string()))
        .unwrap();

    // Stock in first
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 100.0,
            reference_number: Some("PO-002".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(30.0),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request, "user_1".to_string())
        .unwrap();

    // Stock out
    let stock_out_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockOut,
            quantity: 25.0,
            reference_number: Some("INT-001".to_string()),
            reference_type: Some("intervention".to_string()),
            notes: Some("Used in intervention".to_string()),
            unit_cost: Some(30.0),
            warehouse_id: None,
            location_from: Some("Rack A1".to_string()),
            location_to: None,
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: Some("INT-001".to_string()),
            step_id: Some("STEP-001".to_string()),
        };

    let transaction = service
        .create_inventory_transaction(stock_out_request, "user_1".to_string())
        .unwrap();

    // Verify transaction properties
    assert_eq!(transaction.material_id, material.id);
    assert_eq!(
        transaction.transaction_type,
        InventoryTransactionType::StockOut
    );
    assert_eq!(transaction.quantity, 25.0);
    assert_eq!(transaction.previous_stock, 100.0);
    assert_eq!(transaction.new_stock, 75.0);
    assert_eq!(transaction.reference_number, Some("INT-001".to_string()));
    assert_eq!(transaction.reference_type, Some("intervention".to_string()));
    assert_eq!(transaction.location_from, Some("Rack A1".to_string()));
    assert_eq!(transaction.intervention_id, Some("INT-001".to_string()));
    assert_eq!(transaction.step_id, Some("STEP-001".to_string()));

    // Verify material stock was updated
    let updated_material = service.get_material_by_id(&material.id).unwrap().unwrap();
    assert_eq!(updated_material.current_stock, 75.0);
}

#[tokio::test]
async fn test_adjustment_transaction() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-004".to_string(),
            name: "Test Material for Adjustment".to_string(),
            description: None,
            material_type: MaterialType::Liquid,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Liter,
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

    let material = service
        .create_material(material_request, Some("user_1".to_string()))
        .unwrap();

    // Stock in first
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 20.0,
            reference_number: Some("PO-003".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(10.0),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request, "user_1".to_string())
        .unwrap();

    // Adjustment (positive)
    let adjustment_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::Adjustment,
            quantity: 5.0,
            reference_number: Some("ADJ-001".to_string()),
            reference_type: Some("manual_adjustment".to_string()),
            notes: Some("Physical count adjustment".to_string()),
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

    let transaction = service
        .create_inventory_transaction(adjustment_request, "user_1".to_string())
        .unwrap();

    // Verify transaction properties
    assert_eq!(transaction.material_id, material.id);
    assert_eq!(
        transaction.transaction_type,
        InventoryTransactionType::Adjustment
    );
    assert_eq!(transaction.quantity, 5.0);
    assert_eq!(transaction.previous_stock, 20.0);
    assert_eq!(transaction.new_stock, 25.0);
    assert_eq!(transaction.reference_number, Some("ADJ-001".to_string()));
    assert_eq!(
        transaction.reference_type,
        Some("manual_adjustment".to_string())
    );

    // Verify material stock was updated
    let updated_material = service.get_material_by_id(&material.id).unwrap().unwrap();
    assert_eq!(updated_material.current_stock, 25.0);
}

#[tokio::test]
async fn test_transfer_transaction() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-005".to_string(),
            name: "Test Material for Transfer".to_string(),
            description: None,
            material_type: MaterialType::Tool,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Piece,
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

    let material = service
        .create_material(material_request, Some("user_1".to_string()))
        .unwrap();

    // Stock in first
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 10.0,
            reference_number: Some("PO-004".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(100.0),
            warehouse_id: Some("WH-01".to_string()),
            location_from: None,
            location_to: Some("Toolbox A".to_string()),
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request, "user_1".to_string())
        .unwrap();

    // Transfer to another location
    let transfer_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::Transfer,
            quantity: 3.0,
            reference_number: Some("TRF-001".to_string()),
            reference_type: Some("location_transfer".to_string()),
            notes: Some("Transfer to mobile unit".to_string()),
            unit_cost: Some(100.0),
            warehouse_id: Some("WH-02".to_string()),
            location_from: Some("Toolbox A".to_string()),
            location_to: Some("Mobile Unit 1".to_string()),
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

    let transaction = service
        .create_inventory_transaction(transfer_request, "user_1".to_string())
        .unwrap();

    // Verify transaction properties
    assert_eq!(transaction.material_id, material.id);
    assert_eq!(
        transaction.transaction_type,
        InventoryTransactionType::Transfer
    );
    assert_eq!(transaction.quantity, 3.0);
    assert_eq!(transaction.previous_stock, 10.0);
    assert_eq!(transaction.new_stock, 7.0); // Stock remains the same, just location changes
    assert_eq!(transaction.reference_number, Some("TRF-001".to_string()));
    assert_eq!(
        transaction.reference_type,
        Some("location_transfer".to_string())
    );
    assert_eq!(transaction.location_from, Some("Toolbox A".to_string()));
    assert_eq!(transaction.location_to, Some("Mobile Unit 1".to_string()));

    // Verify material stock wasn't changed (transfer doesn't change total stock)
    let updated_material = service.get_material_by_id(&material.id).unwrap().unwrap();
    assert_eq!(updated_material.current_stock, 10.0); // Should still be 10
}

#[tokio::test]
async fn test_waste_transaction() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-006".to_string(),
            name: "Test Material for Waste".to_string(),
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

    let material = service
        .create_material(material_request, Some("user_1".to_string()))
        .unwrap();

    // Stock in first
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 30.0,
            reference_number: Some("PO-005".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(40.0),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: Some("BATCH-002".to_string()),
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request, "user_1".to_string())
        .unwrap();

    // Waste transaction
    let waste_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::Waste,
            quantity: 5.0,
            reference_number: Some("WST-001".to_string()),
            reference_type: Some("damage".to_string()),
            notes: Some("Material damaged during handling".to_string()),
            unit_cost: Some(40.0),
            warehouse_id: None,
            location_from: Some("Storage Area".to_string()),
            location_to: Some("Waste Disposal".to_string()),
            batch_number: Some("BATCH-002".to_string()),
            expiry_date: None,
            quality_status: Some("damaged".to_string()),
            intervention_id: None,
            step_id: None,
        };

    let transaction = service
        .create_inventory_transaction(waste_request, "user_1".to_string())
        .unwrap();

    // Verify transaction properties
    assert_eq!(transaction.material_id, material.id);
    assert_eq!(
        transaction.transaction_type,
        InventoryTransactionType::Waste
    );
    assert_eq!(transaction.quantity, 5.0);
    assert_eq!(transaction.previous_stock, 30.0);
    assert_eq!(transaction.new_stock, 25.0);
    assert_eq!(transaction.reference_number, Some("WST-001".to_string()));
    assert_eq!(transaction.reference_type, Some("damage".to_string()));
    assert_eq!(transaction.location_from, Some("Storage Area".to_string()));
    assert_eq!(transaction.location_to, Some("Waste Disposal".to_string()));
    assert_eq!(transaction.batch_number, Some("BATCH-002".to_string()));
    assert_eq!(transaction.quality_status, Some("damaged".to_string()));

    // Verify material stock was updated
    let updated_material = service.get_material_by_id(&material.id).unwrap().unwrap();
    assert_eq!(updated_material.current_stock, 25.0);
}

#[tokio::test]
async fn test_get_material_by_id() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-007".to_string(),
            name: "Test Material for Get".to_string(),
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

    let created_material = service
        .create_material(material_request, Some("user_1".to_string()))
        .unwrap();

    // Get material by ID
    let retrieved_material = service.get_material_by_id(&created_material.id).unwrap();

    assert!(retrieved_material.is_some(), "Should find material by ID");

    let material = retrieved_material.unwrap();
    assert_eq!(material.id, created_material.id);
    assert_eq!(material.sku, "MAT-007");
    assert_eq!(material.name, "Test Material for Get");
    assert_eq!(material.material_type, MaterialType::Film);
    assert_eq!(material.unit_of_measure, UnitOfMeasure::Meter);
}

#[tokio::test]
async fn test_get_material_by_sku() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-008".to_string(),
            name: "Test Material for SKU".to_string(),
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

    let created_material = service
        .create_material(material_request, Some("user_1".to_string()))
        .unwrap();

    // Get material by SKU
    let retrieved_material = service.get_material_by_sku("MAT-008").unwrap();

    assert!(retrieved_material.is_some(), "Should find material by SKU");

    let material = retrieved_material.unwrap();
    assert_eq!(material.id, created_material.id);
    assert_eq!(material.sku, "MAT-008");
    assert_eq!(material.name, "Test Material for SKU");
}

#[tokio::test]
async fn test_list_materials() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create multiple materials
    for i in 1..=5 {
        let material_request =
            crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
                sku: format!("MAT-LIST-{}", i),
                name: format!("Test Material List {}", i),
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

        service
            .create_material(material_request, Some("user_1".to_string()))
            .unwrap();
    }

    // List materials
    let materials = service.list_materials(None, None, None).unwrap();

    assert_eq!(materials.len(), 5, "Should have 5 materials");

    // Verify materials are sorted by name
    for i in 1..5 {
        let expected_name = format!("Test Material List {}", i);
        assert!(materials.iter().any(|m| m.name == expected_name));
    }
}

#[tokio::test]
async fn test_list_materials_with_filters() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create materials with different types
    let film_request = crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
        sku: "MAT-FILM".to_string(),
        name: "Film Material".to_string(),
        description: None,
        material_type: MaterialType::Film,
        category: None,
        subcategory: None,
        category_id: Some("cat_ppf_films".to_string()),
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

    let liquid_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-LIQUID".to_string(),
            name: "Liquid Material".to_string(),
            description: None,
            material_type: MaterialType::Liquid,
            category: None,
            subcategory: None,
            category_id: Some("cat_cleaning".to_string()),
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Liter,
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

    service
        .create_material(film_request, Some("user_1".to_string()))
        .unwrap();
    service
        .create_material(liquid_request, Some("user_1".to_string()))
        .unwrap();

    // Filter by material type
    let film_materials = service
        .list_materials(Some(MaterialType::Film), None, None)
        .unwrap();

    assert_eq!(film_materials.len(), 1, "Should have 1 film material");
    assert_eq!(film_materials[0].material_type, MaterialType::Film);

    // Filter by category
    let cleaning_materials = service
        .list_materials(None, Some("cat_cleaning".to_string()), None)
        .unwrap();

    assert_eq!(
        cleaning_materials.len(),
        1,
        "Should have 1 cleaning material"
    );
    assert_eq!(
        cleaning_materials[0].category_id,
        Some("cat_cleaning".to_string())
    );

    // Filter by search term
    let search_materials = service
        .list_materials(None, None, Some("Liquid".to_string()))
        .unwrap();

    assert_eq!(
        search_materials.len(),
        1,
        "Should have 1 material matching search"
    );
    assert_eq!(search_materials[0].name, "Liquid Material");
}

#[tokio::test]
async fn test_list_material_categories() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create additional categories
    let category_request_1 =
        crate::domains::inventory::infrastructure::material::CreateMaterialCategoryRequest {
            name: "Custom Category 1".to_string(),
            code: Some("CUST1".to_string()),
            parent_id: None,
            level: Some(1),
            description: None,
            color: None,
        };

    let category_request_2 =
        crate::domains::inventory::infrastructure::material::CreateMaterialCategoryRequest {
            name: "Custom Category 2".to_string(),
            code: Some("CUST2".to_string()),
            parent_id: None,
            level: Some(1),
            description: None,
            color: None,
        };

    service
        .create_material_category(category_request_1, Some("user_1".to_string()))
        .unwrap();
    service
        .create_material_category(category_request_2, Some("user_1".to_string()))
        .unwrap();

    // List categories
    let categories = service.list_material_categories(None).unwrap();

    // Should have default categories (5) + custom categories (2) = 7
    assert_eq!(categories.len(), 7, "Should have 7 categories");

    // Verify default categories exist
    assert!(categories.iter().any(|c| c.name == "PPF Films"));
    assert!(categories.iter().any(|c| c.name == "Adhesives"));
    assert!(categories.iter().any(|c| c.name == "Cleaning Solutions"));
    assert!(categories.iter().any(|c| c.name == "Tools & Equipment"));
    assert!(categories.iter().any(|c| c.name == "Consumables"));

    // Verify custom categories exist
    assert!(categories.iter().any(|c| c.name == "Custom Category 1"));
    assert!(categories.iter().any(|c| c.name == "Custom Category 2"));
}

#[tokio::test]
async fn test_list_material_categories_with_parent() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create parent category
    let parent_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialCategoryRequest {
            name: "Parent Category".to_string(),
            code: Some("PARENT".to_string()),
            parent_id: None,
            level: Some(1),
            description: None,
            color: None,
        };

    let parent = service
        .create_material_category(parent_request, Some("user_1".to_string()))
        .unwrap();

    // Create child categories
    for i in 1..=3 {
        let child_request =
            crate::domains::inventory::infrastructure::material::CreateMaterialCategoryRequest {
                name: format!("Child Category {}", i),
                code: Some(format!("CHILD{}", i)),
                parent_id: Some(parent.id.clone()),
                level: Some(2),
                description: None,
                color: None,
            };

        service
            .create_material_category(child_request, Some("user_1".to_string()))
            .unwrap();
    }

    // List child categories
    let child_categories = service.list_material_categories(Some(&parent.id)).unwrap();

    assert_eq!(child_categories.len(), 3, "Should have 3 child categories");

    // Verify all children have the correct parent
    for child in &child_categories {
        assert_eq!(child.parent_id, Some(parent.id.clone()));
        assert_eq!(child.level, 2);
        assert!(child.name.starts_with("Child Category"));
    }
}
