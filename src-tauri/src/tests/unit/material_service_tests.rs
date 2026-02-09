//! Unit tests for Material Service
//!
//! This module contains comprehensive unit tests for material management functionality,
//! focusing on CRUD operations, validation, stock management, and business rules.

use crate::models::material::{InventoryTransactionType, Material, MaterialType, UnitOfMeasure};
use crate::services::material::{
    CreateInventoryTransactionRequest, CreateMaterialCategoryRequest, CreateMaterialRequest,
    CreateSupplierRequest, MaterialError, MaterialService, RecordConsumptionRequest,
    UpdateStockRequest,
};
use crate::test_utils::{TestDataFactory, TestDatabase};
use chrono::{DateTime, TimeZone, Utc};
use std::collections::HashMap;

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper function to create a basic material request
    fn create_basic_material_request() -> CreateMaterialRequest {
        CreateMaterialRequest {
            sku: "TEST-PPF-001".to_string(),
            name: "Test PPF Film".to_string(),
            description: Some("Test PPF film for testing".to_string()),
            material_type: MaterialType::PpfFilm,
            category: Some("Films".to_string()),
            subcategory: Some("Clear".to_string()),
            category_id: None,
            brand: Some("TestBrand".to_string()),
            model: Some("TestModel".to_string()),
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(20.0),
            maximum_stock: Some(500.0),
            reorder_point: Some(25.0),
            unit_cost: Some(15.50),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: Some("Test Supplier".to_string()),
            supplier_sku: Some("SUP-001".to_string()),
            quality_grade: Some("Premium".to_string()),
            certification: Some("ISO-9001".to_string()),
            expiry_date: None,
            batch_number: None,
            storage_location: Some("Warehouse A".to_string()),
            warehouse_id: None,
        }
    }

    #[test]
    fn test_create_material_success() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let request = create_basic_material_request();

        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_ok());

        let material = result.unwrap();
        assert_eq!(material.sku, "TEST-PPF-001");
        assert_eq!(material.name, "Test PPF Film");
        assert_eq!(material.material_type, MaterialType::PpfFilm);
        assert_eq!(material.unit_of_measure, UnitOfMeasure::Meter);
        assert_eq!(material.current_stock, 0.0);
        assert_eq!(material.minimum_stock, Some(20.0));
        assert_eq!(material.maximum_stock, Some(500.0));
        assert_eq!(material.created_by, Some("test_user".to_string()));
        assert!(material.id.is_some());
    }

    #[test]
    fn test_create_material_validation_empty_sku() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let mut request = create_basic_material_request();
        request.sku = "".to_string();

        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("SKU"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_create_material_validation_empty_name() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let mut request = create_basic_material_request();
        request.name = "".to_string();

        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("name"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_create_material_validation_negative_stock() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let mut request = create_basic_material_request();
        request.minimum_stock = Some(-10.0);

        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("stock"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_update_stock_success() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create a material first
        let material = service
            .create_material(
                create_basic_material_request(),
                Some("test_user".to_string()),
            )
            .unwrap();

        // Update stock
        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 100.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.update_stock(update_request);
        assert!(result.is_ok());

        let updated_material = result.unwrap();
        assert_eq!(updated_material.current_stock, 100.0);
    }

    #[test]
    fn test_update_stock_not_found() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let update_request = UpdateStockRequest {
            material_id: "non-existent-id".to_string(),
            quantity_change: 100.0,
            reason: "Test".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.update_stock(update_request);
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::NotFound(msg) => {
                assert!(msg.contains("Material"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_record_consumption_success() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create and stock a material
        let material = service
            .create_material(
                create_basic_material_request(),
                Some("test_user".to_string()),
            )
            .unwrap();

        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 100.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Record consumption
        let consumption_request = RecordConsumptionRequest {
            intervention_id: "test-intervention".to_string(),
            material_id: material.id.clone().unwrap(),
            step_id: Some("test-step".to_string()),
            step_number: Some(1),
            quantity_used: 10.0,
            waste_quantity: Some(1.0),
            waste_reason: Some("Trimming".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.record_consumption(consumption_request);
        assert!(result.is_ok());

        // Verify stock was reduced
        let updated_material = service
            .get_material_by_id(material.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_material.current_stock, 89.0); // 100 - 10 - 1 waste
    }

    #[test]
    fn test_record_consumption_insufficient_stock() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create a material with low stock
        let material = service
            .create_material(
                create_basic_material_request(),
                Some("test_user".to_string()),
            )
            .unwrap();

        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 5.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Try to consume more than available
        let consumption_request = RecordConsumptionRequest {
            intervention_id: "test-intervention".to_string(),
            material_id: material.id.clone().unwrap(),
            step_id: Some("test-step".to_string()),
            step_number: Some(1),
            quantity_used: 10.0, // More than available
            waste_quantity: None,
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.record_consumption(consumption_request);
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::InsufficientStock(msg) => {
                assert!(msg.contains("stock"));
            }
            _ => panic!("Expected InsufficientStock error"),
        }
    }

    #[test]
    fn test_get_low_stock_materials() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create a material with minimum stock
        let mut request = create_basic_material_request();
        request.sku = "LOW-STOCK-001".to_string();
        request.minimum_stock = Some(10.0);

        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        // Set stock below minimum
        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 5.0, // Below minimum of 10.0
            reason: "Low stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Get low stock materials
        let result = service.get_low_stock_materials();
        assert!(result.is_ok());

        let low_stock_materials = result.unwrap();
        assert_eq!(low_stock_materials.len(), 1);
        assert_eq!(low_stock_materials[0].sku, "LOW-STOCK-001");
    }

    #[test]
    fn test_get_expired_materials() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create a material with expiry date in the past
        let mut request = create_basic_material_request();
        request.sku = "EXPIRED-001".to_string();
        request.expiry_date = Some(Utc.with_ymd_and_hms(2023, 1, 1, 0, 0, 0).unwrap());

        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        // Get expired materials
        let result = service.get_expired_materials();
        assert!(result.is_ok());

        let expired_materials = result.unwrap();
        assert_eq!(expired_materials.len(), 1);
        assert_eq!(expired_materials[0].sku, "EXPIRED-001");
    }

    #[test]
    fn test_create_material_category_success() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let request = CreateMaterialCategoryRequest {
            name: "Test Category".to_string(),
            code: Some("TEST-CAT".to_string()),
            parent_id: None,
            level: Some(1),
            description: Some("Test category description".to_string()),
            color: Some("#FF0000".to_string()),
        };

        let result = service.create_material_category(request, Some("test_user".to_string()));
        assert!(result.is_ok());

        let category = result.unwrap();
        assert_eq!(category.name, "Test Category");
        assert_eq!(category.code, Some("TEST-CAT".to_string()));
        assert_eq!(category.level, Some(1));
        assert_eq!(category.created_by, Some("test_user".to_string()));
    }

    #[test]
    fn test_create_supplier_success() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let request = CreateSupplierRequest {
            name: "Test Supplier".to_string(),
            code: Some("SUP-TEST".to_string()),
            contact_person: Some("John Doe".to_string()),
            email: Some("supplier@example.com".to_string()),
            phone: Some("555-1234".to_string()),
            website: Some("https://example.com".to_string()),
            address_street: Some("123 Supplier St".to_string()),
            address_city: Some("Test City".to_string()),
            address_state: Some("Test State".to_string()),
            address_zip: Some("12345".to_string()),
            address_country: Some("Test Country".to_string()),
            tax_id: Some("TAX-123".to_string()),
            business_license: Some("BL-456".to_string()),
            payment_terms: Some("NET 30".to_string()),
            lead_time_days: Some(7),
            is_preferred: Some(true),
            quality_rating: Some(4.5),
            delivery_rating: Some(4.2),
            on_time_delivery_rate: Some(95.0),
            notes: Some("Test supplier notes".to_string()),
            special_instructions: Some("Handle with care".to_string()),
        };

        let result = service.create_supplier(request, Some("test_user".to_string()));
        assert!(result.is_ok());

        let supplier = result.unwrap();
        assert_eq!(supplier.name, "Test Supplier");
        assert_eq!(supplier.code, Some("SUP-TEST".to_string()));
        assert_eq!(supplier.contact_person, Some("John Doe".to_string()));
        assert_eq!(supplier.email, Some("supplier@example.com".to_string()));
        assert_eq!(supplier.is_preferred, Some(true));
    }

    #[test]
    fn test_create_inventory_transaction_success() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create a material first
        let material = service
            .create_material(
                create_basic_material_request(),
                Some("test_user".to_string()),
            )
            .unwrap();

        let request = CreateInventoryTransactionRequest {
            material_id: material.id.clone().unwrap(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 50.0,
            reference_number: Some("PO-001".to_string()),
            reference_type: Some("Purchase Order".to_string()),
            notes: Some("Initial stock".to_string()),
            unit_cost: Some(15.50),
            warehouse_id: None,
            location_from: None,
            location_to: Some("Warehouse A".to_string()),
            batch_number: Some("BATCH-001".to_string()),
            expiry_date: None,
            quality_status: Some("Good".to_string()),
            intervention_id: None,
            step_id: None,
        };

        let result = service.create_inventory_transaction(request, Some("test_user".to_string()));
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id.unwrap());
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::StockIn
        );
        assert_eq!(transaction.quantity, 50.0);
        assert_eq!(transaction.reference_number, Some("PO-001".to_string()));

        // Verify material stock was updated
        let updated_material = service
            .get_material_by_id(material.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_material.current_stock, 50.0);
    }

    #[test]
    fn test_get_material_stats() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create multiple materials
        let mut request1 = create_basic_material_request();
        request1.sku = "STATS-001".to_string();
        service
            .create_material(request1, Some("test_user".to_string()))
            .unwrap();

        let mut request2 = create_basic_material_request();
        request2.sku = "STATS-002".to_string();
        request2.material_type = MaterialType::Adhesive;
        service
            .create_material(request2, Some("test_user".to_string()))
            .unwrap();

        let mut request3 = create_basic_material_request();
        request3.sku = "STATS-003".to_string();
        request3.material_type = MaterialType::Tool;
        service
            .create_material(request3, Some("test_user".to_string()))
            .unwrap();

        // Get stats
        let result = service.get_material_stats();
        assert!(result.is_ok());

        let stats = result.unwrap();
        assert_eq!(stats.total_materials, 3);
        assert_eq!(stats.total_value, 0.0); // All have zero stock initially
        assert_eq!(stats.low_stock_count, 0); // None are below minimum

        // Verify type counts
        assert_eq!(stats.material_types.get("ppf_film"), Some(&1));
        assert_eq!(stats.material_types.get("adhesive"), Some(&1));
        assert_eq!(stats.material_types.get("tool"), Some(&1));
    }

    #[test]
    fn test_material_workflow_crud() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create
        let request = create_basic_material_request();
        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        // Read
        let fetched = service
            .get_material_by_id(material.id.as_ref().unwrap())
            .unwrap();
        assert_eq!(fetched.sku, material.sku);

        // Update
        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 100.0,
            reason: "Stock update".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        let updated = service
            .get_material_by_id(material.id.as_ref().unwrap())
            .unwrap();
        assert_eq!(updated.current_stock, 100.0);

        // Delete (soft delete)
        let result =
            service.delete_material(material.id.unwrap().as_str(), Some("test_user".to_string()));
        assert!(result.is_ok());

        // Verify it's marked as deleted
        let deleted = service
            .get_material_by_id(material.id.unwrap().as_str())
            .unwrap();
        assert!(deleted.is_deleted);
        assert_eq!(deleted.deleted_by, Some("test_user".to_string()));
    }

    // === STOCK VALIDATION TESTS ===

    #[test]
    fn test_stock_validation_maximum_stock_limit() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create material with maximum stock limit
        let mut request = create_basic_material_request();
        request.maximum_stock = Some(100.0);

        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        // Set stock to maximum limit
        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 100.0,
            reason: "Stock to maximum".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Try to exceed maximum stock
        let result = service.update_stock(UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 10.0, // Would exceed maximum
            reason: "Exceed maximum".to_string(),
            recorded_by: Some("test_user".to_string()),
        });
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("maximum stock"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_stock_validation_negative_stock_prevention() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create material
        let material = service
            .create_material(
                create_basic_material_request(),
                Some("test_user".to_string()),
            )
            .unwrap();

        // Set initial stock
        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 20.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Try to reduce below zero
        let result = service.update_stock(UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: -30.0, // More than available
            reason: "Try negative stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        });
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::InsufficientStock(msg) => {
                assert!(msg.contains("Cannot reduce stock below 0"));
            }
            _ => panic!("Expected InsufficientStock error"),
        }
    }

    #[test]
    fn test_stock_validation_zero_stock_allowed() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create material
        let material = service
            .create_material(
                create_basic_material_request(),
                Some("test_user".to_string()),
            )
            .unwrap();

        // Set initial stock
        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 10.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Reduce to exactly zero
        let result = service.update_stock(UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: -10.0, // Exactly to zero
            reason: "Reduce to zero".to_string(),
            recorded_by: Some("test_user".to_string()),
        });
        assert!(result.is_ok());

        let updated = result.unwrap();
        assert_eq!(updated.current_stock, 0.0);
    }

    // === MATERIAL CONSUMPTION TRACKING TESTS ===

    #[test]
    fn test_consumption_tracking_with_waste() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create and stock a material
        let material = service
            .create_material(
                create_basic_material_request(),
                Some("test_user".to_string()),
            )
            .unwrap();

        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 100.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Record consumption with waste
        let consumption_request = RecordConsumptionRequest {
            intervention_id: "test-intervention".to_string(),
            material_id: material.id.clone().unwrap(),
            step_id: Some("test-step".to_string()),
            step_number: Some(1),
            quantity_used: 15.0,
            waste_quantity: Some(5.0),
            waste_reason: Some("Trimming and defects".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good quality material".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.record_consumption(consumption_request);
        assert!(result.is_ok());

        let consumption = result.unwrap();
        assert_eq!(consumption.quantity_used, 15.0);
        assert_eq!(consumption.waste_quantity, 5.0);
        assert_eq!(
            consumption.waste_reason,
            Some("Trimming and defects".to_string())
        );
        assert_eq!(consumption.batch_used, Some("BATCH-001".to_string()));

        // Verify stock was reduced correctly
        let updated_material = service
            .get_material_by_id(material.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_material.current_stock, 80.0); // 100 - 15 - 5 waste
    }

    #[test]
    fn test_consumption_tracking_expired_material() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create an expired material
        let mut request = create_basic_material_request();
        request.expiry_date = Some(Utc.with_ymd_and_hms(2023, 1, 1, 0, 0, 0).unwrap());

        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 50.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Try to consume expired material
        let consumption_request = RecordConsumptionRequest {
            intervention_id: "test-intervention".to_string(),
            material_id: material.id.clone().unwrap(),
            step_id: Some("test-step".to_string()),
            step_number: Some(1),
            quantity_used: 10.0,
            waste_quantity: None,
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.record_consumption(consumption_request);
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::ExpiredMaterial(msg) => {
                assert!(msg.contains("expired"));
            }
            _ => panic!("Expected ExpiredMaterial error"),
        }
    }

    #[test]
    fn test_consumption_tracking_intervention_summary() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create multiple materials
        let material1 = service
            .create_material(
                create_basic_material_request(),
                Some("test_user".to_string()),
            )
            .unwrap();

        let mut request2 = create_basic_material_request();
        request2.sku = "TEST-MATERIAL-002".to_string();
        request2.name = "Test Material 2".to_string();
        request2.unit_cost = Some(20.0);
        let material2 = service
            .create_material(request2, Some("test_user".to_string()))
            .unwrap();

        // Stock both materials
        for material in [&material1, &material2] {
            let update_request = UpdateStockRequest {
                material_id: material.id.clone().unwrap(),
                quantity_change: 100.0,
                reason: "Initial stock".to_string(),
                recorded_by: Some("test_user".to_string()),
            };
            service.update_stock(update_request).unwrap();
        }

        // Record consumption for both materials
        let consumption1 = RecordConsumptionRequest {
            intervention_id: "test-intervention-summary".to_string(),
            material_id: material1.id.clone().unwrap(),
            step_id: Some("step-1".to_string()),
            step_number: Some(1),
            quantity_used: 15.0,
            waste_quantity: Some(2.0),
            waste_reason: Some("Trimming".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        let consumption2 = RecordConsumptionRequest {
            intervention_id: "test-intervention-summary".to_string(),
            material_id: material2.id.clone().unwrap(),
            step_id: Some("step-2".to_string()),
            step_number: Some(2),
            quantity_used: 10.0,
            waste_quantity: Some(1.0),
            waste_reason: Some("Cutting".to_string()),
            batch_used: Some("BATCH-002".to_string()),
            quality_notes: Some("Premium".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        service.record_consumption(consumption1).unwrap();
        service.record_consumption(consumption2).unwrap();

        // Get intervention summary
        let summary = service
            .get_intervention_material_summary("test-intervention-summary")
            .unwrap();

        assert_eq!(summary.intervention_id, "test-intervention-summary");
        assert_eq!(summary.total_materials_used, 2);
        assert_eq!(summary.materials.len(), 2);

        // Verify total cost calculation
        // Material 1: 15 units × 15.50 = 232.5
        // Material 2: 10 units × 20.00 = 200.0
        // Total = 432.5
        assert!((summary.total_cost - 432.5).abs() < 0.01);
    }

    // === SUPPLIER MANAGEMENT TESTS ===

    #[test]
    fn test_supplier_update_preferences() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create a supplier
        let request = CreateSupplierRequest {
            name: "Test Supplier".to_string(),
            code: Some("SUP-001".to_string()),
            contact_person: Some("John Doe".to_string()),
            email: Some("supplier@example.com".to_string()),
            phone: Some("555-1234".to_string()),
            website: Some("https://example.com".to_string()),
            address_street: Some("123 Supplier St".to_string()),
            address_city: Some("Test City".to_string()),
            address_state: Some("Test State".to_string()),
            address_zip: Some("12345".to_string()),
            address_country: Some("Test Country".to_string()),
            tax_id: Some("TAX-123".to_string()),
            business_license: Some("BL-456".to_string()),
            payment_terms: Some("NET 30".to_string()),
            lead_time_days: Some(7),
            is_preferred: Some(false),
            quality_rating: Some(4.0),
            delivery_rating: Some(3.5),
            on_time_delivery_rate: Some(85.0),
            notes: Some("Initial notes".to_string()),
            special_instructions: Some("Initial instructions".to_string()),
        };

        let supplier = service
            .create_supplier(request, Some("test_user".to_string()))
            .unwrap();
        assert_eq!(supplier.is_preferred, false);

        // Update supplier to preferred
        let update_request = CreateSupplierRequest {
            name: "Test Supplier".to_string(),
            code: Some("SUP-001".to_string()),
            contact_person: Some("Jane Doe".to_string()),
            email: Some("updated@example.com".to_string()),
            phone: Some("555-5678".to_string()),
            website: Some("https://updated.com".to_string()),
            address_street: Some("456 New St".to_string()),
            address_city: Some("New City".to_string()),
            address_state: Some("New State".to_string()),
            address_zip: Some("67890".to_string()),
            address_country: Some("New Country".to_string()),
            tax_id: Some("TAX-789".to_string()),
            business_license: Some("BL-999".to_string()),
            payment_terms: Some("NET 15".to_string()),
            lead_time_days: Some(5),
            is_preferred: Some(true), // Make preferred
            quality_rating: Some(4.8),
            delivery_rating: Some(4.2),
            on_time_delivery_rate: Some(95.0),
            notes: Some("Updated notes".to_string()),
            special_instructions: Some("Updated instructions".to_string()),
        };

        let updated = service
            .update_supplier(
                supplier.id.as_str(),
                update_request,
                Some("test_user".to_string()),
            )
            .unwrap();

        assert_eq!(updated.contact_person, Some("Jane Doe".to_string()));
        assert_eq!(updated.email, Some("updated@example.com".to_string()));
        assert_eq!(updated.is_preferred, true);
        assert_eq!(updated.quality_rating, Some(4.8));
        assert_eq!(updated.delivery_rating, Some(4.2));
        assert_eq!(updated.on_time_delivery_rate, Some(95.0));
        assert_eq!(updated.payment_terms, Some("NET 15".to_string()));
        assert_eq!(updated.lead_time_days, 5);
    }

    #[test]
    fn test_supplier_not_found() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        let result = service.get_supplier("non-existent-id");
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());

        // Try to update non-existent supplier
        let update_request = CreateSupplierRequest {
            name: "Non-existent Supplier".to_string(),
            code: Some("SUP-999".to_string()),
            contact_person: None,
            email: None,
            phone: None,
            website: None,
            address_street: None,
            address_city: None,
            address_state: None,
            address_zip: None,
            address_country: None,
            tax_id: None,
            business_license: None,
            payment_terms: None,
            lead_time_days: None,
            is_preferred: None,
            quality_rating: None,
            delivery_rating: None,
            on_time_delivery_rate: None,
            notes: None,
            special_instructions: None,
        };

        let result = service.update_supplier(
            "non-existent-id",
            update_request,
            Some("test_user".to_string()),
        );
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::NotFound(msg) => {
                assert!(msg.contains("Supplier"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    // === ERROR HANDLING TESTS ===

    #[test]
    fn test_error_handling_duplicate_sku() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Create first material
        let request1 = create_basic_material_request();
        service
            .create_material(request1, Some("test_user".to_string()))
            .unwrap();

        // Try to create material with duplicate SKU
        let mut request2 = create_basic_material_request();
        request2.name = "Different Name".to_string();

        let result = service.create_material(request2, Some("test_user".to_string()));
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("SKU"));
                assert!(msg.contains("already exists"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_error_handling_empty_required_fields() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Test empty name
        let mut request = create_basic_material_request();
        request.name = "".to_string();

        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("name"));
                assert!(msg.contains("required"));
            }
            _ => panic!("Expected Validation error"),
        }

        // Test empty description should work (optional field)
        let mut request2 = create_basic_material_request();
        request2.description = Some("".to_string());

        let result2 = service.create_material(request2, Some("test_user".to_string()));
        assert!(result2.is_ok());
    }

    #[test]
    fn test_error_handling_negative_values() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Test negative minimum stock
        let mut request = create_basic_material_request();
        request.minimum_stock = Some(-10.0);

        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("minimum"));
                assert!(msg.contains("negative"));
            }
            _ => panic!("Expected Validation error"),
        }

        // Test negative maximum stock
        let mut request2 = create_basic_material_request();
        request2.maximum_stock = Some(-50.0);

        let result2 = service.create_material(request2, Some("test_user".to_string()));
        assert!(result2.is_err());

        let error2 = result2.unwrap_err();
        match error2 {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("maximum"));
                assert!(msg.contains("negative"));
            }
            _ => panic!("Expected Validation error"),
        }

        // Test negative reorder point
        let mut request3 = create_basic_material_request();
        request3.reorder_point = Some(-1.0);

        let result3 = service.create_material(request3, Some("test_user".to_string()));
        assert!(result3.is_err());

        let error3 = result3.unwrap_err();
        match error3 {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("reorder"));
                assert!(msg.contains("negative"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_error_handling_update_nonexistent_material() {
        let test_db = TestDatabase::new();
        let service = MaterialService::new(test_db.db());

        // Try to update stock of non-existent material
        let update_request = UpdateStockRequest {
            material_id: "non-existent-id".to_string(),
            quantity_change: 10.0,
            reason: "Test update".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.update_stock(update_request);
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::NotFound(msg) => {
                assert!(msg.contains("not found"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }
}
