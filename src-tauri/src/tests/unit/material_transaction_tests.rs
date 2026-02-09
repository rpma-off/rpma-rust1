//! Unit tests for Inventory Transaction Management
//!
//! This module contains comprehensive unit tests for inventory transaction functionality,
//! focusing on stock movements, adjustments, and reporting.

use crate::models::material::{
    InventoryTransaction, InventoryTransactionType, Material, MaterialType, UnitOfMeasure,
};
use crate::services::material::{
    CreateInventoryTransactionRequest, MaterialError, MaterialService,
};
use crate::test_utils::TestDatabase;
use chrono::{DateTime, TimeZone, Utc};

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper function to create a basic material
    fn create_test_material(service: &MaterialService, sku: &str, initial_stock: f64) -> Material {
        let request = crate::services::material::CreateMaterialRequest {
            sku: sku.to_string(),
            name: format!("Test Material {}", sku),
            description: Some("Test material for transactions".to_string()),
            material_type: MaterialType::PpfFilm,
            category: Some("Films".to_string()),
            subcategory: None,
            category_id: None,
            brand: Some("TestBrand".to_string()),
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(10.0),
            maximum_stock: Some(1000.0),
            reorder_point: Some(20.0),
            unit_cost: Some(15.50),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            storage_location: Some("Warehouse A".to_string()),
            warehouse_id: None,
        };

        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        if initial_stock > 0.0 {
            let update_request = crate::services::material::UpdateStockRequest {
                material_id: material.id.clone().unwrap(),
                quantity_change: initial_stock,
                reason: "Initial stock".to_string(),
                recorded_by: Some("test_user".to_string()),
            };
            service.update_stock(update_request).unwrap();
        }

        material
    }

    /// Helper function to create a basic inventory transaction request
    fn create_transaction_request(material_id: String) -> CreateInventoryTransactionRequest {
        CreateInventoryTransactionRequest {
            material_id,
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 100.0,
            reference_number: Some("PO-001".to_string()),
            reference_type: Some("Purchase Order".to_string()),
            notes: Some("Initial purchase order".to_string()),
            unit_cost: Some(15.50),
            warehouse_id: Some("WH-001".to_string()),
            location_from: None,
            location_to: Some("Rack A-1".to_string()),
            batch_number: Some("BATCH-001".to_string()),
            expiry_date: Some(Utc.with_ymd_and_hms(2025, 12, 31, 0, 0, 0).unwrap()),
            quality_status: Some("Good".to_string()),
            intervention_id: None,
            step_id: None,
        }
    }

    #[test]
    fn test_create_stock_in_transaction() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "STOCK-IN-001", 0.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::StockIn;

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id.unwrap());
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::StockIn
        );
        assert_eq!(transaction.quantity, 100.0);
        assert_eq!(transaction.previous_stock, 0.0);
        assert_eq!(transaction.new_stock, 100.0);
        assert_eq!(transaction.reference_number.unwrap(), "PO-001");
        assert_eq!(transaction.reference_type.unwrap(), "Purchase Order");
        assert_eq!(transaction.notes.unwrap(), "Initial purchase order");
        assert_eq!(transaction.unit_cost.unwrap(), 15.50);
        assert_eq!(transaction.total_cost.unwrap(), 1550.0);
        assert_eq!(transaction.warehouse_id.unwrap(), "WH-001");
        assert_eq!(transaction.location_to.unwrap(), "Rack A-1");
        assert_eq!(transaction.batch_number.unwrap(), "BATCH-001");
        assert_eq!(transaction.quality_status.unwrap(), "Good");
        assert_eq!(transaction.performed_by, "test_user");

        // Verify material stock was updated
        let updated_material = service
            .get_material(&material.id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(updated_material.current_stock, 100.0);
    }

    #[test]
    fn test_create_stock_out_transaction() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "STOCK-OUT-001", 200.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::StockOut;
        request.quantity = 50.0;
        request.reference_number = Some("SO-001".to_string());
        request.reference_type = Some("Sales Order".to_string());
        request.notes = Some("Customer order fulfillment".to_string());
        request.location_from = Some("Rack A-1".to_string());
        request.location_to = None;

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id.unwrap());
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::StockOut
        );
        assert_eq!(transaction.quantity, 50.0);
        assert_eq!(transaction.previous_stock, 200.0);
        assert_eq!(transaction.new_stock, 150.0);
        assert_eq!(transaction.reference_number.unwrap(), "SO-001");
        assert_eq!(transaction.reference_type.unwrap(), "Sales Order");
        assert_eq!(transaction.notes.unwrap(), "Customer order fulfillment");
        assert_eq!(transaction.location_from.unwrap(), "Rack A-1");
        assert!(transaction.location_to.is_none());

        // Verify material stock was updated
        let updated_material = service
            .get_material(&material.id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(updated_material.current_stock, 150.0);
    }

    #[test]
    fn test_create_adjustment_transaction() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "ADJUST-001", 75.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::Adjustment;
        request.quantity = 100.0; // New absolute stock level
        request.reference_number = Some("ADJ-001".to_string());
        request.reference_type = Some("Physical Count".to_string());
        request.notes = Some("Physical count adjustment".to_string());

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id.unwrap());
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::Adjustment
        );
        assert_eq!(transaction.quantity, 100.0);
        assert_eq!(transaction.previous_stock, 75.0);
        assert_eq!(transaction.new_stock, 100.0);
        assert_eq!(transaction.reference_number.unwrap(), "ADJ-001");
        assert_eq!(transaction.reference_type.unwrap(), "Physical Count");
        assert_eq!(transaction.notes.unwrap(), "Physical count adjustment");

        // Verify material stock was updated
        let updated_material = service
            .get_material(&material.id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(updated_material.current_stock, 100.0);
    }

    #[test]
    fn test_create_transfer_transaction() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "TRANSFER-001", 150.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::Transfer;
        request.quantity = 25.0;
        request.reference_number = Some("TRF-001".to_string());
        request.reference_type = Some("Internal Transfer".to_string());
        request.notes = Some("Transfer to workshop".to_string());
        request.location_from = Some("Warehouse A".to_string());
        request.location_to = Some("Workshop B".to_string());

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id.unwrap());
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::Transfer
        );
        assert_eq!(transaction.quantity, 25.0);
        assert_eq!(transaction.previous_stock, 150.0);
        assert_eq!(transaction.new_stock, 125.0);
        assert_eq!(transaction.reference_number.unwrap(), "TRF-001");
        assert_eq!(transaction.reference_type.unwrap(), "Internal Transfer");
        assert_eq!(transaction.notes.unwrap(), "Transfer to workshop");
        assert_eq!(transaction.location_from.unwrap(), "Warehouse A");
        assert_eq!(transaction.location_to.unwrap(), "Workshop B");

        // Verify material stock was updated
        let updated_material = service
            .get_material(&material.id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(updated_material.current_stock, 125.0);
    }

    #[test]
    fn test_create_waste_transaction() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "WASTE-001", 100.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::Waste;
        request.quantity = 10.0;
        request.reference_number = Some("WST-001".to_string());
        request.reference_type = Some("Waste Disposal".to_string());
        request.notes = Some("Expired material disposal".to_string());
        request.location_from = Some("Rack A-1".to_string());

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id.unwrap());
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::Waste
        );
        assert_eq!(transaction.quantity, 10.0);
        assert_eq!(transaction.previous_stock, 100.0);
        assert_eq!(transaction.new_stock, 90.0);
        assert_eq!(transaction.reference_number.unwrap(), "WST-001");
        assert_eq!(transaction.reference_type.unwrap(), "Waste Disposal");
        assert_eq!(transaction.notes.unwrap(), "Expired material disposal");

        // Verify material stock was updated
        let updated_material = service
            .get_material(&material.id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(updated_material.current_stock, 90.0);
    }

    #[test]
    fn test_create_return_transaction() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "RETURN-001", 50.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::Return;
        request.quantity = 20.0;
        request.reference_number = Some("RTN-001".to_string());
        request.reference_type = Some("Customer Return".to_string());
        request.notes = Some("Customer returned unused material".to_string());

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id.unwrap());
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::Return
        );
        assert_eq!(transaction.quantity, 20.0);
        assert_eq!(transaction.previous_stock, 50.0);
        assert_eq!(transaction.new_stock, 70.0);
        assert_eq!(transaction.reference_number.unwrap(), "RTN-001");
        assert_eq!(transaction.reference_type.unwrap(), "Customer Return");
        assert_eq!(
            transaction.notes.unwrap(),
            "Customer returned unused material"
        );

        // Verify material stock was updated
        let updated_material = service
            .get_material(&material.id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(updated_material.current_stock, 70.0);
    }

    #[test]
    fn test_create_transaction_insufficient_stock() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "INSUFF-001", 10.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::StockOut;
        request.quantity = 20.0; // More than available

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::InsufficientStock(msg) => {
                assert!(msg.contains("Insufficient stock"));
                assert!(msg.contains("10.0"));
                assert!(msg.contains("20.0"));
            }
            _ => panic!("Expected InsufficientStock error"),
        }

        // Verify material stock was not updated
        let unchanged_material = service
            .get_material(&material.id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(unchanged_material.current_stock, 10.0);
    }

    #[test]
    fn test_create_transaction_material_not_found() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let request = create_transaction_request("non-existent-material".to_string());

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::NotFound(msg) => {
                assert!(msg.contains("not found"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_list_inventory_transactions_by_material() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "LIST-001", 100.0);

        // Create multiple transactions
        for i in 1..=5 {
            let mut request = create_transaction_request(material.id.clone().unwrap());
            request.transaction_type = if i % 2 == 0 {
                InventoryTransactionType::StockOut
            } else {
                InventoryTransactionType::StockIn
            };
            request.quantity = 10.0;
            request.reference_number = Some(format!("REF-{:03}", i));

            service
                .create_inventory_transaction(request, "test_user")
                .unwrap();
        }

        // List all transactions for material
        let result = service.list_inventory_transactions_by_material(
            &material.id.unwrap(),
            None,
            None,
            None,
        );
        assert!(result.is_ok());

        let transactions = result.unwrap();
        assert_eq!(transactions.len(), 5);

        // Verify transactions are sorted by performed_at DESC (most recent first)
        for i in 0..transactions.len() - 1 {
            assert!(transactions[i].performed_at >= transactions[i + 1].performed_at);
        }
    }

    #[test]
    fn test_list_inventory_transactions_by_type() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "LIST-TYPE-001", 100.0);

        // Create multiple transactions of different types
        for i in 1..=6 {
            let transaction_type = match i % 3 {
                0 => InventoryTransactionType::StockIn,
                1 => InventoryTransactionType::StockOut,
                _ => InventoryTransactionType::Adjustment,
            };

            let mut request = create_transaction_request(material.id.clone().unwrap());
            request.transaction_type = transaction_type;
            request.quantity = 10.0;
            request.reference_number = Some(format!("REF-{:03}", i));

            service
                .create_inventory_transaction(request, "test_user")
                .unwrap();
        }

        // List only StockIn transactions
        let result = service.list_inventory_transactions_by_material(
            &material.id.unwrap(),
            Some(InventoryTransactionType::StockIn),
            None,
            None,
        );
        assert!(result.is_ok());

        let transactions = result.unwrap();
        assert_eq!(transactions.len(), 2);
        assert!(transactions
            .iter()
            .all(|t| matches!(t.transaction_type, InventoryTransactionType::StockIn)));
    }

    #[test]
    fn test_list_inventory_transactions_with_pagination() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "LIST-PAGE-001", 100.0);

        // Create multiple transactions
        for i in 1..=10 {
            let mut request = create_transaction_request(material.id.clone().unwrap());
            request.quantity = 10.0;
            request.reference_number = Some(format!("REF-{:03}", i));

            service
                .create_inventory_transaction(request, "test_user")
                .unwrap();
        }

        // Get first page
        let result = service.list_inventory_transactions_by_material(
            &material.id.unwrap(),
            None,
            Some(5),
            Some(0),
        );
        assert!(result.is_ok());

        let first_page = result.unwrap();
        assert_eq!(first_page.len(), 5);

        // Get second page
        let result = service.list_inventory_transactions_by_material(
            &material.id.unwrap(),
            None,
            Some(5),
            Some(5),
        );
        assert!(result.is_ok());

        let second_page = result.unwrap();
        assert_eq!(second_page.len(), 5);

        // Verify no overlap
        let first_ids: std::collections::HashSet<String> =
            first_page.iter().map(|t| t.id.clone()).collect();
        let second_ids: std::collections::HashSet<String> =
            second_page.iter().map(|t| t.id.clone()).collect();
        assert!(first_ids.intersection(&second_ids).count() == 0);
    }

    #[test]
    fn test_list_recent_inventory_transactions() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create materials and transactions
        let material1 = create_test_material(&service, "RECENT-001", 50.0);
        let material2 = create_test_material(&service, "RECENT-002", 75.0);
        let material3 = create_test_material(&service, "RECENT-003", 25.0);

        // Create transactions for different materials
        for (i, material) in [material1, material2, material3].iter().enumerate() {
            let mut request = create_transaction_request(material.id.clone().unwrap());
            request.transaction_type = InventoryTransactionType::StockIn;
            request.quantity = 10.0;
            request.reference_number = Some(format!("MAT-{:03}-REF-001", i + 1));

            service
                .create_inventory_transaction(request, "test_user")
                .unwrap();
        }

        // List recent transactions
        let result = service.list_recent_inventory_transactions(2);
        assert!(result.is_ok());

        let transactions = result.unwrap();
        assert_eq!(transactions.len(), 2);

        // Verify transactions are sorted by performed_at DESC
        for i in 0..transactions.len() - 1 {
            assert!(transactions[i].performed_at >= transactions[i + 1].performed_at);
        }
    }

    #[test]
    fn test_get_inventory_stats() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create materials with different stock levels
        let normal_material = create_test_material(&service, "STATS-001", 100.0);
        let low_stock_material = create_test_material(&service, "STATS-002", 5.0);

        // Create an expired material
        let mut expired_request = crate::services::material::CreateMaterialRequest {
            sku: "STATS-003".to_string(),
            name: "Expired Material".to_string(),
            description: Some("Test expired material".to_string()),
            material_type: MaterialType::PpfFilm,
            category: Some("Films".to_string()),
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(10.0),
            maximum_stock: Some(1000.0),
            reorder_point: Some(20.0),
            unit_cost: Some(15.50),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: Some(Utc.with_ymd_and_hms(2023, 1, 1, 0, 0, 0).unwrap()),
            batch_number: None,
            storage_location: None,
            warehouse_id: None,
        };
        let expired_material = service
            .create_material(expired_request, Some("test_user".to_string()))
            .unwrap();

        // Create some transactions
        let mut request = create_transaction_request(normal_material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::StockIn;
        request.quantity = 50.0;
        request.reference_number = Some("STATS-PO-001");
        service
            .create_inventory_transaction(request, "test_user")
            .unwrap();

        // Get inventory stats
        let result = service.get_inventory_stats();
        assert!(result.is_ok());

        let stats = result.unwrap();
        assert_eq!(stats.total_materials, 3);
        assert_eq!(stats.active_materials, 3);
        assert_eq!(stats.low_stock_materials, 1); // low_stock_material
        assert_eq!(stats.expired_materials, 1); // expired_material
        assert!(stats.total_value > 0.0);
        assert!(!stats.materials_by_category.is_empty());
        assert_eq!(stats.recent_transactions.len(), 1); // The transaction we created
    }

    #[test]
    fn test_get_inventory_movement_summary() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create materials
        let material1 = create_test_material(&service, "MOVE-001", 50.0);
        let material2 = create_test_material(&service, "MOVE-002", 25.0);

        // Create transactions for material1
        let mut request1 = create_transaction_request(material1.id.clone().unwrap());
        request1.transaction_type = InventoryTransactionType::StockIn;
        request1.quantity = 100.0;
        request1.reference_number = Some("MOVE-PO-001");
        service
            .create_inventory_transaction(request1, "test_user")
            .unwrap();

        let mut request2 = create_transaction_request(material1.id.clone().unwrap());
        request2.transaction_type = InventoryTransactionType::StockOut;
        request2.quantity = 25.0;
        request2.reference_number = Some("MOVE-SO-001");
        service
            .create_inventory_transaction(request2, "test_user")
            .unwrap();

        // Create transactions for material2
        let mut request3 = create_transaction_request(material2.id.clone().unwrap());
        request3.transaction_type = InventoryTransactionType::StockIn;
        request3.quantity = 50.0;
        request3.reference_number = Some("MOVE-PO-002");
        service
            .create_inventory_transaction(request3, "test_user")
            .unwrap();

        // Get movement summary for all materials
        let result = service.get_inventory_movement_summary(None, None, None);
        assert!(result.is_ok());

        let summaries = result.unwrap();
        assert_eq!(summaries.len(), 2);

        // Check material1 summary
        let material1_summary = summaries
            .iter()
            .find(|s| s.material_id == material1.id.unwrap())
            .unwrap();
        assert_eq!(material1_summary.material_name, "Test Material MOVE-001");
        assert_eq!(material1_summary.total_stock_in, 100.0);
        assert_eq!(material1_summary.total_stock_out, 25.0);
        assert_eq!(material1_summary.net_movement, 75.0);
        assert_eq!(material1_summary.current_stock, 125.0); // 50 initial + 100 in - 25 out

        // Check material2 summary
        let material2_summary = summaries
            .iter()
            .find(|s| s.material_id == material2.id.unwrap())
            .unwrap();
        assert_eq!(material2_summary.material_name, "Test Material MOVE-002");
        assert_eq!(material2_summary.total_stock_in, 50.0);
        assert_eq!(material2_summary.total_stock_out, 0.0);
        assert_eq!(material2_summary.net_movement, 50.0);
        assert_eq!(material2_summary.current_stock, 75.0); // 25 initial + 50 in
    }

    #[test]
    fn test_get_inventory_movement_summary_for_specific_material() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create materials
        let material1 = create_test_material(&service, "MOVE-SPEC-001", 50.0);
        let material2 = create_test_material(&service, "MOVE-SPEC-002", 25.0);

        // Create transactions for material1
        let mut request1 = create_transaction_request(material1.id.clone().unwrap());
        request1.transaction_type = InventoryTransactionType::StockIn;
        request1.quantity = 100.0;
        request1.reference_number = Some("MOVE-SPEC-PO-001");
        service
            .create_inventory_transaction(request1, "test_user")
            .unwrap();

        // Create transactions for material2
        let mut request2 = create_transaction_request(material2.id.clone().unwrap());
        request2.transaction_type = InventoryTransactionType::StockIn;
        request2.quantity = 50.0;
        request2.reference_number = Some("MOVE-SPEC-PO-002");
        service
            .create_inventory_transaction(request2, "test_user")
            .unwrap();

        // Get movement summary for specific material
        let result =
            service.get_inventory_movement_summary(Some(&material1.id.unwrap()), None, None);
        assert!(result.is_ok());

        let summaries = result.unwrap();
        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].material_id, material1.id.unwrap());
        assert_eq!(summaries[0].total_stock_in, 100.0);
    }

    #[test]
    fn test_transaction_with_intervention_and_step() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "INTERVENTION-001", 100.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::StockOut;
        request.quantity = 10.0;
        request.intervention_id = Some("INT-001".to_string());
        request.step_id = Some("STEP-001".to_string());
        request.reference_number = Some("INT-REF-001");
        request.notes = Some("Material used in intervention");

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.intervention_id.unwrap(), "INT-001");
        assert_eq!(transaction.step_id.unwrap(), "STEP-001");
    }

    #[test]
    fn test_transaction_total_cost_calculation() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, "COST-001", 100.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::StockIn;
        request.quantity = 100.0;
        request.unit_cost = Some(15.50);
        request.reference_number = Some("COST-REF-001");

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.unit_cost.unwrap(), 15.50);
        assert_eq!(transaction.total_cost.unwrap(), 1550.0); // 100 * 15.50
    }

    #[test]
    fn test_transaction_without_unit_cost() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let material = create_test_material(&service, ("NO-COST-001"), 100.0);

        let mut request = create_transaction_request(material.id.clone().unwrap());
        request.transaction_type = InventoryTransactionType::StockOut;
        request.quantity = 10.0;
        request.unit_cost = None;
        request.reference_number = Some("NO-COST-REF-001");

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert!(transaction.unit_cost.is_none());
        assert!(transaction.total_cost.is_none());
    }
}
