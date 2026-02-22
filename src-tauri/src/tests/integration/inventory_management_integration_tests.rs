//! Integration tests for Inventory Management System
//!
//! Tests inventory operations with material service integration and business logic

use crate::db::Database;
use crate::domains::inventory::domain::models::material::{
    InventoryTransaction, InventoryTransactionType, Material, MaterialCategory, MaterialType,
    UnitOfMeasure,
};
use crate::domains::inventory::infrastructure::material::MaterialService;
use chrono::{DateTime, Utc};
use rusqlite::params;
use std::sync::Arc;
use uuid::Uuid;

// Helper to create a test database with full schema
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Load migration 024 for inventory management
    let migration_sql = r#"
        -- Users table for testing
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            role TEXT DEFAULT 'user',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            deleted_at INTEGER
        );
        
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
            
            FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
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
            
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
            FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
        );
        
        -- Material consumption table
        CREATE TABLE IF NOT EXISTS material_consumption (
            id TEXT PRIMARY KEY NOT NULL,
            intervention_id TEXT NOT NULL,
            material_id TEXT NOT NULL,
            step_id TEXT,
            step_number INTEGER,
            quantity_used REAL NOT NULL DEFAULT 0,
            waste_quantity REAL DEFAULT 0,
            waste_reason TEXT,
            batch_used TEXT,
            quality_notes TEXT,
            recorded_by TEXT,
            recorded_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER,
            
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
            FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
        );
        
        -- Interventions table for testing
        CREATE TABLE IF NOT EXISTS interventions (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            completed_at INTEGER
        );
        
        -- Intervention steps table for testing
        CREATE TABLE IF NOT EXISTS intervention_steps (
            id TEXT PRIMARY KEY,
            intervention_id TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE
        );
    "#;

    db.execute_batch(migration_sql).unwrap();

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

// Helper to create a test user
fn create_test_user(db: &Database, user_id: &str, email: &str) {
    db.execute(r#"
        INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#, params![
        user_id,
        email,
        email.split('@').next().unwrap_or("user"),
        "hashed_password",
        "Test",
        "User",
        "technician",
        1,
        chrono::Utc::now().timestamp_millis(),
        chrono::Utc::now().timestamp_millis()
    ]).unwrap();
}

// Helper to create a test intervention
fn create_test_intervention(db: &Database, intervention_id: &str, title: &str) {
    db.execute(
        r#"
        INSERT INTO interventions (id, client_id, title, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    "#,
        params![
            intervention_id,
            "client_1",
            title,
            "in_progress",
            chrono::Utc::now().timestamp_millis(),
            chrono::Utc::now().timestamp_millis()
        ],
    )
    .unwrap();
}

// Helper to create a test intervention step
fn create_test_intervention_step(db: &Database, step_id: &str, intervention_id: &str, name: &str) {
    db.execute(
        r#"
        INSERT INTO intervention_steps (id, intervention_id, name, status, created_at)
        VALUES (?, ?, ?, ?, ?)
    "#,
        params![
            step_id,
            intervention_id,
            name,
            "pending",
            chrono::Utc::now().timestamp_millis()
        ],
    )
    .unwrap();
}

#[tokio::test]
async fn test_inventory_end_to_end_workflow() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test user
    let user_id = "user_test_1";
    create_test_user(&service.db, user_id, "test1@example.com");

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-WORKFLOW".to_string(),
            name: "Test Workflow Material".to_string(),
            description: Some("Material for workflow testing".to_string()),
            material_type: MaterialType::Film,
            category: Some("PPF Films".to_string()),
            subcategory: None,
            category_id: Some("cat_ppf_films".to_string()),
            brand: Some("Test Brand".to_string()),
            model: Some("Test Model".to_string()),
            specifications: Some(serde_json::json!({"property": "value"})),
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(20.0),
            maximum_stock: Some(200.0),
            reorder_point: Some(50.0),
            unit_cost: Some(75.0),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: Some("A".to_string()),
            certification: Some("ISO-9001".to_string()),
            expiry_date: None,
            batch_number: None,
            storage_location: Some("Warehouse A".to_string()),
            warehouse_id: Some("WH-01".to_string()),
        };

    let material = service
        .create_material(material_request, Some(user_id.to_string()))
        .unwrap();
    assert_eq!(material.current_stock, 0.0);

    // Stock in
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 100.0,
            reference_number: Some("PO-WORKFLOW".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: Some("Initial stock for workflow".to_string()),
            unit_cost: Some(75.0),
            warehouse_id: Some("WH-01".to_string()),
            location_from: None,
            location_to: Some("Rack A1".to_string()),
            batch_number: Some("BATCH-WF-001".to_string()),
            expiry_date: None,
            quality_status: Some("approved".to_string()),
            intervention_id: None,
            step_id: None,
        };

    let stock_in_tx = service
        .create_inventory_transaction(stock_in_request, user_id.to_string())
        .unwrap();
    assert_eq!(stock_in_tx.quantity, 100.0);
    assert_eq!(stock_in_tx.new_stock, 100.0);

    // Verify material stock was updated
    let updated_material = service.get_material_by_id(&material.id).unwrap().unwrap();
    assert_eq!(updated_material.current_stock, 100.0);

    // Create intervention and step for consumption
    let intervention_id = "int_workflow_1";
    let step_id = "step_workflow_1";

    create_test_intervention(&service.db, intervention_id, "Test Intervention");
    create_test_intervention_step(&service.db, step_id, intervention_id, "Test Step");

    // Record material consumption
    let consumption_request =
        crate::domains::inventory::infrastructure::material::RecordConsumptionRequest {
            intervention_id: intervention_id.to_string(),
            material_id: material.id.clone(),
            step_id: Some(step_id.to_string()),
            step_number: Some(1),
            quantity_used: 25.0,
            waste_quantity: Some(2.0),
            waste_reason: Some("Trim waste".to_string()),
            batch_used: Some("BATCH-WF-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some(user_id.to_string()),
        };

    service
        .record_material_consumption(consumption_request)
        .unwrap();

    // Verify material stock was reduced
    let consumed_material = service.get_material_by_id(&material.id).unwrap().unwrap();
    assert_eq!(consumed_material.current_stock, 75.0); // 100 - 25 = 75

    // Get transaction history
    let transactions = service
        .get_material_transactions(&material.id, None)
        .unwrap();

    assert_eq!(transactions.len(), 2); // Stock in + Consumption
    assert_eq!(
        transactions[0].transaction_type,
        InventoryTransactionType::StockIn
    );
    assert_eq!(transactions[0].quantity, 100.0);
    assert_eq!(transactions[0].new_stock, 100.0);

    // The second transaction should be stock out from consumption
    assert_eq!(
        transactions[1].transaction_type,
        InventoryTransactionType::StockOut
    );
    assert_eq!(transactions[1].quantity, 25.0);
    assert_eq!(transactions[1].new_stock, 75.0);
}

#[tokio::test]
async fn test_reorder_point_and_stock_levels() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test user
    let user_id = "user_test_2";
    create_test_user(&service.db, user_id, "test2@example.com");

    // Create a material with reorder point
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-REORDER".to_string(),
            name: "Test Reorder Material".to_string(),
            description: None,
            material_type: MaterialType::Film,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(10.0),
            maximum_stock: Some(100.0),
            reorder_point: Some(25.0),
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

    let material = service
        .create_material(material_request, Some(user_id.to_string()))
        .unwrap();

    // Stock in
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 30.0,
            reference_number: Some("PO-REORDER".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(50.0),
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
        .create_inventory_transaction(stock_in_request, user_id.to_string())
        .unwrap();

    // Check if material needs reordering (should be above reorder point)
    let needs_reorder = service.check_material_needs_reorder(&material.id).unwrap();
    assert!(!needs_reorder, "Should not need reorder yet");

    // Consume material down to reorder point
    let consumption_request =
        crate::domains::inventory::infrastructure::material::RecordConsumptionRequest {
            intervention_id: "int_reorder_1".to_string(),
            material_id: material.id.clone(),
            step_id: None,
            step_number: None,
            quantity_used: 5.5, // 30 - 5.5 = 24.5, below reorder point
            waste_quantity: None,
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some(user_id.to_string()),
        };

    service
        .record_material_consumption(consumption_request)
        .unwrap();

    // Check if material needs reordering now (should be below reorder point)
    let needs_reorder = service.check_material_needs_reorder(&material.id).unwrap();
    assert!(needs_reorder, "Should need reorder now");

    // Get materials that need reordering
    let reorder_list = service.get_materials_needing_reorder().unwrap();
    assert_eq!(
        reorder_list.len(),
        1,
        "Should have 1 material needing reorder"
    );
    assert_eq!(reorder_list[0].id, material.id);
}

#[tokio::test]
async fn test_batch_number_tracking() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test user
    let user_id = "user_test_3";
    create_test_user(&service.db, user_id, "test3@example.com");

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-BATCH".to_string(),
            name: "Test Batch Material".to_string(),
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
        .create_material(material_request, Some(user_id.to_string()))
        .unwrap();

    // Stock in with batch number
    let batch_number = "BATCH-2023-001";
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 50.0,
            reference_number: Some("PO-BATCH".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(60.0),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: Some(batch_number.to_string()),
            expiry_date: Some((Utc::now() + chrono::Duration::days(365)).timestamp_millis()),
            quality_status: Some("approved".to_string()),
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request, user_id.to_string())
        .unwrap();

    // Get inventory history for this material
    let transactions = service
        .get_material_transactions(&material.id, None)
        .unwrap();
    assert_eq!(transactions.len(), 1);

    let transaction = &transactions[0];
    assert_eq!(transaction.batch_number, Some(batch_number.to_string()));
    assert!(transaction.expiry_date.is_some());
    assert_eq!(transaction.quality_status, Some("approved".to_string()));

    // Consume from this batch
    let consumption_request =
        crate::domains::inventory::infrastructure::material::RecordConsumptionRequest {
            intervention_id: "int_batch_1".to_string(),
            material_id: material.id.clone(),
            step_id: None,
            step_number: None,
            quantity_used: 10.0,
            waste_quantity: None,
            waste_reason: None,
            batch_used: Some(batch_number.to_string()),
            quality_notes: Some("Batch quality is good".to_string()),
            recorded_by: Some(user_id.to_string()),
        };

    service
        .record_material_consumption(consumption_request)
        .unwrap();

    // Get consumption records for this material
    let consumption_records = service
        .get_material_consumption(&material.id, None)
        .unwrap();
    assert_eq!(consumption_records.len(), 1);

    let consumption = &consumption_records[0];
    assert_eq!(consumption.batch_used, Some(batch_number.to_string()));
    assert_eq!(consumption.quantity_used, 10.0);
}

#[tokio::test]
async fn test_material_location_tracking() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test user
    let user_id = "user_test_4";
    create_test_user(&service.db, user_id, "test4@example.com");

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-LOCATION".to_string(),
            name: "Test Location Material".to_string(),
            description: None,
            material_type: MaterialType::Tool,
            category: None,
            subcategory: None,
            category_id: Some("cat_tools".to_string()),
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Piece,
            minimum_stock: None,
            maximum_stock: None,
            reorder_point: None,
            unit_cost: Some(150.0),
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
        .create_material(material_request, Some(user_id.to_string()))
        .unwrap();

    // Stock in to warehouse A, location 1
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 5.0,
            reference_number: Some("PO-LOC-A".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(150.0),
            warehouse_id: Some("WH-A".to_string()),
            location_from: None,
            location_to: Some("Location A1".to_string()),
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request, user_id.to_string())
        .unwrap();

    // Transfer to warehouse B, location 2
    let transfer_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::Transfer,
            quantity: 2.0,
            reference_number: Some("TRF-A-B".to_string()),
            reference_type: Some("location_transfer".to_string()),
            notes: Some("Transfer to mobile unit".to_string()),
            unit_cost: Some(150.0),
            warehouse_id: Some("WH-B".to_string()),
            location_from: Some("Location A1".to_string()),
            location_to: Some("Location B2".to_string()),
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(transfer_request, user_id.to_string())
        .unwrap();

    // Get transaction history
    let transactions = service
        .get_material_transactions(&material.id, None)
        .unwrap();
    assert_eq!(transactions.len(), 2);

    // Verify first transaction (stock in)
    let stock_in_tx = &transactions[0];
    assert_eq!(
        stock_in_tx.transaction_type,
        InventoryTransactionType::StockIn
    );
    assert_eq!(stock_in_tx.warehouse_id, Some("WH-A".to_string()));
    assert_eq!(stock_in_tx.location_to, Some("Location A1".to_string()));

    // Verify second transaction (transfer)
    let transfer_tx = &transactions[1];
    assert_eq!(
        transfer_tx.transaction_type,
        InventoryTransactionType::Transfer
    );
    assert_eq!(transfer_tx.warehouse_id, Some("WH-B".to_string()));
    assert_eq!(transfer_tx.location_from, Some("Location A1".to_string()));
    assert_eq!(transfer_tx.location_to, Some("Location B2".to_string()));

    // Get current stock location (should be split between locations)
    let locations = service.get_material_locations(&material.id).unwrap();

    // This would need to be implemented in the service
    // For now, we verify the transaction history contains location information
}

#[tokio::test]
async fn test_inventory_cost_tracking() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test user
    let user_id = "user_test_5";
    create_test_user(&service.db, user_id, "test5@example.com");

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-COST".to_string(),
            name: "Test Cost Material".to_string(),
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

    let material = service
        .create_material(material_request, Some(user_id.to_string()))
        .unwrap();

    // Stock in with unit cost
    let unit_cost = 25.50;
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 20.0,
            reference_number: Some("PO-COST".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(unit_cost),
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
        .create_inventory_transaction(stock_in_request, user_id.to_string())
        .unwrap();

    // Get transaction history
    let transactions = service
        .get_material_transactions(&material.id, None)
        .unwrap();
    assert_eq!(transactions.len(), 1);

    let transaction = &transactions[0];
    assert_eq!(transaction.unit_cost, Some(unit_cost));

    // Total cost should be calculated
    let expected_total_cost = unit_cost * 20.0;
    assert_eq!(transaction.total_cost, Some(expected_total_cost));

    // Consume material
    let consumption_request =
        crate::domains::inventory::infrastructure::material::RecordConsumptionRequest {
            intervention_id: "int_cost_1".to_string(),
            material_id: material.id.clone(),
            step_id: None,
            step_number: None,
            quantity_used: 5.0,
            waste_quantity: Some(0.5),
            waste_reason: Some("Spillage".to_string()),
            batch_used: None,
            quality_notes: None,
            recorded_by: Some(user_id.to_string()),
        };

    service
        .record_material_consumption(consumption_request)
        .unwrap();

    // Get consumption records
    let consumption_records = service
        .get_material_consumption(&material.id, None)
        .unwrap();
    assert_eq!(consumption_records.len(), 1);

    let consumption = &consumption_records[0];
    assert_eq!(consumption.quantity_used, 5.0);
    assert_eq!(consumption.waste_quantity, Some(0.5));

    // Calculate inventory value
    let inventory_value = service.calculate_inventory_value(&material.id).unwrap();
    let expected_value = unit_cost * 14.5; // 20 - 5 - 0.5 = 14.5 remaining
    assert_eq!(inventory_value, expected_value);
}

#[tokio::test]
async fn test_material_expiry_tracking() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test user
    let user_id = "user_test_6";
    create_test_user(&service.db, user_id, "test6@example.com");

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-EXPIRY".to_string(),
            name: "Test Expiry Material".to_string(),
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

    let material = service
        .create_material(material_request, Some(user_id.to_string()))
        .unwrap();

    // Stock in with expiry date
    let expiry_date = (Utc::now() + chrono::Duration::days(30)).timestamp_millis();
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 10.0,
            reference_number: Some("PO-EXPIRY".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: Some("Material with expiry date".to_string()),
            unit_cost: Some(15.0),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: Some("BATCH-EXPIRY".to_string()),
            expiry_date: Some(expiry_date),
            quality_status: Some("approved".to_string()),
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request, user_id.to_string())
        .unwrap();

    // Get materials approaching expiry
    let expiring_materials = service.get_materials_expiring_soon(60).unwrap();
    assert_eq!(
        expiring_materials.len(),
        1,
        "Should have 1 material expiring soon"
    );
    assert_eq!(expiring_materials[0].id, material.id);

    // Get batch information
    let batch_info = service
        .get_material_batch_info(&material.id, "BATCH-EXPIRY")
        .unwrap();
    assert!(batch_info.is_some(), "Should have batch information");

    let batch = batch_info.unwrap();
    assert_eq!(batch.batch_number, "BATCH-EXPIRY");
    assert_eq!(batch.quantity, 10.0);
    assert_eq!(batch.expiry_date, Some(expiry_date));
}

#[tokio::test]
async fn test_material_quality_tracking() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test user
    let user_id = "user_test_7";
    create_test_user(&service.db, user_id, "test7@example.com");

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-QUALITY".to_string(),
            name: "Test Quality Material".to_string(),
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
            unit_cost: Some(80.0),
            currency: None,
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: Some("A".to_string()),
            certification: Some("ISO-9001".to_string()),
            expiry_date: None,
            batch_number: None,
            storage_location: None,
            warehouse_id: None,
        };

    let material = service
        .create_material(material_request, Some(user_id.to_string()))
        .unwrap();

    // Stock in with quality grade
    let stock_in_request =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 25.0,
            reference_number: Some("PO-QUALITY".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: Some("High quality batch".to_string()),
            unit_cost: Some(80.0),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: Some("BATCH-QUALITY-A".to_string()),
            expiry_date: None,
            quality_status: Some("premium".to_string()),
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request, user_id.to_string())
        .unwrap();

    // Get quality statistics for this material
    let quality_stats = service.get_material_quality_stats(&material.id).unwrap();

    assert_eq!(quality_stats.total_batches, 1);
    assert_eq!(quality_stats.premium_batches, 1);
    assert_eq!(quality_stats.standard_batches, 0);
    assert_eq!(quality_stats.rejected_batches, 0);

    // Stock in another batch with lower quality
    let stock_in_request_2 =
        crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 25.0,
            reference_number: Some("PO-QUALITY-2".to_string()),
            reference_type: Some("purchase_order".to_string()),
            notes: Some("Standard quality batch".to_string()),
            unit_cost: Some(70.0),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: Some("BATCH-QUALITY-B".to_string()),
            expiry_date: None,
            quality_status: Some("standard".to_string()),
            intervention_id: None,
            step_id: None,
        };

    service
        .create_inventory_transaction(stock_in_request_2, user_id.to_string())
        .unwrap();

    // Get updated quality statistics
    let quality_stats = service.get_material_quality_stats(&material.id).unwrap();

    assert_eq!(quality_stats.total_batches, 2);
    assert_eq!(quality_stats.premium_batches, 1);
    assert_eq!(quality_stats.standard_batches, 1);
    assert_eq!(quality_stats.rejected_batches, 0);
}

#[tokio::test]
async fn test_inventory_performance_with_large_dataset() {
    let db = create_test_db().await;
    let service = MaterialService::new(db);

    // Create a test user
    let user_id = "user_test_8";
    create_test_user(&service.db, user_id, "test8@example.com");

    // Create multiple materials
    let material_count = 100;
    let mut material_ids = Vec::new();

    let start = std::time::Instant::now();

    for i in 1..=material_count {
        let material_request =
            crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
                sku: format!("MAT-PERF-{:03}", i),
                name: format!("Performance Test Material {}", i),
                description: None,
                material_type: MaterialType::Film,
                category: None,
                subcategory: None,
                category_id: Some("cat_ppf_films".to_string()),
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure: UnitOfMeasure::Meter,
                minimum_stock: Some(10.0),
                maximum_stock: Some(100.0),
                reorder_point: Some(25.0),
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

        let material = service
            .create_material(material_request, Some(user_id.to_string()))
            .unwrap();
        material_ids.push(material.id);
    }

    let creation_duration = start.elapsed();
    println!(
        "Created {} materials in {:?}",
        material_count, creation_duration
    );

    // Stock in for all materials
    let start = std::time::Instant::now();

    for material_id in &material_ids {
        let stock_in_request = crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
            material_id: material_id.clone(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 50.0,
            reference_number: Some(format!("PO-PERF-{}", material_id)),
            reference_type: Some("purchase_order".to_string()),
            notes: None,
            unit_cost: Some(50.0),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: Some(format!("BATCH-PERF-{}", material_id)),
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

        service
            .create_inventory_transaction(stock_in_request, user_id.to_string())
            .unwrap();
    }

    let stock_in_duration = start.elapsed();
    println!(
        "Stocked in {} materials in {:?}",
        material_count, stock_in_duration
    );

    // List all materials
    let start = std::time::Instant::now();
    let materials = service.list_materials(None, None, None).unwrap();
    let list_duration = start.elapsed();

    assert_eq!(materials.len(), material_count, "Should list all materials");
    println!(
        "Listed {} materials in {:?}",
        materials.len(),
        list_duration
    );

    // Get reorder list
    let start = std::time::Instant::now();
    let reorder_list = service.get_materials_needing_reorder().unwrap();
    let reorder_duration = start.elapsed();

    assert_eq!(reorder_list.len(), 0, "No materials should need reorder");
    println!("Checked reorder status in {:?}", reorder_duration);

    // Performance assertions
    assert!(
        creation_duration.as_millis() < 5000,
        "Material creation should complete within 5 seconds"
    );
    assert!(
        stock_in_duration.as_millis() < 10000,
        "Stock in should complete within 10 seconds"
    );
    assert!(
        list_duration.as_millis() < 1000,
        "List materials should complete within 1 second"
    );
    assert!(
        reorder_duration.as_millis() < 1000,
        "Reorder check should complete within 1 second"
    );
}

#[tokio::test]
async fn test_inventory_concurrent_access() {
    let db = Arc::new(create_test_db().await);
    let service = Arc::new(MaterialService::new((*db).clone()));

    // Create a test user
    let user_id = "user_test_concurrent";
    create_test_user(&service.db, user_id, "test_concurrent@example.com");

    // Create a material
    let material_request =
        crate::domains::inventory::infrastructure::material::CreateMaterialRequest {
            sku: "MAT-CONCURRENT".to_string(),
            name: "Concurrent Test Material".to_string(),
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
        .create_material(material_request, Some(user_id.to_string()))
        .unwrap();

    // Test concurrent stock in operations
    let mut handles = vec![];

    for i in 0..10 {
        let service_clone = Arc::clone(&service);
        let material_id_clone = material.id.clone();
        let user_id_clone = user_id.to_string();

        let handle = tokio::spawn(async move {
            let stock_in_request = crate::domains::inventory::infrastructure::material::CreateInventoryTransactionRequest {
                material_id: material_id_clone,
                transaction_type: InventoryTransactionType::StockIn,
                quantity: 10.0,
                reference_number: Some(format!("PO-CONCURRENT-{}", i)),
                reference_type: Some("purchase_order".to_string()),
                notes: None,
                unit_cost: Some(50.0),
                warehouse_id: None,
                location_from: None,
                location_to: None,
                batch_number: Some(format!("BATCH-CONCURRENT-{}", i)),
                expiry_date: None,
                quality_status: None,
                intervention_id: None,
                step_id: None,
            };

            service_clone.create_inventory_transaction(stock_in_request, user_id_clone)
        });

        handles.push(handle);
    }

    // Wait for all operations to complete
    let mut results = vec![];
    for handle in handles {
        results.push(handle.await.unwrap());
    }

    // Verify all operations completed successfully
    for (i, result) in results.into_iter().enumerate() {
        assert!(result.is_ok(), "Stock in operation {} should succeed", i);
    }

    // Verify final stock level
    let final_material = service.get_material_by_id(&material.id).unwrap().unwrap();
    assert_eq!(
        final_material.current_stock, 100.0,
        "Should have 100 units in stock"
    );

    // Verify transaction history
    let transactions = service
        .get_material_transactions(&material.id, None)
        .unwrap();
    assert_eq!(transactions.len(), 10, "Should have 10 transactions");
}
