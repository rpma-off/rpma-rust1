//! Integration tests for Inventory Management Commands
//!
//! This module contains comprehensive integration tests for material management IPC commands,
//! focusing on end-to-end flows, authentication, validation, and error handling.

use crate::commands::AppState;
use crate::models::material::{InventoryTransactionType, MaterialType, UnitOfMeasure};
use crate::services::material::{
    CreateInventoryTransactionRequest, CreateMaterialCategoryRequest, CreateMaterialRequest,
    CreateSupplierRequest, RecordConsumptionRequest, UpdateStockRequest,
};
use crate::test_utils::{TestDataFactory, TestDatabase};
use chrono::{DateTime, TimeZone, Utc};
use serde_json::json;

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper function to create a test app state with a material
    fn create_test_state_with_material() -> (AppState<'static>, String) {
        let test_db = TestDatabase::new();
        let db = test_db.db();
        let state = AppState {
            db: Box::leak(Box::new(db)),
            material_service: std::sync::Arc::new(tokio::sync::Mutex::new(
                crate::services::material::MaterialService::new(test_db.db())
            )),
            // Add other fields as needed for AppState
        };

        // Create a test material
        let material_request = CreateMaterialRequest {
            sku: "TEST-MAT-001".to_string(),
            name: "Test Material".to_string(),
            description: Some("Test material for integration tests".to_string()),
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
        };

        let service = state.material_service.clone();
        let material = tokio::task::block_in_place(|| {
            let mut service = service.blocking_lock();
            service.create_material(material_request, Some("test_user".to_string()))
        }).unwrap();

        (state, material.id.unwrap())
    }

    /// Helper function to create a test app state without materials
    fn create_test_state() -> AppState<'static> {
        let test_db = TestDatabase::new();
        let db = test_db.db();
        AppState {
            db: Box::leak(Box::new(db)),
            material_service: std::sync::Arc::new(tokio::sync::Mutex::new(
                crate::services::material::MaterialService::new(test_db.db())
            )),
            // Add other fields as needed for AppState
        }
    }

    #[tokio::test]
    async fn test_material_create_command_success() {
        let state = create_test_state();
        
        let request = CreateMaterialRequest {
            sku: "CMD-TEST-001".to_string(),
            name: "Command Test Material".to_string(),
            description: Some("Material created via command".to_string()),
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
        };

        let result = crate::commands::material::material_create(state, request, "test_user".to_string()).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let material = response.data.unwrap();
        assert_eq!(material.sku, "CMD-TEST-001");
        assert_eq!(material.name, "Command Test Material");
        assert_eq!(material.material_type, MaterialType::PpfFilm);
        assert_eq!(material.unit_of_measure, UnitOfMeasure::Meter);
        assert_eq!(material.current_stock, 0.0);
        assert_eq!(material.minimum_stock, Some(20.0));
        assert_eq!(material.maximum_stock, Some(500.0));
        assert_eq!(material.created_by, Some("test_user".to_string()));
        assert!(!material.id.is_empty());
    }

    #[tokio::test]
    async fn test_material_create_command_validation_error() {
        let state = create_test_state();
        
        let mut request = CreateMaterialRequest {
            sku: "".to_string(), // Empty SKU should cause validation error
            name: "Command Test Material".to_string(),
            description: Some("Material created via command".to_string()),
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
        };

        let result = crate::commands::material::material_create(state, request, "test_user".to_string()).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("SKU"));
    }

    #[tokio::test]
    async fn test_material_get_command_success() {
        let (state, material_id) = create_test_state_with_material();
        
        let result = crate::commands::material::material_get(state, material_id).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let material = response.data.unwrap();
        assert_eq!(material.id, material_id);
        assert_eq!(material.sku, "TEST-MAT-001");
        assert_eq!(material.name, "Test Material");
    }

    #[tokio::test]
    async fn test_material_get_command_not_found() {
        let state = create_test_state();
        
        let result = crate::commands::material::material_get(state, "non-existent-id".to_string()).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_none());
    }

    #[tokio::test]
    async fn test_material_get_by_sku_command_success() {
        let (state, _) = create_test_state_with_material();
        
        let result = crate::commands::material::material_get_by_sku(state, "TEST-MAT-001".to_string()).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let material = response.data.unwrap();
        assert_eq!(material.sku, "TEST-MAT-001");
        assert_eq!(material.name, "Test Material");
    }

    #[tokio::test]
    async fn test_material_get_by_sku_command_not_found() {
        let state = create_test_state();
        
        let result = crate::commands::material::material_get_by_sku(state, "NON-EXISTENT-SKU".to_string()).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_none());
    }

    #[tokio::test]
    async fn test_material_list_command_success() {
        let state = create_test_state();
        
        // Create multiple test materials
        for i in 1..=5 {
            let request = CreateMaterialRequest {
                sku: format!("LIST-TEST-{:03}", i),
                name: format!("List Test Material {}", i),
                description: Some("Test material for list command".to_string()),
                material_type: if i % 2 == 0 { MaterialType::PpfFilm } else { MaterialType::Adhesive },
                category: Some(if i % 2 == 0 { "Films" } else { "Adhesives" }.to_string()),
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure: UnitOfMeasure::Meter,
                minimum_stock: Some(20.0),
                maximum_stock: Some(500.0),
                reorder_point: Some(25.0),
                unit_cost: Some(15.50),
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

            crate::commands::material::material_create(state.clone(), request, "test_user".to_string()).await.unwrap();
        }

        // List all materials
        let result = crate::commands::material::material_list(
            state.clone(),
            None, // material_type
            None, // category
            Some(true), // active_only
            None, // limit
            None, // offset
        ).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let materials = response.data.unwrap();
        assert_eq!(materials.len(), 5);
    }

    #[tokio::test]
    async fn test_material_list_command_with_filter() {
        let state = create_test_state();
        
        // Create test materials of different types
        for i in 1..=4 {
            let material_type = match i {
                1 | 2 => MaterialType::PpfFilm,
                3 => MaterialType::Adhesive,
                _ => MaterialType::Tool,
            };

            let request = CreateMaterialRequest {
                sku: format!("FILTER-TEST-{:03}", i),
                name: format!("Filter Test Material {}", i),
                description: Some("Test material for filter".to_string()),
                material_type,
                category: Some(if i <= 2 { "Films" } else { "Other" }.to_string()),
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure: UnitOfMeasure::Meter,
                minimum_stock: Some(20.0),
                maximum_stock: Some(500.0),
                reorder_point: Some(25.0),
                unit_cost: Some(15.50),
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

            crate::commands::material::material_create(state.clone(), request, "test_user".to_string()).await.unwrap();
        }

        // List only PPF films
        let result = crate::commands::material::material_list(
            state.clone(),
            Some("ppf_film".to_string()), // material_type
            None, // category
            Some(true), // active_only
            None, // limit
            None, // offset
        ).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let materials = response.data.unwrap();
        assert_eq!(materials.len(), 2);
        assert!(materials.iter().all(|m| matches!(m.material_type, MaterialType::PpfFilm)));
    }

    #[tokio::test]
    async fn test_material_update_command_success() {
        let (state, material_id) = create_test_state_with_material();
        
        let request = CreateMaterialRequest {
            sku: "TEST-MAT-001".to_string(),
            name: "Updated Test Material".to_string(),
            description: Some("Updated description".to_string()),
            material_type: MaterialType::PpfFilm,
            category: Some("Films".to_string()),
            subcategory: Some("Updated".to_string()),
            category_id: None,
            brand: Some("UpdatedBrand".to_string()),
            model: Some("UpdatedModel".to_string()),
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(30.0),
            maximum_stock: Some(600.0),
            reorder_point: Some(35.0),
            unit_cost: Some(20.00),
            currency: Some("USD".to_string()),
            supplier_id: None,
            supplier_name: Some("Updated Supplier".to_string()),
            supplier_sku: Some("UPD-SUP-001".to_string()),
            quality_grade: Some("Standard".to_string()),
            certification: Some("ISO-14001".to_string()),
            expiry_date: None,
            batch_number: None,
            storage_location: Some("Warehouse B".to_string()),
            warehouse_id: None,
        };

        let result = crate::commands::material::material_update(
            state,
            material_id.clone(),
            request,
            "test_user".to_string(),
        ).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let material = response.data.unwrap();
        assert_eq!(material.id, material_id);
        assert_eq!(material.name, "Updated Test Material");
        assert_eq!(material.description.unwrap(), "Updated description");
        assert_eq!(material.minimum_stock, Some(30.0));
        assert_eq!(material.maximum_stock, Some(600.0));
        assert_eq!(material.unit_cost, Some(20.00));
        assert_eq!(material.currency, "USD");
        assert_eq!(material.updated_by, Some("test_user".to_string()));
    }

    #[tokio::test]
    async fn test_material_update_command_not_found() {
        let state = create_test_state();
        
        let request = CreateMaterialRequest {
            sku: "NON-EXISTENT-001".to_string(),
            name: "Non-existent Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
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

        let result = crate::commands::material::material_update(
            state,
            "non-existent-id".to_string(),
            request,
            "test_user".to_string(),
        ).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("not found"));
    }

    #[tokio::test]
    async fn test_material_update_stock_command_success() {
        let (state, material_id) = create_test_state_with_material();
        
        // First update stock
        let initial_update = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: 100.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = crate::commands::material::material_update_stock(state.clone(), initial_update).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let material = response.data.unwrap();
        assert_eq!(material.id, material_id);
        assert_eq!(material.current_stock, 100.0);

        // Second update to increase stock
        let second_update = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: 50.0,
            reason: "Purchase order".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = crate::commands::material::material_update_stock(state.clone(), second_update).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let material = response.data.unwrap();
        assert_eq!(material.current_stock, 150.0);

        // Third update to decrease stock
        let third_update = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: -25.0,
            reason: "Consumption".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = crate::commands::material::material_update_stock(state, third_update).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let material = response.data.unwrap();
        assert_eq!(material.current_stock, 125.0);
    }

    #[tokio::test]
    async fn test_material_update_stock_command_insufficient_stock() {
        let (state, material_id) = create_test_state_with_material();
        
        // First update to set some stock
        let initial_update = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: 50.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        crate::commands::material::material_update_stock(state.clone(), initial_update).await.unwrap();

        // Try to reduce more than available
        let excessive_update = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: -100.0,
            reason: "Excessive consumption".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let result = crate::commands::material::material_update_stock(state, excessive_update).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("Cannot reduce stock below 0"));
    }

    #[tokio::test]
    async fn test_material_record_consumption_command_success() {
        let (state, material_id) = create_test_state_with_material();
        
        // First update stock
        let stock_update = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: 100.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        crate::commands::material::material_update_stock(state.clone(), stock_update).await.unwrap();

        // Record consumption
        let consumption_request = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: material_id.clone(),
            step_id: Some("STEP-001".to_string()),
            step_number: Some(1),
            quantity_used: 25.0,
            waste_quantity: Some(5.0),
            waste_reason: Some("Cutting waste".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        let result = crate::commands::material::material_record_consumption(state.clone(), consumption_request).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let consumption = response.data.unwrap();
        assert_eq!(consumption.intervention_id, "INT-001");
        assert_eq!(consumption.material_id, material_id);
        assert_eq!(consumption.quantity_used, 25.0);
        assert_eq!(consumption.waste_quantity, 5.0);
        assert_eq!(consumption.batch_used.unwrap(), "BATCH-001");

        // Verify material stock was updated
        let get_result = crate::commands::material::material_get(state, material_id).await;
        assert!(get_result.is_ok());
        let get_response = get_result.unwrap();
        assert!(get_response.success);
        
        let material = get_response.data.unwrap();
        assert_eq!(material.current_stock, 70.0); // 100 - 25 - 5
    }

    #[tokio::test]
    async fn test_material_record_consumption_command_not_found() {
        let state = create_test_state();
        
        let consumption_request = RecordConsumptionRequest {
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

        let result = crate::commands::material::material_record_consumption(state, consumption_request).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("not found"));
    }

    #[tokio::test]
    async fn test_material_get_intervention_consumption_command_success() {
        let (state, material_id) = create_test_state_with_material();
        
        // Update stock
        let stock_update = UpdateStockRequest {
            material_id: material_id.clone(),
            quantity_change: 100.0,
            reason: "Initial stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        crate::commands::material::material_update_stock(state.clone(), stock_update).await.unwrap();

        // Record consumption
        let consumption_request = RecordConsumptionRequest {
            intervention_id: "INT-001".to_string(),
            material_id: material_id.clone(),
            step_id: Some("STEP-001".to_string()),
            step_number: Some(1),
            quantity_used: 25.0,
            waste_quantity: Some(5.0),
            waste_reason: Some("Cutting waste".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        crate::commands::material::material_record_consumption(state.clone(), consumption_request).await.unwrap();

        // Get intervention consumption
        let result = crate::commands::material::material_get_intervention_consumption(
            state,
            "INT-001".to_string(),
        ).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let consumptions = response.data.unwrap();
        assert_eq!(consumptions.len(), 1);
        assert_eq!(consumptions[0].intervention_id, "INT-001");
        assert_eq!(consumptions[0].material_id, material_id);
        assert_eq!(consumptions[0].quantity_used, 25.0);
    }

    #[tokio::test]
    async fn test_material_get_intervention_consumption_command_empty() {
        let state = create_test_state();
        
        // Get consumption for non-existent intervention
        let result = crate::commands::material::material_get_intervention_consumption(
            state,
            "NON-EXISTENT-INT".to_string(),
        ).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let consumptions = response.data.unwrap();
        assert_eq!(consumptions.len(), 0);
    }

    #[tokio::test]
    async fn test_material_get_stats_command_success() {
        let state = create_test_state();
        
        // Create test materials
        for i in 1..=5 {
            let request = CreateMaterialRequest {
                sku: format!("STATS-TEST-{:03}", i),
                name: format!("Stats Test Material {}", i),
                description: Some("Test material for stats".to_string()),
                material_type: if i % 2 == 0 { MaterialType::PpfFilm } else { MaterialType::Adhesive },
                category: Some(if i % 2 == 0 { "Films" } else { "Adhesives" }.to_string()),
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure: UnitOfMeasure::Meter,
                minimum_stock: Some(20.0),
                maximum_stock: Some(500.0),
                reorder_point: Some(25.0),
                unit_cost: Some(15.50),
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

            crate::commands::material::material_create(state.clone(), request, "test_user".to_string()).await.unwrap();
        }

        // Get material stats
        let result = crate::commands::material::material_get_stats(state).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let stats = response.data.unwrap();
        assert_eq!(stats.total_materials, 5);
        assert_eq!(stats.active_materials, 5);
        assert!(stats.total_value > 0.0);
        assert!(!stats.materials_by_type.is_empty());
    }

    #[tokio::test]
    async fn test_material_get_low_stock_command_success() {
        let state = create_test_state();
        
        // Create normal stock material
        let normal_request = CreateMaterialRequest {
            sku: "NORMAL-001".to_string(),
            name: "Normal Stock Material".to_string(),
            description: Some("Material with normal stock".to_string()),
            material_type: MaterialType::PpfFilm,
            category: Some("Films".to_string()),
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(20.0),
            maximum_stock: Some(500.0),
            reorder_point: Some(25.0),
            unit_cost: Some(15.50),
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

        let normal_material = crate::commands::material::material_create(state.clone(), normal_request, "test_user".to_string()).await.unwrap();
        let normal_id = normal_material.data.unwrap().id;

        // Update normal stock
        let normal_stock_update = UpdateStockRequest {
            material_id: normal_id.clone(),
            quantity_change: 100.0,
            reason: "Normal stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        crate::commands::material::material_update_stock(state.clone(), normal_stock_update).await.unwrap();

        // Create low stock material
        let low_stock_request = CreateMaterialRequest {
            sku: "LOW-001".to_string(),
            name: "Low Stock Material".to_string(),
            description: Some("Material with low stock".to_string()),
            material_type: MaterialType::Adhesive,
            category: Some("Adhesives".to_string()),
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Liter,
            minimum_stock: Some(50.0),
            maximum_stock: Some(500.0),
            reorder_point: Some(75.0),
            unit_cost: Some(25.00),
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

        let low_stock_material = crate::commands::material::material_create(state.clone(), low_stock_request, "test_user".to_string()).await.unwrap();
        let low_stock_id = low_stock_material.data.unwrap().id;

        // Update low stock
        let low_stock_update = UpdateStockRequest {
            material_id: low_stock_id.clone(),
            quantity_change: 20.0,
            reason: "Low stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        };
        crate::commands::material::material_update_stock(state, low_stock_update).await.unwrap();

        // Get low stock materials
        let result = crate::commands::material::material_get_low_stock(state).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let low_stock_materials = response.data.unwrap();
        assert_eq!(low_stock_materials.len(), 1);
        assert_eq!(low_stock_materials[0].sku, "LOW-001");
    }

    #[tokio::test]
    async fn test_material_get_expired_command_success() {
        let state = create_test_state();
        
        // Create normal material
        let normal_request = CreateMaterialRequest {
            sku: "NORMAL-EXP-001".to_string(),
            name: "Normal Material".to_string(),
            description: Some("Material with future expiry".to_string()),
            material_type: MaterialType::PpfFilm,
            category: Some("Films".to_string()),
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(20.0),
            maximum_stock: Some(500.0),
            reorder_point: Some(25.0),
            unit_cost: Some(15.50),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: Some(Utc.with_ymd_and_hms(2025, 12, 31, 0, 0, 0).unwrap()),
            batch_number: None,
            storage_location: None,
            warehouse_id: None,
        };

        crate::commands::material::material_create(state.clone(), normal_request, "test_user".to_string()).await.unwrap();

        // Create expired material
        let expired_request = CreateMaterialRequest {
            sku: "EXP-001".to_string(),
            name: "Expired Material".to_string(),
            description: Some("Material with past expiry".to_string()),
            material_type: MaterialType::Adhesive,
            category: Some("Adhesives".to_string()),
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Liter,
            minimum_stock: Some(20.0),
            maximum_stock: Some(500.0),
            reorder_point: Some(25.0),
            unit_cost: Some(25.00),
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

        crate::commands::material::material_create(state, expired_request, "test_user".to_string()).await.unwrap();

        // Get expired materials
        let result = crate::commands::material::material_get_expired(state).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let expired_materials = response.data.unwrap();
        assert_eq!(expired_materials.len(), 1);
        assert_eq!(expired_materials[0].sku, "EXP-001");
    }

    #[tokio::test]
    async fn test_material_create_inventory_transaction_command_success() {
        let (state, material_id) = create_test_state_with_material();
        
        let request = CreateInventoryTransactionRequest {
            material_id: material_id.clone(),
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
        };

        let result = crate::commands::material::material_create_inventory_transaction(state, request, "test_user".to_string()).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let transaction = response.data.unwrap();
        assert_eq!(transaction.material_id, material_id);
        assert_eq!(transaction.transaction_type, InventoryTransactionType::StockIn);
        assert_eq!(transaction.quantity, 100.0);
        assert_eq!(transaction.reference_number.unwrap(), "PO-001");
        assert_eq!(transaction.performed_by, "test_user");
    }

    #[tokio::test]
    async fn test_material_create_inventory_transaction_command_insufficient_stock() {
        let (state, material_id) = create_test_state_with_material();
        
        let request = CreateInventoryTransactionRequest {
            material_id: material_id.clone(),
            transaction_type: InventoryTransactionType::StockOut,
            quantity: 50.0, // More than available (0)
            reference_number: Some("SO-001".to_string()),
            reference_type: Some("Sales Order".to_string()),
            notes: Some("Test stock out".to_string()),
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

        let result = crate::commands::material::material_create_inventory_transaction(state, request, "test_user".to_string()).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("Insufficient stock"));
    }

    #[tokio::test]
    async fn test_material_create_inventory_transaction_command_not_found() {
        let state = create_test_state();
        
        let request = CreateInventoryTransactionRequest {
            material_id: "non-existent-material".to_string(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 50.0,
            reference_number: Some("PO-001".to_string()),
            reference_type: Some("Purchase Order".to_string()),
            notes: Some("Test stock in".to_string()),
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

        let result = crate::commands::material::material_create_inventory_transaction(state, request, "test_user".to_string()).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("not found"));
    }

    #[tokio::test]
    async fn test_material_delete_command_success() {
        let (state, material_id) = create_test_state_with_material();
        
        let result = crate::commands::material::material_delete(state, material_id.clone(), "test_user".to_string()).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);

        // Verify material is soft deleted
        let get_result = crate::commands::material::material_get(state, material_id).await;
        assert!(get_result.is_ok());
        let get_response = get_result.unwrap();
        assert!(get_response.success);
        assert!(get_response.data.is_some());

        let material = get_response.data.unwrap();
        assert!(!material.is_active);
        assert!(material.is_discontinued);
    }

    #[tokio::test]
    async fn test_material_delete_command_not_found() {
        let state = create_test_state();
        
        let result = crate::commands::material::material_delete(state, "non-existent-id".to_string(), "test_user".to_string()).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("not found"));
    }

    #[tokio::test]
    async fn test_material_create_category_command_success() {
        let state = create_test_state();
        
        let request = CreateMaterialCategoryRequest {
            name: "Test Category".to_string(),
            code: Some("TEST-CAT".to_string()),
            parent_id: None,
            level: Some(1),
            description: Some("Test category description".to_string()),
            color: Some("#FF0000".to_string()),
        };

        let result = crate::commands::material::material_create_category(state, request, "test_user".to_string()).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let category = response.data.unwrap();
        assert_eq!(category.name, "Test Category");
        assert_eq!(category.code.unwrap(), "TEST-CAT");
        assert_eq!(category.level, 1);
        assert_eq!(category.description.unwrap(), "Test category description");
        assert_eq!(category.color.unwrap(), "#FF0000");
    }

    #[tokio::test]
    async fn test_material_create_category_command_validation_error() {
        let state = create_test_state();
        
        let mut request = CreateMaterialCategoryRequest {
            name: "".to_string(), // Empty name should cause validation error
            code: Some("TEST-CAT".to_string()),
            parent_id: None,
            level: Some(1),
            description: Some("Test category description".to_string()),
            color: Some("#FF0000".to_string()),
        };

        let result = crate::commands::material::material_create_category(state, request, "test_user".to_string()).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("Category name"));
    }

    #[tokio::test]
    async fn test_material_create_supplier_command_success() {
        let state = create_test_state();
        
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

        let result = crate::commands::material::material_create_supplier(state, request, "test_user".to_string()).await;
        
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.data.is_some());

        let supplier = response.data.unwrap();
        assert_eq!(supplier.name, "Test Supplier");
        assert_eq!(supplier.code.unwrap(), "TEST-SUP");
        assert_eq!(supplier.contact_person.unwrap(), "John Doe");
        assert_eq!(supplier.email.unwrap(), "john@example.com");
        assert_eq!(supplier.phone.unwrap(), "+1234567890");
        assert_eq!(supplier.is_preferred, true);
    }

    #[tokio::test]
    async fn test_material_create_supplier_command_validation_error() {
        let state = create_test_state();
        
        let mut request = CreateSupplierRequest {
            name: "".to_string(), // Empty name should cause validation error
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

        let result = crate::commands::material::material_create_supplier(state, request, "test_user".to_string()).await;
        
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("Supplier name"));
    }
}