use std::sync::Arc;

use chrono::Utc;
use rpma_ppf_intervention::domains::inventory::application::InterventionFinalizedHandler;
use rpma_ppf_intervention::domains::inventory::InventoryService;
use rpma_ppf_intervention::models::material::{MaterialType, UnitOfMeasure};
use rpma_ppf_intervention::services::event_bus::InMemoryEventBus;
use rpma_ppf_intervention::services::intervention_types::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};
use rpma_ppf_intervention::services::intervention_workflow::InterventionWorkflowService;
use rpma_ppf_intervention::services::material::{
    CreateMaterialRequest, MaterialService, RecordConsumptionRequest, UpdateStockRequest,
};
use rpma_ppf_intervention::services::task_crud::TaskCrudService;
use rpma_ppf_intervention::shared::event_bus::{register_handler, set_global_event_bus};
use rpma_ppf_intervention::{test_db, test_task};

#[tokio::test]
async fn finalize_intervention_emits_event_and_inventory_updates() {
    let test_db = test_db!();
    let db = test_db.db();

    let material_service = Arc::new(MaterialService::new(db.clone()));
    let inventory_service = Arc::new(InventoryService::new(db.clone(), material_service.clone()));

    let event_bus = Arc::new(InMemoryEventBus::new());
    set_global_event_bus(event_bus.clone());
    register_handler(Arc::new(InterventionFinalizedHandler::new(
        inventory_service.clone(),
    )));

    let task_service = TaskCrudService::new(db.clone());
    let intervention_service = InterventionWorkflowService::new(db.clone());

    let task_request = test_task!(
        title: Some("Inventory Event Task".to_string()),
        vehicle_plate: "INV-001".to_string(),
        status: Some(rpma_ppf_intervention::models::task::TaskStatus::Pending)
    );

    let task = task_service
        .create_task_async(task_request, "test_user")
        .await
        .expect("create task");

    let start_request = StartInterventionRequest {
        task_id: task.id.clone(),
        intervention_number: None,
        ppf_zones: vec!["hood".to_string()],
        custom_zones: None,
        film_type: "premium".to_string(),
        film_brand: None,
        film_model: None,
        weather_condition: "clear".to_string(),
        lighting_condition: "good".to_string(),
        work_location: "shop".to_string(),
        temperature: None,
        humidity: None,
        technician_id: "test_user".to_string(),
        assistant_ids: None,
        scheduled_start: Utc::now().to_rfc3339(),
        estimated_duration: 90,
        gps_coordinates: None,
        address: None,
        notes: Some("Inventory event test".to_string()),
        customer_requirements: None,
        special_instructions: None,
    };

    let start_response = intervention_service
        .start_intervention(start_request, "test_user", "inventory-event")
        .expect("start intervention");

    let material = material_service
        .create_material(
            CreateMaterialRequest {
                sku: "INV-MAT-001".to_string(),
                name: "Inventory Event Material".to_string(),
                description: Some("Test material".to_string()),
                material_type: MaterialType::PpfFilm,
                category: Some("Films".to_string()),
                subcategory: None,
                category_id: None,
                brand: Some("TestBrand".to_string()),
                model: None,
                specifications: None,
                unit_of_measure: UnitOfMeasure::Meter,
                minimum_stock: Some(0.0),
                maximum_stock: Some(100.0),
                reorder_point: Some(5.0),
                unit_cost: Some(12.0),
                currency: Some("EUR".to_string()),
                supplier_id: None,
                supplier_name: None,
                supplier_sku: None,
                quality_grade: None,
                certification: None,
                expiry_date: None,
                batch_number: None,
                storage_location: Some("Shelf A".to_string()),
                warehouse_id: None,
            },
            Some("test_user".to_string()),
        )
        .expect("create material");

    material_service
        .update_stock(UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 10.0,
            reason: "Seed stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        })
        .expect("seed stock");

    material_service
        .record_consumption(RecordConsumptionRequest {
            intervention_id: start_response.intervention.id.clone(),
            material_id: material.id.clone().unwrap(),
            step_id: start_response.steps.first().map(|step| step.id.clone()),
            step_number: start_response.steps.first().map(|step| step.step_number),
            quantity_used: 2.0,
            waste_quantity: Some(0.5),
            waste_reason: Some("Cutoff".to_string()),
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        })
        .expect("record consumption");

    for step in &start_response.steps {
        intervention_service
            .advance_step(
                AdvanceStepRequest {
                    intervention_id: start_response.intervention.id.clone(),
                    step_id: step.id.clone(),
                    collected_data: serde_json::json!({"completed": true}),
                    photos: Some(vec!["photo-1".to_string()]),
                    notes: Some("Completed step".to_string()),
                    quality_check_passed: true,
                    issues: None,
                },
                "inventory-event",
                Some("test_user"),
            )
            .await
            .expect("advance step");
    }

    intervention_service
        .finalize_intervention(
            FinalizeInterventionRequest {
                intervention_id: start_response.intervention.id.clone(),
                collected_data: Some(serde_json::json!({"final": true})),
                photos: Some(vec!["final-photo".to_string()]),
                customer_satisfaction: Some(9),
                quality_score: Some(8),
                final_observations: Some(vec!["All good".to_string()]),
                customer_signature: Some("signed".to_string()),
                customer_comments: Some("Great job".to_string()),
            },
            "inventory-event",
            Some("test_user"),
        )
        .expect("finalize intervention");

    let mut attempts = 0;
    let count = loop {
        let count: i64 = db
            .query_single_value(
                "SELECT COUNT(*) FROM inventory_transactions WHERE reference_type = 'intervention_finalized'",
                [],
            )
            .expect("query inventory transactions");
        if count > 0 || attempts > 20 {
            break count;
        }
        attempts += 1;
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    };

    assert!(
        count > 0,
        "Expected inventory transactions from event handler"
    );
}

#[tokio::test]
async fn finalize_intervention_rollback_does_not_update_inventory() {
    let test_db = test_db!();
    let db = test_db.db();

    let material_service = Arc::new(MaterialService::new(db.clone()));
    let inventory_service = Arc::new(InventoryService::new(db.clone(), material_service.clone()));

    let event_bus = Arc::new(InMemoryEventBus::new());
    set_global_event_bus(event_bus.clone());
    register_handler(Arc::new(InterventionFinalizedHandler::new(
        inventory_service.clone(),
    )));

    let task_service = TaskCrudService::new(db.clone());
    let intervention_service = InterventionWorkflowService::new(db.clone());

    let task_request = test_task!(
        title: Some("Inventory Rollback Task".to_string()),
        vehicle_plate: "INV-ROLLBACK".to_string(),
        status: Some(rpma_ppf_intervention::models::task::TaskStatus::Pending)
    );

    let task = task_service
        .create_task_async(task_request, "test_user")
        .await
        .expect("create task");

    let start_response = intervention_service
        .start_intervention(
            StartInterventionRequest {
                task_id: task.id.clone(),
                intervention_number: None,
                ppf_zones: vec!["hood".to_string()],
                custom_zones: None,
                film_type: "premium".to_string(),
                film_brand: None,
                film_model: None,
                weather_condition: "clear".to_string(),
                lighting_condition: "good".to_string(),
                work_location: "shop".to_string(),
                temperature: None,
                humidity: None,
                technician_id: "test_user".to_string(),
                assistant_ids: None,
                scheduled_start: Utc::now().to_rfc3339(),
                estimated_duration: 90,
                gps_coordinates: None,
                address: None,
                notes: Some("Rollback test".to_string()),
                customer_requirements: None,
                special_instructions: None,
            },
            "test_user",
            "inventory-rollback",
        )
        .expect("start intervention");

    let material = material_service
        .create_material(
            CreateMaterialRequest {
                sku: "INV-MAT-ROLL".to_string(),
                name: "Inventory Rollback Material".to_string(),
                description: Some("Test material".to_string()),
                material_type: MaterialType::PpfFilm,
                category: Some("Films".to_string()),
                subcategory: None,
                category_id: None,
                brand: Some("TestBrand".to_string()),
                model: None,
                specifications: None,
                unit_of_measure: UnitOfMeasure::Meter,
                minimum_stock: Some(0.0),
                maximum_stock: Some(100.0),
                reorder_point: Some(5.0),
                unit_cost: Some(12.0),
                currency: Some("EUR".to_string()),
                supplier_id: None,
                supplier_name: None,
                supplier_sku: None,
                quality_grade: None,
                certification: None,
                expiry_date: None,
                batch_number: None,
                storage_location: Some("Shelf B".to_string()),
                warehouse_id: None,
            },
            Some("test_user".to_string()),
        )
        .expect("create material");

    material_service
        .update_stock(UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: 10.0,
            reason: "Seed stock".to_string(),
            recorded_by: Some("test_user".to_string()),
        })
        .expect("seed stock");

    let consumption = material_service
        .record_consumption(RecordConsumptionRequest {
            intervention_id: start_response.intervention.id.clone(),
            material_id: material.id.clone().unwrap(),
            step_id: start_response.steps.first().map(|step| step.id.clone()),
            step_number: start_response.steps.first().map(|step| step.step_number),
            quantity_used: 1.0,
            waste_quantity: Some(0.0),
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some("test_user".to_string()),
        })
        .expect("record consumption");

    for step in &start_response.steps {
        intervention_service
            .advance_step(
                AdvanceStepRequest {
                    intervention_id: start_response.intervention.id.clone(),
                    step_id: step.id.clone(),
                    collected_data: serde_json::json!({"completed": true}),
                    photos: Some(vec!["photo-1".to_string()]),
                    notes: Some("Completed step".to_string()),
                    quality_check_passed: true,
                    issues: None,
                },
                "inventory-rollback",
                Some("test_user"),
            )
            .await
            .expect("advance step");
    }

    db.execute("DROP TABLE tasks", [])
        .expect("drop tasks table");

    let finalize_result = intervention_service.finalize_intervention(
        FinalizeInterventionRequest {
            intervention_id: start_response.intervention.id.clone(),
            collected_data: Some(serde_json::json!({"final": true})),
            photos: Some(vec!["final-photo".to_string()]),
            customer_satisfaction: Some(9),
            quality_score: Some(8),
            final_observations: Some(vec!["All good".to_string()]),
            customer_signature: Some("signed".to_string()),
            customer_comments: Some("Great job".to_string()),
        },
        "inventory-rollback",
        Some("test_user"),
    );

    assert!(finalize_result.is_err());

    let count: i64 = db
        .query_single_value(
            "SELECT COUNT(*) FROM inventory_transactions WHERE reference_type = 'intervention_finalized' AND reference_number = ?",
            [consumption.id],
        )
        .expect("query inventory transactions");

    assert_eq!(count, 0);
}
