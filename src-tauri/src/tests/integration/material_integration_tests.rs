//! Integration tests for material workflow
//!
//! This module contains comprehensive integration tests for material workflow,
//! testing end-to-end material operations and their integration with other domains.

use crate::domains::tasks::infrastructure::task_creation::TaskCreationService;
use crate::models::intervention::InterventionStatus;
use crate::models::material::{InventoryTransactionType, MaterialType, UnitOfMeasure};
use crate::models::task::{CreateTaskRequest, TaskPriority, TaskStatus};
use crate::domains::interventions::infrastructure::intervention_workflow::InterventionWorkflowService;
use crate::domains::inventory::infrastructure::material::{
    CreateInventoryTransactionRequest, CreateMaterialRequest, MaterialService,
    RecordConsumptionRequest, UpdateStockRequest,
};
use crate::test_utils::TestDatabase;
use chrono::{DateTime, TimeZone, Utc};
use std::collections::HashMap;

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper function to create a test material with stock
    fn create_test_material_with_stock(
        service: &MaterialService,
        sku: &str,
        name: &str,
        stock: f64,
    ) -> crate::models::material::Material {
        let request = CreateMaterialRequest {
            sku: sku.to_string(),
            name: name.to_string(),
            description: Some(format!("Test material: {}", name)),
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

        if stock > 0.0 {
            let update_request = UpdateStockRequest {
                material_id: material.id.clone().unwrap(),
                quantity_change: stock,
                reason: "Initial stock".to_string(),
                recorded_by: Some("test_user".to_string()),
            };
            service.update_stock(update_request).unwrap();
        }

        material
    }

    /// Helper function to create a test task
    fn create_test_task(
        task_service: &TaskCreationService,
        title: &str,
    ) -> crate::models::task::Task {
        let request = CreateTaskRequest {
            title: Some(title.to_string()),
            description: Some("Test task for integration".to_string()),
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Test Model".to_string(),
            vehicle_year: None,
            vehicle_make: Some("Test Make".to_string()),
            vin: None,
            ppf_zones: vec!["hood".to_string(), "fender".to_string()],
            custom_ppf_zones: None,
            status: Some(TaskStatus::Pending),
            priority: Some(TaskPriority::Medium),
            technician_id: None,
            scheduled_date: "2025-02-03".to_string(),
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            template_id: None,
            workflow_id: None,
            client_id: None,
            customer_name: Some("Test Customer".to_string()),
            customer_email: Some("customer@example.com".to_string()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("123 Test St".to_string()),
            external_id: None,
            lot_film: None,
            checklist_completed: None,
            notes: Some("Integration test task".to_string()),
            tags: None,
            estimated_duration: Some(120),
        };

        task_service.create_task_sync(request, "test_user").unwrap()
    }

    /// Helper function to create a test intervention
    fn create_test_intervention(
        _intervention_service: &InterventionWorkflowService,
        task_id: &str,
    ) -> crate::models::intervention::Intervention {
        // For now, just return a dummy intervention with the task_id
        // In a real implementation, you would create the intervention through the service
        crate::models::intervention::Intervention {
            id: Some("test-intervention-001".to_string()),
            task_id: task_id.to_string(),
            workflow_id: "default-ppf-workflow".to_string(),
            technician_id: Some("tech-001".to_string()),
            status: InterventionStatus::InProgress,
            scheduled_date: Some("2025-02-03".to_string()),
            start_date: None,
            end_date: None,
            notes: Some("Integration test intervention".to_string()),
            custom_fields: None,
            created_at: "2025-02-03T10:00:00Z".to_string(),
            updated_at: "2025-02-03T10:00:00Z".to_string(),
            created_by: "test_user".to_string(),
            updated_by: "test_user".to_string(),
        }
    }

    #[test]
    fn test_material_crud_workflow() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let material_service = MaterialService::new(test_db.db());

        // 1. Create a material
        let material = create_test_material_with_stock(
            &material_service,
            "CRUD-WORKFLOW-001",
            "CRUD Workflow Test Material",
            0.0,
        );

        assert_eq!(material.sku, "CRUD-WORKFLOW-001");
        assert_eq!(material.current_stock, 0.0);

        // 2. Update stock
        let update_request = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 100.0,
            reason: "Initial inventory".to_string(),
            recorded_by: Some("test_user".to_string()),
        };

        let updated = material_service.update_stock(update_request).unwrap();
        assert_eq!(updated.current_stock, 100.0);

        // 3. Create inventory transaction
        let transaction_request = CreateInventoryTransactionRequest {
            material_id: material.id.clone().unwrap(),
            transaction_type: InventoryTransactionType::StockIn,
            quantity: 50.0,
            reference_number: Some("PO-001".to_string()),
            reference_type: Some("Purchase Order".to_string()),
            notes: Some("Additional stock".to_string()),
            unit_cost: Some(15.50),
            warehouse_id: Some("WH-001".to_string()),
            location_from: None,
            location_to: Some("Rack-A1".to_string()),
            batch_number: Some("BATCH-001".to_string()),
            expiry_date: Some(Utc.with_ymd_and_hms(2025, 12, 31, 0, 0, 0).unwrap()),
            quality_status: Some("Good".to_string()),
            intervention_id: None,
            step_id: None,
        };

        let transaction = material_service
            .create_inventory_transaction(transaction_request, Some("test_user".to_string()))
            .unwrap();

        assert_eq!(transaction.material_id, material.id.unwrap());
        assert_eq!(transaction.quantity, 50.0);

        // 4. Verify stock was updated
        let final_material = material_service
            .get_material_by_id(material.id.unwrap().as_str())
            .unwrap();
        assert_eq!(final_material.current_stock, 150.0); // 100 + 50

        // 5. Delete material (soft delete)
        let result = material_service
            .delete_material(material.id.unwrap().as_str(), Some("test_user".to_string()));
        assert!(result.is_ok());

        let deleted_material = material_service
            .get_material_by_id(material.id.unwrap().as_str())
            .unwrap();
        assert!(deleted_material.is_deleted);
    }

    #[test]
    fn test_material_consumption_workflow() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let material_service = MaterialService::new(test_db.db());

        // 1. Create materials with stock
        let ppf_film = create_test_material_with_stock(
            &material_service,
            "CONSUME-FILM-001",
            "PPF Film for consumption",
            100.0,
        );

        let adhesive = create_test_material_with_stock(
            &material_service,
            "CONSUME-ADHESIVE-001",
            "Adhesive for consumption",
            50.0,
        );

        // 2. Record consumption during intervention
        let consumption_request1 = RecordConsumptionRequest {
            intervention_id: "intervention-001".to_string(),
            material_id: ppf_film.id.clone().unwrap(),
            step_id: Some("step-001".to_string()),
            step_number: Some(1),
            quantity_used: 15.0,
            waste_quantity: Some(2.0),
            waste_reason: Some("Trimming".to_string()),
            batch_used: Some("BATCH-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        let consumption1 = material_service
            .record_consumption(consumption_request1)
            .unwrap();
        assert_eq!(consumption1.material_id, ppf_film.id.unwrap());
        assert_eq!(consumption1.quantity_used, 15.0);
        assert_eq!(consumption1.waste_quantity, Some(2.0));

        let consumption_request2 = RecordConsumptionRequest {
            intervention_id: "intervention-001".to_string(),
            material_id: adhesive.id.clone().unwrap(),
            step_id: Some("step-002".to_string()),
            step_number: Some(2),
            quantity_used: 5.0,
            waste_quantity: Some(0.5),
            waste_reason: Some("Spillage".to_string()),
            batch_used: Some("BATCH-ADH-001".to_string()),
            quality_notes: Some("Applied correctly".to_string()),
            recorded_by: Some("test_user".to_string()),
        };

        let consumption2 = material_service
            .record_consumption(consumption_request2)
            .unwrap();
        assert_eq!(consumption2.material_id, adhesive.id.unwrap());
        assert_eq!(consumption2.quantity_used, 5.0);

        // 3. Verify stock levels were updated
        let updated_film = material_service
            .get_material_by_id(ppf_film.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_film.current_stock, 83.0); // 100 - 15 - 2 waste

        let updated_adhesive = material_service
            .get_material_by_id(adhesive.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_adhesive.current_stock, 44.5); // 50 - 5 - 0.5 waste

        // 4. Verify consumption history
        let film_history = material_service
            .get_consumption_history(ppf_film.id.unwrap().as_str(), None, None)
            .unwrap();
        assert_eq!(film_history.len(), 1);
        assert_eq!(
            film_history[0].intervention_id,
            "intervention-001".to_string()
        );

        let adhesive_history = material_service
            .get_consumption_history(adhesive.id.unwrap().as_str(), None, None)
            .unwrap();
        assert_eq!(adhesive_history.len(), 1);
        assert_eq!(
            adhesive_history[0].intervention_id,
            "intervention-001".to_string()
        );
    }

    #[test]
    fn test_task_intervention_material_consumption_workflow() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let material_service = MaterialService::new(test_db.db());
        let task_service = TaskCreationService::new(test_db.db());
        let intervention_service = InterventionWorkflowService::new(test_db.db());

        // 1. Create materials for the task
        let hood_film = create_test_material_with_stock(
            &material_service,
            "HOOD-FILM-001",
            "Hood PPF Film",
            50.0,
        );

        let fender_film = create_test_material_with_stock(
            &material_service,
            "FENDER-FILM-001",
            "Fender PPF Film",
            30.0,
        );

        let adhesive = create_test_material_with_stock(
            &material_service,
            "ADHESIVE-001",
            "PPF Adhesive",
            20.0,
        );

        // 2. Create a task
        let task = create_test_task(&task_service, "PPF Installation - Tesla Model 3");

        // 3. Create an intervention for the task
        let intervention =
            create_test_intervention(&intervention_service, task.id.as_ref().unwrap());

        // 4. Start the intervention
        let started_intervention = intervention_service
            .start_intervention(intervention.id.as_ref().unwrap(), "tech-001")
            .unwrap();
        assert_eq!(started_intervention.status, InterventionStatus::InProgress);

        // 5. Record material consumption for hood installation
        let hood_consumption = RecordConsumptionRequest {
            intervention_id: intervention.id.clone().unwrap(),
            material_id: hood_film.id.clone().unwrap(),
            step_id: Some("step-hood-prep".to_string()),
            step_number: Some(1),
            quantity_used: 5.0,
            waste_quantity: Some(0.5),
            waste_reason: Some("Hood curve trimming".to_string()),
            batch_used: Some("BATCH-HOOD-001".to_string()),
            quality_notes: Some("Perfect fit".to_string()),
            recorded_by: Some("tech-001".to_string()),
        };

        material_service
            .record_consumption(hood_consumption)
            .unwrap();

        // 6. Record material consumption for fender installation
        let fender_consumption = RecordConsumptionRequest {
            intervention_id: intervention.id.clone().unwrap(),
            material_id: fender_film.id.clone().unwrap(),
            step_id: Some("step-fender-prep".to_string()),
            step_number: Some(2),
            quantity_used: 3.0,
            waste_quantity: Some(0.2),
            waste_reason: Some("Fender edge trimming".to_string()),
            batch_used: Some("BATCH-FENDER-001".to_string()),
            quality_notes: Some("Good adhesion".to_string()),
            recorded_by: Some("tech-001".to_string()),
        };

        material_service
            .record_consumption(fender_consumption)
            .unwrap();

        // 7. Record adhesive consumption
        let adhesive_consumption = RecordConsumptionRequest {
            intervention_id: intervention.id.clone().unwrap(),
            material_id: adhesive.id.clone().unwrap(),
            step_id: Some("step-adhesive-apply".to_string()),
            step_number: Some(3),
            quantity_used: 2.0,
            waste_quantity: None,
            waste_reason: None,
            batch_used: Some("BATCH-ADH-001".to_string()),
            quality_notes: Some("Even application".to_string()),
            recorded_by: Some("tech-001".to_string()),
        };

        material_service
            .record_consumption(adhesive_consumption)
            .unwrap();

        // 8. Verify stock levels
        let updated_hood_film = material_service
            .get_material_by_id(hood_film.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_hood_film.current_stock, 44.5); // 50 - 5 - 0.5 waste

        let updated_fender_film = material_service
            .get_material_by_id(fender_film.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_fender_film.current_stock, 26.8); // 30 - 3 - 0.2 waste

        let updated_adhesive = material_service
            .get_material_by_id(adhesive.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_adhesive.current_stock, 18.0); // 20 - 2

        // 9. Get intervention summary to verify material consumption
        let summary = intervention_service
            .get_intervention_summary(intervention.id.as_ref().unwrap())
            .unwrap();

        assert!(summary.material_consumption.len() >= 3); // At least our 3 consumptions

        // Verify total cost calculation
        let total_cost: f64 = summary
            .material_consumption
            .iter()
            .map(|c| c.quantity_used * c.unit_cost.unwrap_or(0.0))
            .sum();
        assert!(total_cost > 0.0);
    }

    #[test]
    fn test_low_stock_notification_workflow() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let material_service = MaterialService::new(test_db.db());

        // 1. Create materials at different stock levels
        let normal_stock_material = create_test_material_with_stock(
            &material_service,
            "NORMAL-STOCK-001",
            "Normal Stock Material",
            50.0,
        );

        let low_stock_material = create_test_material_with_stock(
            &material_service,
            "LOW-STOCK-001",
            "Low Stock Material",
            5.0,
        );

        let critical_stock_material = create_test_material_with_stock(
            &material_service,
            "CRITICAL-STOCK-001",
            "Critical Stock Material",
            1.0,
        );

        // 2. Update materials to have different minimum stock levels
        let conn = test_db.db().connection();

        conn.execute(
            "UPDATE materials SET minimum_stock = 10.0 WHERE id = ?",
            (&normal_stock_material.id,),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET minimum_stock = 10.0 WHERE id = ?",
            (&low_stock_material.id,),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET minimum_stock = 10.0 WHERE id = ?",
            (&critical_stock_material.id,),
        )
        .unwrap();

        // 3. Get low stock materials
        let low_stock_materials = material_service.get_low_stock_materials().unwrap();
        assert_eq!(low_stock_materials.len(), 2); // low_stock_material and critical_stock_material

        let skus: Vec<String> = low_stock_materials.iter().map(|m| m.sku.clone()).collect();
        assert!(skus.contains(&"LOW-STOCK-001".to_string()));
        assert!(skus.contains(&"CRITICAL-STOCK-001".to_string()));
        assert!(!skus.contains(&"NORMAL-STOCK-001".to_string()));

        // 4. Create reorder notifications
        for material in &low_stock_materials {
            let reorder_request = CreateInventoryTransactionRequest {
                material_id: material.id.clone().unwrap(),
                transaction_type: InventoryTransactionType::StockIn,
                quantity: 50.0,
                reference_number: Some(format!("REORDER-{}", material.sku)),
                reference_type: Some("Automatic Reorder".to_string()),
                notes: Some("Automatic reorder triggered by low stock".to_string()),
                unit_cost: Some(15.50),
                warehouse_id: None,
                location_from: None,
                location_to: Some("Receiving".to_string()),
                batch_number: Some(format!("REORDER-BATCH-{}", material.sku)),
                expiry_date: None,
                quality_status: None,
                intervention_id: None,
                step_id: None,
            };

            material_service
                .create_inventory_transaction(reorder_request, Some("system".to_string()))
                .unwrap();
        }

        // 5. Verify stock was replenished
        let updated_low_stock = material_service
            .get_material_by_id(low_stock_material.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_low_stock.current_stock, 55.0); // 5 + 50

        let updated_critical_stock = material_service
            .get_material_by_id(critical_stock_material.id.unwrap().as_str())
            .unwrap();
        assert_eq!(updated_critical_stock.current_stock, 51.0); // 1 + 50
    }

    #[test]
    fn test_inventory_transaction_workflow() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let material_service = MaterialService::new(test_db.db());

        // 1. Create a material
        let material = create_test_material_with_stock(
            &material_service,
            "TRANSACTION-WF-001",
            "Transaction Workflow Material",
            0.0,
        );

        // 2. Create a sequence of inventory transactions
        let transactions = vec![
            // Initial stock in
            CreateInventoryTransactionRequest {
                material_id: material.id.clone().unwrap(),
                transaction_type: InventoryTransactionType::StockIn,
                quantity: 100.0,
                reference_number: Some("PO-001".to_string()),
                reference_type: Some("Purchase Order".to_string()),
                notes: Some("Initial stock purchase".to_string()),
                unit_cost: Some(15.50),
                warehouse_id: Some("WH-001".to_string()),
                location_from: None,
                location_to: Some("Rack-A1".to_string()),
                batch_number: Some("BATCH-001".to_string()),
                expiry_date: None,
                quality_status: Some("Good".to_string()),
                intervention_id: None,
                step_id: None,
            },
            // Stock out for sales
            CreateInventoryTransactionRequest {
                material_id: material.id.clone().unwrap(),
                transaction_type: InventoryTransactionType::StockOut,
                quantity: 20.0,
                reference_number: Some("SO-001".to_string()),
                reference_type: Some("Sales Order".to_string()),
                notes: Some("Sold to customer".to_string()),
                unit_cost: None,
                warehouse_id: Some("WH-001".to_string()),
                location_from: Some("Rack-A1".to_string()),
                location_to: None,
                batch_number: None,
                expiry_date: None,
                quality_status: None,
                intervention_id: None,
                step_id: None,
            },
            // Transfer between warehouses
            CreateInventoryTransactionRequest {
                material_id: material.id.clone().unwrap(),
                transaction_type: InventoryTransactionType::Transfer,
                quantity: 10.0,
                reference_number: Some("TRF-001".to_string()),
                reference_type: Some("Warehouse Transfer".to_string()),
                notes: Some("Transfer to warehouse B".to_string()),
                unit_cost: None,
                warehouse_id: Some("WH-001".to_string()),
                location_from: Some("WH-001-Rack-A1".to_string()),
                location_to: Some("WH-002-Rack-B1".to_string()),
                batch_number: None,
                expiry_date: None,
                quality_status: None,
                intervention_id: None,
                step_id: None,
            },
            // Waste disposal
            CreateInventoryTransactionRequest {
                material_id: material.id.clone().unwrap(),
                transaction_type: InventoryTransactionType::Waste,
                quantity: 2.0,
                reference_number: Some("WASTE-001".to_string()),
                reference_type: Some("Material Waste".to_string()),
                notes: Some("Damaged in storage".to_string()),
                unit_cost: None,
                warehouse_id: Some("WH-001".to_string()),
                location_from: Some("Rack-A1".to_string()),
                location_to: Some("Disposal".to_string()),
                batch_number: None,
                expiry_date: None,
                quality_status: Some("Damaged".to_string()),
                intervention_id: None,
                step_id: None,
            },
            // Physical count adjustment
            CreateInventoryTransactionRequest {
                material_id: material.id.clone().unwrap(),
                transaction_type: InventoryTransactionType::Adjustment,
                quantity: -3.0,
                reference_number: Some("ADJ-001".to_string()),
                reference_type: Some("Physical Count".to_string()),
                notes: Some("Physical count discrepancy".to_string()),
                unit_cost: None,
                warehouse_id: Some("WH-001".to_string()),
                location_from: Some("Rack-A1".to_string()),
                location_to: Some("Rack-A1".to_string()),
                batch_number: None,
                expiry_date: None,
                quality_status: None,
                intervention_id: None,
                step_id: None,
            },
        ];

        // 3. Execute all transactions
        for transaction_request in transactions {
            material_service
                .create_inventory_transaction(transaction_request, Some("test_user".to_string()))
                .unwrap();
        }

        // 4. Verify final stock level
        // Initial: 100
        // Stock out: -20 = 80
        // Transfer: stock unchanged = 80
        // Waste: -2 = 78
        // Adjustment: -3 = 75
        let final_material = material_service
            .get_material_by_id(material.id.unwrap().as_str())
            .unwrap();
        assert_eq!(final_material.current_stock, 75.0);

        // 5. Get transaction history
        let history = material_service
            .get_transaction_history(material.id.unwrap().as_str(), None, None)
            .unwrap();
        assert_eq!(history.len(), 5);

        // 6. Get movement summary
        let summary = material_service
            .get_inventory_movement_summary(material.id.unwrap().as_str())
            .unwrap();
        assert_eq!(summary.total_in, 100.0);
        assert_eq!(summary.total_out, 25.0); // 20 stock out + 2 waste + 3 adjustment
        assert_eq!(summary.net_movement, 75.0); // 100 - 25
        assert_eq!(summary.current_stock, 75.0);
    }

    #[test]
    fn test_material_expiry_tracking() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let material_service = MaterialService::new(test_db.db());

        // 1. Create materials with different expiry dates
        let expired_material = create_test_material_with_stock(
            &material_service,
            "EXPIRED-001",
            "Expired Material",
            20.0,
        );

        let expiring_soon_material = create_test_material_with_stock(
            &material_service,
            "EXPIRING-SOON-001",
            "Expiring Soon Material",
            30.0,
        );

        let fresh_material =
            create_test_material_with_stock(&material_service, "FRESH-001", "Fresh Material", 40.0);

        // 2. Set expiry dates
        let conn = test_db.db().connection();
        let yesterday = Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap();
        let next_week = Utc.with_ymd_and_hms(2025, 2, 16, 0, 0, 0).unwrap();
        let next_year = Utc.with_ymd_and_hms(2026, 2, 9, 0, 0, 0).unwrap();

        conn.execute(
            "UPDATE materials SET expiry_date = ? WHERE id = ?",
            (&yesterday, &expired_material.id),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET expiry_date = ? WHERE id = ?",
            (&next_week, &expiring_soon_material.id),
        )
        .unwrap();

        conn.execute(
            "UPDATE materials SET expiry_date = ? WHERE id = ?",
            (&next_year, &fresh_material.id),
        )
        .unwrap();

        // 3. Get expired materials
        let expired_materials = material_service.get_expired_materials().unwrap();
        assert_eq!(expired_materials.len(), 1);
        assert_eq!(expired_materials[0].sku, "EXPIRED-001");

        // 4. Get materials expiring soon (within 30 days)
        let expiring_soon = material_service
            .get_materials_expiring_within_days(30)
            .unwrap();
        assert_eq!(expiring_soon.len(), 1); // Only the one expiring next week
        assert_eq!(expiring_soon[0].sku, "EXPIRING-SOON-001");

        // 5. Get materials expiring within 400 days (includes both expired and expiring soon)
        let expiring_within_year = material_service
            .get_materials_expiring_within_days(400)
            .unwrap();
        assert_eq!(expiring_within_year.len(), 2); // Both expired and expiring soon

        let skus: Vec<String> = expiring_within_year.iter().map(|m| m.sku.clone()).collect();
        assert!(skus.contains(&"EXPIRED-001".to_string()));
        assert!(skus.contains(&"EXPIRING-SOON-001".to_string()));
        assert!(!skus.contains(&"FRESH-001".to_string()));
    }
}
