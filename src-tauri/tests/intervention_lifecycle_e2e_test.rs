use std::sync::Arc;

use chrono::Utc;
use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::shared::services::cross_domain::{
    ActionResult, AdvanceStepRequest, AuditEventType, AuditService, AuthService, CreateTaskRequest,
    FinalizeInterventionRequest, InterventionService, StartInterventionRequest, TaskService,
    TaskStatus, UserRole,
};

async fn setup_db() -> Arc<Database> {
    Arc::new(Database::new_in_memory().await.expect("in-memory db"))
}

#[tokio::test]
async fn intervention_lifecycle_start_advance_finalize_persists_and_audits() {
    let db = setup_db().await;
    let audit = AuditService::new(db.clone());
    audit.init().expect("init audit");

    let task_service = TaskService::new(db.clone());
    let intervention_service = InterventionService::new(db.clone());

    // Create a real user so FK constraints on technician_id/created_by are satisfied.
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

    let task = task_service
        .create_task_async(
            CreateTaskRequest {
                vehicle_plate: "LIFECYCLE-001".to_string(),
                vehicle_model: "Model X".to_string(),
                ppf_zones: vec!["hood".to_string(), "door_left".to_string()],
                scheduled_date: Utc::now().format("%Y-%m-%d").to_string(),
                external_id: None,
                status: Some(TaskStatus::Pending),
                technician_id: Some(tester_id.clone()),
                start_time: None,
                end_time: None,
                checklist_completed: Some(false),
                notes: Some("Lifecycle integration test".to_string()),
                title: Some("Lifecycle task".to_string()),
                vehicle_make: Some("Tesla".to_string()),
                vehicle_year: Some("2026".to_string()),
                vin: None,
                date_rdv: None,
                heure_rdv: None,
                lot_film: None,
                customer_name: Some("Lifecycle Customer".to_string()),
                customer_email: Some("life@example.com".to_string()),
                customer_phone: None,
                customer_address: None,
                custom_ppf_zones: None,
                template_id: None,
                workflow_id: None,
                task_number: None,
                creator_id: None,
                created_by: Some(tester_id.clone()),
                description: None,
                priority: None,
                client_id: None,
                estimated_duration: Some(90),
                tags: None,
            },
            tester_id.as_str(),
        )
        .await
        .expect("create task");

    let started = intervention_service
        .start_intervention(
            StartInterventionRequest {
                task_id: task.id.clone(),
                intervention_number: None,
                ppf_zones: vec!["hood".to_string(), "door_left".to_string()],
                custom_zones: None,
                film_type: "premium".to_string(),
                film_brand: Some("TestBrand".to_string()),
                film_model: None,
                weather_condition: "sunny".to_string(),
                lighting_condition: "natural".to_string(),
                work_location: "indoor".to_string(),
                temperature: None,
                humidity: None,
                technician_id: tester_id.clone(),
                assistant_ids: None,
                scheduled_start: Utc::now().to_rfc3339(),
                estimated_duration: 90,
                gps_coordinates: None,
                address: None,
                notes: Some("Start lifecycle flow".to_string()),
                customer_requirements: None,
                special_instructions: None,
            },
            tester_id.as_str(),
            "it-lifecycle",
        )
        .expect("start intervention");

    audit
        .log_intervention_event::<serde_json::Value, serde_json::Value>(
            AuditEventType::InterventionStarted,
            tester_id.as_str(),
            &started.intervention.id,
            "Intervention started for lifecycle flow",
            None,
            None,
            ActionResult::Success,
        )
        .expect("audit start");

    for step in &started.steps {
        intervention_service
            .advance_step(
                AdvanceStepRequest {
                    intervention_id: started.intervention.id.clone(),
                    step_id: step.id.clone(),
                    collected_data: serde_json::json!({ "ok": true, "step": step.step_number }),
                    photos: Some(vec!["step-photo".to_string()]),
                    notes: Some("Completed step".to_string()),
                    quality_check_passed: true,
                    issues: None,
                },
                "it-lifecycle",
                Some(tester_id.as_str()),
            )
            .await
            .expect("advance step");
    }

    intervention_service
        .finalize_intervention(
            FinalizeInterventionRequest {
                intervention_id: started.intervention.id.clone(),
                collected_data: Some(serde_json::json!({ "finalized": true })),
                photos: Some(vec!["final-photo".to_string()]),
                customer_satisfaction: Some(10),
                quality_score: Some(9),
                final_observations: Some(vec!["Done".to_string()]),
                customer_signature: Some("signed".to_string()),
                customer_comments: Some("Great".to_string()),
            },
            "it-lifecycle",
            Some(tester_id.as_str()),
        )
        .expect("finalize intervention");

    audit
        .log_intervention_event::<serde_json::Value, serde_json::Value>(
            AuditEventType::InterventionCompleted,
            tester_id.as_str(),
            &started.intervention.id,
            "Intervention finalized for lifecycle flow",
            None,
            None,
            ActionResult::Success,
        )
        .expect("audit finalize");

    let status: String = db
        .query_single_value(
            "SELECT status FROM interventions WHERE id = ?1",
            [started.intervention.id.clone()],
        )
        .expect("intervention status");
    assert_eq!(status, "completed");

    let completed_steps: i64 = db
        .query_single_value(
            "SELECT COUNT(*) FROM intervention_steps WHERE intervention_id = ?1 AND step_status = 'completed'",
            [started.intervention.id.clone()],
        )
        .expect("completed steps");
    assert_eq!(completed_steps as usize, started.steps.len());

    let audit_entries = audit
        .get_resource_history("intervention", &started.intervention.id, Some(20))
        .expect("audit history");
    assert!(
        audit_entries.iter().any(|e| e.event_type == AuditEventType::InterventionStarted)
            && audit_entries
                .iter()
                .any(|e| e.event_type == AuditEventType::InterventionCompleted),
        "expected start and completion audit entries"
    );

}
