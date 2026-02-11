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

    /// Helper function to create a test material with stock
    fn create_test_material_with_stock(
        service: &MaterialService,
        sku: &str,
        initial_stock: f64,
    ) -> Material {
        let mut request = create_basic_material_request();
        request.sku = sku.to_string();
        request.name = format!("Test Material {}", sku);

        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        if initial_stock > 0.0 {
            let update_request = UpdateStockRequest {
                material_id: material.id.clone(),
                quantity_change: initial_stock,
                reason: "Initial stock".to_string(),
                recorded_by: Some("test_user".to_string()),
            };
            service.update_stock(update_request).unwrap();
        }

        material
    }

    #[test]
    fn test_create_material_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
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
        assert!(!material.id.is_empty());
    }

    #[test]
    fn test_create_material_validation_empty_sku() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
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
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let mut request = create_basic_material_request();
        request.name = "".to_string();

        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("Name"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_create_material_validation_stock_thresholds() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let mut request = create_basic_material_request();
        request.minimum_stock = Some(100.0);
        request.maximum_stock = Some(50.0);

        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("Minimum stock"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_create_material_duplicate_sku() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = create_basic_material_request();
        service
            .create_material(request.clone(), Some("test_user".to_string()))
            .unwrap();

        // Try to create another material with same SKU
        let result = service.create_material(request, Some("test_user".to_string()));
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("SKU") && msg.contains("already exists"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_get_material_by_id_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = create_basic_material_request();
        let created = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        let result = service.get_material(&created.id);
        assert!(result.is_ok());

        let material = result.unwrap().unwrap();
        assert_eq!(material.id, created.id);
        assert_eq!(material.sku, "TEST-PPF-001");
    }

    #[test]
    fn test_get_material_by_id_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let result = service.get_material("non-existent-id");
        assert!(result.is_ok());

        let material = result.unwrap();
        assert!(material.is_none());
    }

    #[test]
    fn test_get_material_by_id_success_direct() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = create_basic_material_request();
        let created = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        let result = service.get_material_by_id(&created.id);
        assert!(result.is_ok());

        let material = result.unwrap();
        assert_eq!(material.id, created.id);
        assert_eq!(material.sku, "TEST-PPF-001");
    }

    #[test]
    fn test_get_material_by_id_not_found_direct() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let result = service.get_material_by_id("non-existent-id");
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::NotFound(msg) => {
                assert!(msg.contains("not found"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_get_material_by_sku_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = create_basic_material_request();
        let _created = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        let result = service.get_material_by_sku("TEST-PPF-001");
        assert!(result.is_ok());

        let material = result.unwrap().unwrap();
        assert_eq!(material.sku, "TEST-PPF-001");
        assert_eq!(material.name, "Test PPF Film");
    }

    #[test]
    fn test_get_material_by_sku_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let result = service.get_material_by_sku("NON-EXISTENT-SKU");
        assert!(result.is_ok());

        let material = result.unwrap();
        assert!(material.is_none());
    }

    #[test]
    fn test_list_materials_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        // Create test materials
        let _ppf_material = create_test_material_with_stock(&service, "PPF-001", 50.0);
        let _adhesive_material = create_test_material_with_stock(&service, "ADH-001", 25.0);
        let _tool_material = create_test_material_with_stock(&service, "TOOL-001", 10.0);

        // List all materials
        let result = service.list_materials(None, None, true, None, None);
        assert!(result.is_ok());

        let materials = result.unwrap();
        assert_eq!(materials.len(), 3);
    }

    #[test]
    fn test_list_materials_with_type_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        // Create test materials
        let _ppf_material1 = create_test_material_with_stock(&service, "PPF-001", 50.0);
        let _ppf_material2 = create_test_material_with_stock(&service, "PPF-002", 30.0);
        let _adhesive_material = create_test_material_with_stock(&service, "ADH-001", 25.0);

        // List only PPF films
        let result = service.list_materials(Some(MaterialType::PpfFilm), None, true, None, None);
        assert!(result.is_ok());

        let materials = result.unwrap();
        assert_eq!(materials.len(), 2);
        assert!(materials
            .iter()
            .all(|m| matches!(m.material_type, MaterialType::PpfFilm)));
    }

    #[test]
    fn test_list_materials_with_category_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        // Create test materials
        let mut ppf_request = create_basic_material_request();
        ppf_request.sku = "PPF-001".to_string();
        ppf_request.category = Some("Films".to_string());
        let _ppf_material = service
            .create_material(ppf_request, Some("test_user".to_string()))
            .unwrap();

        let mut adhesive_request = create_basic_material_request();
        adhesive_request.sku = "ADH-001".to_string();
        adhesive_request.material_type = MaterialType::Adhesive;
        adhesive_request.category = Some("Adhesives".to_string());
        let _adhesive_material = service
            .create_material(adhesive_request, Some("test_user".to_string()))
            .unwrap();

        // List only Films category
        let result = service.list_materials(None, Some("Films".to_string()), true, None, None);
        assert!(result.is_ok());

        let materials = result.unwrap();
        assert_eq!(materials.len(), 1);
        assert_eq!(materials[0].category.as_ref().unwrap(), "Films");
    }

    #[test]
    fn test_update_material_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = create_basic_material_request();
        let created = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        let mut update_request = create_basic_material_request();
        update_request.name = "Updated PPF Film".to_string();
        update_request.description = Some("Updated description".to_string());
        update_request.minimum_stock = Some(30.0);

        let result =
            service.update_material(&created.id, update_request, Some("test_user".to_string()));
        assert!(result.is_ok());

        let updated = result.unwrap();
        assert_eq!(updated.id, created.id);
        assert_eq!(updated.name, "Updated PPF Film");
        assert_eq!(updated.description.unwrap(), "Updated description");
        assert_eq!(updated.minimum_stock, Some(30.0));
    }

    #[test]
    fn test_update_material_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = create_basic_material_request();
        let result =
            service.update_material("non-existent-id", request, Some("test_user".to_string()));
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::NotFound(msg) => {
                assert!(msg.contains("not found"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_update_stock_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "STOCK-001", 50.0);

        let update_request = UpdateStockRequest {
            material_id: material.id.clone(),
            quantity_change: 25.0,
            reason: "Purchase order".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.update_stock(update_request);
        assert!(result.is_ok());

        let updated = result.unwrap();
        assert_eq!(updated.current_stock, 75.0);
    }

    #[test]
    fn test_update_stock_insufficient_stock() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "STOCK-002", 10.0);

        let update_request = UpdateStockRequest {
            material_id: material.id.clone(),
            quantity_change: -20.0,
            reason: "Consumption".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.update_stock(update_request);
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::InsufficientStock(msg) => {
                assert!(msg.contains("Cannot reduce stock below 0"));
            }
            _ => panic!("Expected InsufficientStock error"),
        }
    }

    #[test]
    fn test_update_stock_exceeds_maximum() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "STOCK-003", 40.0);

        let update_request = UpdateStockRequest {
            material_id: material.id.clone(),
            quantity_change: 20.0,
            reason: "Purchase order".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.update_stock(update_request);
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("would exceed maximum stock"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_update_stock_inactive_material() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "STOCK-004", 10.0);
        service
            .delete_material(&material.id, Some("test_user".to_string()))
            .unwrap();

        let update_request = UpdateStockRequest {
            material_id: material.id.clone(),
            quantity_change: 5.0,
            reason: "Correction".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.update_stock(update_request);
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("discontinued"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_record_consumption_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "CONSUME-001", 100.0);

        let request = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: material.id.clone(),
            step_id: Some("STEP-001".to_string()),
            step_number: Some(1),
            quantity_used: 25.0,
            waste_quantity: Some(5.0),
            waste_reason: Some("Cutting waste".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.record_consumption(request);
        assert!(result.is_ok());

        let consumption = result.unwrap();
        assert_eq!(consumption.intervention_id, "INT-001");
        assert_eq!(consumption.material_id, material.id);
        assert_eq!(consumption.quantity_used, 25.0);
        assert_eq!(consumption.waste_quantity, 5.0);
        assert_eq!(consumption.batch_used.unwrap(), "BATCH-001");
        assert_eq!(consumption.recorded_by, Some("test_user".to_string()));
    }

    #[test]
    fn test_record_consumption_material_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: "non-existent-material".to_string(),
            step_id: None,
            step_number: None,
            quantity_used: 25.0,
            waste_quantity: None,
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.record_consumption(request);
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::NotFound(msg) => {
                assert!(msg.contains("not found"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_record_consumption_expired_material() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        // Create an expired material
        let mut request = create_basic_material_request();
        request.sku = "EXPIRED-001".to_string();
        request.expiry_date = Some(
            Utc.with_ymd_and_hms(2023, 1, 1, 0, 0, 0)
                .unwrap()
                .timestamp(),
        );
        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        let consume_request = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: material.id.clone(),
            step_id: None,
            step_number: None,
            quantity_used: 10.0,
            waste_quantity: None,
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.record_consumption(consume_request);
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::ExpiredMaterial(msg) => {
                assert!(msg.contains("expired"));
            }
            _ => panic!("Expected ExpiredMaterial error"),
        }
    }

    #[test]
    fn test_record_consumption_insufficient_stock() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "CONSUME-INSUFF", 5.0);

        let request = RecordConsumptionRequest {
            intervention_id: "INT-INSUFF".to_string(),
            material_id: material.id.clone(),
            step_id: None,
            step_number: None,
            quantity_used: 10.0,
            waste_quantity: Some(0.0),
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        };

        let result = service.record_consumption(request);
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::InsufficientStock(msg) => {
                assert!(msg.contains("insufficient stock"));
            }
            _ => panic!("Expected InsufficientStock error"),
        }

        let updated_material = service.get_material(&material.id).unwrap().unwrap();
        assert_eq!(updated_material.current_stock, 5.0);

        let consumptions = service.get_intervention_consumption("INT-INSUFF").unwrap();
        assert!(consumptions.is_empty());
    }

    #[test]
    fn test_get_intervention_consumption() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material1 = create_test_material_with_stock(&service, "MAT-001", 100.0);
        let material2 = create_test_material_with_stock(&service, "MAT-002", 50.0);

        // Record consumption for intervention
        let request1 = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: material1.id.clone(),
            step_id: Some("STEP-001".to_string()),
            step_number: Some(1),
            quantity_used: 25.0,
            waste_quantity: Some(5.0),
            waste_reason: Some("Cutting waste".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some("test_user".to_string()),
        };
        service.record_consumption(request1).unwrap();

        let request2 = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: material2.id.clone(),
            step_id: Some("STEP-002".to_string()),
            step_number: Some(2),
            quantity_used: 15.0,
            waste_quantity: None,
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        };
        service.record_consumption(request2).unwrap();

        // Get consumption for intervention
        let result = service.get_intervention_consumption("INT-001");
        assert!(result.is_ok());

        let consumptions = result.unwrap();
        assert_eq!(consumptions.len(), 2);
    }

    #[test]
    fn test_get_intervention_material_summary() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material1 = create_test_material_with_stock(&service, "MAT-001", 100.0);
        let material2 = create_test_material_with_stock(&service, "MAT-002", 50.0);

        // Record consumption for intervention
        let request1 = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: material1.id.clone(),
            step_id: Some("STEP-001".to_string()),
            step_number: Some(1),
            quantity_used: 25.0,
            waste_quantity: Some(5.0),
            waste_reason: Some("Cutting waste".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some("test_user".to_string()),
        };
        service.record_consumption(request1).unwrap();

        let request2 = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: material2.id.clone(),
            step_id: Some("STEP-002".to_string()),
            step_number: Some(2),
            quantity_used: 15.0,
            waste_quantity: None,
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        };
        service.record_consumption(request2).unwrap();

        // Get material summary for intervention
        let result = service.get_intervention_material_summary("INT-001");
        assert!(result.is_ok());

        let summary = result.unwrap();
        assert_eq!(summary.intervention_id, "INT-001");
        assert_eq!(summary.total_materials_used, 2);
        assert!(summary.total_cost > 0.0);
        assert_eq!(summary.materials.len(), 2);
    }

    #[test]
    fn test_get_material_stats() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        // Create test materials
        let _active_material = create_test_material_with_stock(&service, "ACTIVE-001", 100.0);
        let mut low_stock_request = create_basic_material_request();
        low_stock_request.sku = "LOW-001".to_string();
        low_stock_request.minimum_stock = Some(50.0);
        let low_stock_material = service
            .create_material(low_stock_request, Some("test_user".to_string()))
            .unwrap();

        // Set low stock
        let update_request = UpdateStockRequest {
            material_id: low_stock_material.id.clone(),
            quantity_change: 20.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Create expired material
        let mut expired_request = create_basic_material_request();
        expired_request.sku = "EXP-001".to_string();
        expired_request.expiry_date = Some(
            Utc.with_ymd_and_hms(2023, 1, 1, 0, 0, 0)
                .unwrap()
                .timestamp(),
        );
        let _expired_material = service
            .create_material(expired_request, Some("test_user".to_string()))
            .unwrap();

        // Get stats
        let result = service.get_material_stats();
        assert!(result.is_ok());

        let stats = result.unwrap();
        assert_eq!(stats.total_materials, 3);
        assert_eq!(stats.active_materials, 3);
        assert_eq!(stats.low_stock_materials, 1);
        assert_eq!(stats.expired_materials, 1);
        assert!(stats.total_value > 0.0);
    }

    #[test]
    fn test_get_low_stock_materials() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        // Create normal stock material
        let _normal_material = create_test_material_with_stock(&service, "NORMAL-001", 100.0);

        // Create low stock material
        let mut low_stock_request = create_basic_material_request();
        low_stock_request.sku = "LOW-001".to_string();
        low_stock_request.minimum_stock = Some(50.0);
        let low_stock_material = service
            .create_material(low_stock_request, Some("test_user".to_string()))
            .unwrap();

        // Set low stock
        let update_request = UpdateStockRequest {
            material_id: low_stock_material.id.clone(),
            quantity_change: 20.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        service.update_stock(update_request).unwrap();

        // Get low stock materials
        let result = service.get_low_stock_materials();
        assert!(result.is_ok());

        let low_stock_materials = result.unwrap();
        assert_eq!(low_stock_materials.len(), 1);
        assert_eq!(low_stock_materials[0].sku, "LOW-001");
    }

    #[test]
    fn test_get_expired_materials() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        // Create normal material
        let _normal_material = create_test_material_with_stock(&service, "NORMAL-001", 100.0);

        // Create expired material
        let mut expired_request = create_basic_material_request();
        expired_request.sku = "EXP-001".to_string();
        expired_request.expiry_date = Some(
            Utc.with_ymd_and_hms(2023, 1, 1, 0, 0, 0)
                .unwrap()
                .timestamp(),
        );
        let _expired_material = service
            .create_material(expired_request, Some("test_user".to_string()))
            .unwrap();

        // Get expired materials
        let result = service.get_expired_materials();
        assert!(result.is_ok());

        let expired_materials = result.unwrap();
        assert_eq!(expired_materials.len(), 1);
        assert_eq!(expired_materials[0].sku, "EXP-001");
    }

    #[test]
    fn test_create_material_category_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
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
        assert_eq!(category.code.unwrap(), "TEST-CAT");
        assert_eq!(category.level, 1);
        assert_eq!(category.description.unwrap(), "Test category description");
        assert_eq!(category.color.unwrap(), "#FF0000");
    }

    #[test]
    fn test_create_material_category_validation_empty_name() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let mut request = CreateMaterialCategoryRequest {
            name: "".to_string(),
            code: Some("TEST-CAT".to_string()),
            parent_id: None,
            level: Some(1),
            description: Some("Test category description".to_string()),
            color: Some("#FF0000".to_string()),
        };

        let result = service.create_material_category(request, Some("test_user".to_string()));
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("Category name"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_create_supplier_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = CreateSupplierRequest {
            name: "Test Supplier".to_string(),
            code: Some("TEST-SUP".to_string()),
            contact_person: Some("John Doe".to_string()),
            email: Some("john@example.com".to_string()),
            phone: Some("+1234567890".to_string()),
            website: Some("https://example.com".to_string()),
            address_street: Some("123 Main St".to_string()),
            address_city: Some("Anytown".to_string()),
            address_state: Some("CA".to_string()),
            address_zip: Some("12345".to_string()),
            address_country: Some("USA".to_string()),
            tax_id: Some("TAX-001".to_string()),
            business_license: Some("BIZ-001".to_string()),
            payment_terms: Some("Net 30".to_string()),
            lead_time_days: Some(7),
            is_preferred: Some(true),
            quality_rating: Some(4.5),
            delivery_rating: Some(4.2),
            on_time_delivery_rate: Some(95.0),
            notes: Some("Test notes".to_string()),
            special_instructions: Some("Special instructions".to_string()),
        };

        let result = service.create_supplier(request, Some("test_user".to_string()));
        assert!(result.is_ok());

        let supplier = result.unwrap();
        assert_eq!(supplier.name, "Test Supplier");
        assert_eq!(supplier.code.unwrap(), "TEST-SUP");
        assert_eq!(supplier.contact_person.unwrap(), "John Doe");
        assert_eq!(supplier.email.unwrap(), "john@example.com");
        assert_eq!(supplier.phone.unwrap(), "+1234567890");
        assert_eq!(supplier.website.unwrap(), "https://example.com");
        assert_eq!(supplier.is_preferred, true);
        assert_eq!(supplier.quality_rating.unwrap(), 4.5);
        assert_eq!(supplier.delivery_rating.unwrap(), 4.2);
        assert_eq!(supplier.on_time_delivery_rate.unwrap(), 95.0);
    }

    #[test]
    fn test_create_supplier_validation_empty_name() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let mut request = CreateSupplierRequest {
            name: "".to_string(),
            code: Some("TEST-SUP".to_string()),
            contact_person: Some("John Doe".to_string()),
            email: Some("john@example.com".to_string()),
            phone: Some("+1234567890".to_string()),
            website: Some("https://example.com".to_string()),
            address_street: Some("123 Main St".to_string()),
            address_city: Some("Anytown".to_string()),
            address_state: Some("CA".to_string()),
            address_zip: Some("12345".to_string()),
            address_country: Some("USA".to_string()),
            tax_id: Some("TAX-001".to_string()),
            business_license: Some("BIZ-001".to_string()),
            payment_terms: Some("Net 30".to_string()),
            lead_time_days: Some(7),
            is_preferred: Some(true),
            quality_rating: Some(4.5),
            delivery_rating: Some(4.2),
            on_time_delivery_rate: Some(95.0),
            notes: Some("Test notes".to_string()),
            special_instructions: Some("Special instructions".to_string()),
        };

        let result = service.create_supplier(request, Some("test_user".to_string()));
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::Validation(msg) => {
                assert!(msg.contains("Supplier name"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_create_inventory_transaction_stock_in() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "TRANS-001", 50.0);

        let request = CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
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
            expiry_date: Some(
                Utc.with_ymd_and_hms(2025, 12, 31, 0, 0, 0)
                    .unwrap()
                    .timestamp(),
            ),
            quality_status: Some("Good".to_string()),
            intervention_id: None,
            step_id: None,
        };

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id);
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::StockIn
        );
        assert_eq!(transaction.quantity, 100.0);
        assert_eq!(transaction.previous_stock, 50.0);
        assert_eq!(transaction.new_stock, 150.0);

        // Verify material stock was updated
        let updated_material = service.get_material(&material.id).unwrap().unwrap();
        assert_eq!(updated_material.current_stock, 150.0);
    }

    #[test]
    fn test_create_inventory_transaction_stock_out() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "TRANS-002", 100.0);

        let request = CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockOut,
            quantity: 30.0,
            reference_number: Some("SO-001".to_string()),
            reference_type: Some("Sales Order".to_string()),
            notes: Some("Customer order".to_string()),
            unit_cost: None,
            warehouse_id: Some("WH-001".to_string()),
            location_from: Some("Rack A-1".to_string()),
            location_to: None,
            batch_number: Some("BATCH-001".to_string()),
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id);
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::StockOut
        );
        assert_eq!(transaction.quantity, 30.0);
        assert_eq!(transaction.previous_stock, 100.0);
        assert_eq!(transaction.new_stock, 70.0);

        // Verify material stock was updated
        let updated_material = service.get_material(&material.id).unwrap().unwrap();
        assert_eq!(updated_material.current_stock, 70.0);
    }

    #[test]
    fn test_create_inventory_transaction_adjustment() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "TRANS-003", 50.0);

        let request = CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::Adjustment,
            quantity: 75.0,
            reference_number: Some("ADJ-001".to_string()),
            reference_type: Some("Stock Count".to_string()),
            notes: Some("Physical count adjustment".to_string()),
            unit_cost: None,
            warehouse_id: Some("WH-001".to_string()),
            location_from: None,
            location_to: Some("Rack A-1".to_string()),
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.material_id, material.id);
        assert_eq!(
            transaction.transaction_type,
            InventoryTransactionType::Adjustment
        );
        assert_eq!(transaction.quantity, 75.0);
        assert_eq!(transaction.previous_stock, 50.0);
        assert_eq!(transaction.new_stock, 75.0);

        // Verify material stock was updated
        let updated_material = service.get_material(&material.id).unwrap().unwrap();
        assert_eq!(updated_material.current_stock, 75.0);
    }

    #[test]
    fn test_create_inventory_transaction_insufficient_stock() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "TRANS-004", 20.0);

        let request = CreateInventoryTransactionRequest {
            material_id: material.id.clone(),
            transaction_type: InventoryTransactionType::StockOut,
            quantity: 30.0,
            reference_number: Some("SO-001".to_string()),
            reference_type: Some("Sales Order".to_string()),
            notes: Some("Customer order".to_string()),
            unit_cost: None,
            warehouse_id: Some("WH-001".to_string()),
            location_from: Some("Rack A-1".to_string()),
            location_to: None,
            batch_number: Some("BATCH-001".to_string()),
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

        let result = service.create_inventory_transaction(request, "test_user");
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::InsufficientStock(msg) => {
                assert!(msg.contains("Insufficient stock"));
            }
            _ => panic!("Expected InsufficientStock error"),
        }
    }

    #[test]
    fn test_create_inventory_transaction_material_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = CreateInventoryTransactionRequest {
            material_id: "non-existent-material".to_string(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 30.0,
            reference_number: Some("PO-001".to_string()),
            reference_type: Some("Purchase Order".to_string()),
            notes: Some("Test purchase".to_string()),
            unit_cost: Some(15.50),
            warehouse_id: Some("WH-001".to_string()),
            location_from: None,
            location_to: Some("Rack A-1".to_string()),
            batch_number: Some("BATCH-001".to_string()),
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

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
    fn test_get_transaction_history() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "HIST-001", 50.0);

        // Create multiple transactions
        for i in 1..=5 {
            let transaction_type = if i % 2 == 0 {
                InventoryTransactionType::StockOut
            } else {
                InventoryTransactionType::StockIn
            };

            let request = CreateInventoryTransactionRequest {
                material_id: material.id.clone(),
                transaction_type,
                quantity: 10.0,
                reference_number: Some(format!("REF-{:03}", i)),
                reference_type: Some("Test".to_string()),
                notes: Some(format!("Test transaction {}", i)),
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

            service
                .create_inventory_transaction(request, "test_user")
                .unwrap();
        }

        // Get transaction history
        let result = service.get_transaction_history(&material.id, None, None);
        assert!(result.is_ok());

        let transactions = result.unwrap();
        assert_eq!(transactions.len(), 5);
    }

    #[test]
    fn test_get_transaction_history_with_type_filter() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "HIST-002", 50.0);

        // Create multiple transactions
        for i in 1..=5 {
            let transaction_type = if i % 2 == 0 {
                InventoryTransactionType::StockOut
            } else {
                InventoryTransactionType::StockIn
            };

            let request = CreateInventoryTransactionRequest {
                material_id: material.id.clone(),
                transaction_type,
                quantity: 10.0,
                reference_number: Some(format!("REF-{:03}", i)),
                reference_type: Some("Test".to_string()),
                notes: Some(format!("Test transaction {}", i)),
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

            service
                .create_inventory_transaction(request, "test_user")
                .unwrap();
        }

        // Get only StockIn transactions
        let result = service.get_transaction_history(
            &material.id,
            Some(InventoryTransactionType::StockIn),
            None,
        );
        assert!(result.is_ok());

        let transactions = result.unwrap();
        assert_eq!(transactions.len(), 3);
        assert!(transactions
            .iter()
            .all(|t| matches!(t.transaction_type, InventoryTransactionType::StockIn)));
    }

    #[test]
    fn test_get_transaction_history_with_limit() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let material = create_test_material_with_stock(&service, "HIST-003", 50.0);

        // Create multiple transactions
        for i in 1..=10 {
            let request = CreateInventoryTransactionRequest {
                material_id: material.id.clone(),
                transaction_type: InventoryTransactionType::StockIn,
                quantity: 10.0,
                reference_number: Some(format!("REF-{:03}", i)),
                reference_type: Some("Test".to_string()),
                notes: Some(format!("Test transaction {}", i)),
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

            service
                .create_inventory_transaction(request, "test_user")
                .unwrap();
        }

        // Get limited transaction history
        let result = service.get_transaction_history(&material.id, None, Some(5));
        assert!(result.is_ok());

        let transactions = result.unwrap();
        assert_eq!(transactions.len(), 5);
    }

    #[test]
    fn test_delete_material_success() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let request = create_basic_material_request();
        let material = service
            .create_material(request, Some("test_user".to_string()))
            .unwrap();

        // Delete material
        let result = service.delete_material(&material.id, Some("test_user".to_string()));
        assert!(result.is_ok());

        // Verify material is soft deleted (inactive and discontinued)
        let deleted = service.get_material(&material.id).unwrap().unwrap();
        assert!(!deleted.is_active);
        assert!(deleted.is_discontinued);
    }

    #[test]
    fn test_delete_material_not_found() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        let result = service.delete_material("non-existent-id", Some("test_user".to_string()));
        assert!(result.is_err());

        match result.unwrap_err() {
            MaterialError::NotFound(msg) => {
                assert!(msg.contains("not found"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_list_materials_with_pagination() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = MaterialService::new(test_db.db());

        // Create test materials
        for i in 1..=10 {
            create_test_material_with_stock(&service, &format!("MAT-{:03}", i), 10.0);
        }

        // Get first page
        let result = service.list_materials(None, None, true, Some(5), Some(0));
        assert!(result.is_ok());

        let first_page = result.unwrap();
        assert_eq!(first_page.len(), 5);

        // Get second page
        let result = service.list_materials(None, None, true, Some(5), Some(5));
        assert!(result.is_ok());

        let second_page = result.unwrap();
        assert_eq!(second_page.len(), 5);

        // Verify no overlap
        let first_ids: std::collections::HashSet<String> =
            first_page.iter().map(|m| m.id.clone()).collect();
        let second_ids: std::collections::HashSet<String> =
            second_page.iter().map(|m| m.id.clone()).collect();
        assert!(first_ids.intersection(&second_ids).count() == 0);
    }
}
