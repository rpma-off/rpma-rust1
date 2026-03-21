use std::sync::Arc;

use chrono::Utc;
use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::shared::repositories::Repositories;
use rpma_ppf_intervention::shared::services::cross_domain::{
    ActionResult, AdvanceStepRequest, AuditEventType, AuditService, AuthService, ClientService,
    CreateClientRequest, CreateMaterialRequest, CreateQuoteItemRequest, CreateQuoteRequest,
    CreateTaskRequest, CustomerType, FinalizeInterventionRequest, InterventionService,
    MaterialService, MaterialType, QuoteItemKind, QuoteService, QuoteStatus,
    RecordConsumptionRequest, StartInterventionRequest, TaskService, TaskStatus, UnitOfMeasure,
    UpdateStockRequest, UserRole,
};
use rpma_ppf_intervention::shared::services::event_bus::InMemoryEventBus;

async fn setup_db() -> Arc<Database> {
    Arc::new(Database::new_in_memory().await.expect("in-memory db"))
}

#[tokio::test]
async fn quote_to_task_conversion_updates_inventory_and_audit() {
    let db = setup_db().await;
    let repos = Repositories::new(db.clone(), 64).await;

    let quote_service = QuoteService::new(repos.quote.clone(), Arc::new(InMemoryEventBus::new()));
    let task_service = TaskService::new(db.clone());
    let intervention_service = InterventionService::new(db.clone());
    let material_service = MaterialService::new(db.as_ref().clone());
    let audit = AuditService::new(db.clone());
    audit.init().expect("init audit");

    // Seed a real user so FK constraints on created_by/updated_by are satisfied.
    let auth = AuthService::new(db.as_ref().clone()).expect("auth service");
    auth.init().expect("init auth");
    let tester = auth
        .create_account(
            "tester@rpma.test",
            "tester",
            "Test",
            "User",
            UserRole::Admin,
            "SecurePass123!",
        )
        .expect("create tester user");
    let tester_id = tester.id.clone();
    let admin_role = UserRole::Admin;

    let client_service = ClientService::new(repos.client.clone(), Arc::new(InMemoryEventBus::new()));
    let client = client_service
        .create_client(
            CreateClientRequest {
                name: "Quote Inventory Client".to_string(),
                email: Some("quote-client@example.com".to_string()),
                phone: None,
                customer_type: CustomerType::Individual,
                address_street: None,
                address_city: None,
                address_state: None,
                address_zip: None,
                address_country: None,
                tax_id: None,
                company_name: None,
                contact_person: None,
                notes: None,
                tags: None,
            },
            tester_id.as_str(),
        )
        .await
        .expect("create client");

    let material = material_service
        .create_material(
            CreateMaterialRequest {
                sku: "MAT-Q2T-001".to_string(),
                name: "Conversion Film".to_string(),
                description: Some("Inventory impact material".to_string()),
                material_type: MaterialType::PpfFilm,
                category: Some("PPF".to_string()),
                subcategory: None,
                category_id: None,
                brand: Some("Brand".to_string()),
                model: None,
                specifications: None,
                unit_of_measure: UnitOfMeasure::Meter,
                current_stock: None,
                minimum_stock: Some(0.0),
                maximum_stock: Some(100.0),
                reorder_point: Some(2.0),
                unit_cost: Some(20.0),
                currency: Some("EUR".to_string()),
                supplier_id: None,
                supplier_name: None,
                supplier_sku: None,
                quality_grade: None,
                certification: None,
                expiry_date: None,
                batch_number: None,
                storage_location: Some("A1".to_string()),
                warehouse_id: None,
                is_active: None,
                is_discontinued: None,
            },
            Some(tester_id.clone()),
        )
        .expect("create material");

    material_service
        .update_stock(UpdateStockRequest {
            material_id: material.id.clone(),
            quantity_change: 10.0,
            reason: "Seed stock".to_string(),
            recorded_by: Some(tester_id.clone()),
        })
        .expect("seed stock");

    let quote = quote_service
        .create_quote(
            CreateQuoteRequest {
                client_id: client.id.clone(),
                task_id: None,
                description: None,
                valid_until: None,
                notes: Some("Convert and consume material".to_string()),
                terms: None,
                discount_type: None,
                discount_value: None,
                vehicle_plate: Some("QUOTE-INV-1".to_string()),
                vehicle_make: Some("Audi".to_string()),
                vehicle_model: Some("A4".to_string()),
                vehicle_year: Some("2025".to_string()),
                vehicle_vin: None,
                items: vec![CreateQuoteItemRequest {
                    kind: QuoteItemKind::Material,
                    label: "PPF Roll".to_string(),
                    description: None,
                    qty: 1.0,
                    unit_price: 300,
                    tax_rate: Some(20.0),
                    material_id: Some(material.id.clone()),
                    position: Some(1),
                }],
            },
            tester_id.as_str(),
            &admin_role,
        )
        .expect("create quote");

    // Create the task first so the FK in quotes.task_id is satisfied.
    let task = task_service
        .create_task_async(
            CreateTaskRequest {
                vehicle_plate: "QUOTE-INV-1".to_string(),
                vehicle_model: "A4".to_string(),
                ppf_zones: vec!["hood".to_string()],
                scheduled_date: Utc::now().format("%Y-%m-%d").to_string(),
                external_id: None,
                status: Some(TaskStatus::Pending),
                technician_id: None,
                start_time: None,
                end_time: None,
                checklist_completed: Some(false),
                notes: Some("task from quote conversion".to_string()),
                title: Some("Task from quote".to_string()),
                vehicle_make: Some("Audi".to_string()),
                vehicle_year: Some("2025".to_string()),
                vin: None,
                date_rdv: None,
                heure_rdv: None,
                lot_film: None,
                customer_name: Some("Quote Customer".to_string()),
                customer_email: Some("quote-client@example.com".to_string()),
                customer_phone: None,
                customer_address: None,
                custom_ppf_zones: None,
                template_id: None,
                workflow_id: None,
                task_number: Some("TSK-Q2T-001".to_string()),
                creator_id: None,
                created_by: Some(tester_id.clone()),
                description: None,
                priority: None,
                client_id: Some(client.id.clone()),
                estimated_duration: Some(60),
                tags: None,
            },
            tester_id.as_str(),
        )
        .await
        .expect("create task");

    quote_service
        .mark_sent(&quote.id, &admin_role)
        .expect("mark quote sent");
    quote_service
        .mark_accepted(&quote.id, tester_id.as_str(), &admin_role)
        .expect("mark quote accepted");
    let conversion = quote_service
        .convert_to_task(
            &quote.id,
            &task.id,
            "TSK-Q2T-001",
            tester_id.as_str(),
            &admin_role,
        )
        .expect("convert quote");

    assert_eq!(conversion.quote.status, QuoteStatus::Converted);

    let started = intervention_service
        .start_intervention(
            StartInterventionRequest {
                task_id: task.id.clone(),
                intervention_number: None,
                ppf_zones: vec!["hood".to_string()],
                custom_zones: None,
                film_type: "premium".to_string(),
                film_brand: None,
                film_model: None,
                weather_condition: "sunny".to_string(),
                lighting_condition: "natural".to_string(),
                work_location: "indoor".to_string(),
                temperature: None,
                humidity: None,
                technician_id: tester_id.clone(),
                assistant_ids: None,
                scheduled_start: Utc::now().to_rfc3339(),
                estimated_duration: 60,
                gps_coordinates: None,
                address: None,
                notes: Some("quote conversion flow".to_string()),
                customer_requirements: None,
                special_instructions: None,
            },
            tester_id.as_str(),
            "it-q2t",
        )
        .expect("start intervention");

    material_service
        .record_consumption(RecordConsumptionRequest {
            intervention_id: started.intervention.id.clone(),
            material_id: material.id.clone(),
            step_id: started.steps.first().map(|s| s.id.clone()),
            step_number: started.steps.first().map(|s| s.step_number),
            quantity_used: 2.0,
            waste_quantity: Some(0.0),
            waste_reason: None,
            batch_used: None,
            quality_notes: None,
            recorded_by: Some(tester_id.clone()),
        })
        .expect("record consumption");

    for step in &started.steps {
        intervention_service
            .advance_step(
                AdvanceStepRequest {
                    intervention_id: started.intervention.id.clone(),
                    step_id: step.id.clone(),
                    collected_data: serde_json::json!({"ok": true}),
                    photos: None,
                    notes: Some("done".to_string()),
                    quality_check_passed: true,
                    issues: None,
                },
                "it-q2t",
                Some(tester_id.as_str()),
            )
            .await
            .expect("advance");
    }

    intervention_service
        .finalize_intervention(
            FinalizeInterventionRequest {
                intervention_id: started.intervention.id.clone(),
                collected_data: None,
                photos: None,
                customer_satisfaction: Some(8),
                quality_score: Some(8),
                final_observations: Some(vec!["done".to_string()]),
                customer_signature: None,
                customer_comments: None,
            },
            "it-q2t",
            Some(tester_id.as_str()),
        )
        .expect("finalize");

    audit
        .log_task_event::<serde_json::Value, serde_json::Value>(
            AuditEventType::TaskCreated,
            tester_id.as_str(),
            &task.id,
            "Task created from quote conversion flow",
            None,
            None,
            ActionResult::Success,
        )
        .expect("audit task");
    audit
        .log_intervention_event::<serde_json::Value, serde_json::Value>(
            AuditEventType::InterventionCompleted,
            tester_id.as_str(),
            &started.intervention.id,
            "Intervention finalized with material consumption",
            None,
            None,
            ActionResult::Success,
        )
        .expect("audit intervention");

    let quote_task_id: Option<String> = db
        .query_single_value(
            "SELECT task_id FROM quotes WHERE id = ?1",
            [quote.id.clone()],
        )
        .expect("quote task id");
    assert_eq!(quote_task_id, Some(task.id.clone()));

    let tx_count: i64 = db
        .query_single_value(
            "SELECT COUNT(*) FROM inventory_transactions WHERE material_id = ?1",
            [material.id.clone()],
        )
        .expect("inventory transactions");
    assert!(
        tx_count > 0,
        "expected inventory transaction from consumption"
    );

    let quote_audit = audit
        .get_resource_history("task", &task.id, Some(10))
        .expect("audit history");
    assert!(
        quote_audit
            .iter()
            .any(|entry| entry.event_type == AuditEventType::TaskCreated),
        "expected task audit entry"
    );
}
