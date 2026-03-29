use super::InterventionDataService;
use crate::domains::interventions::domain::models::step::{InterventionStep, StepType};
use crate::domains::interventions::infrastructure::intervention_types::{
    AdvanceStepRequest, StartInterventionRequest,
};
use crate::test_utils::TestDatabase;

fn make_start_request(task_id: &str) -> StartInterventionRequest {
    StartInterventionRequest {
        task_id: task_id.to_string(),
        intervention_number: None,
        ppf_zones: vec!["full_front".to_string()],
        custom_zones: None,
        film_type: "matte".to_string(),
        film_brand: None,
        film_model: None,
        weather_condition: "sunny".to_string(),
        lighting_condition: "natural".to_string(),
        work_location: "indoor".to_string(),
        temperature: None,
        humidity: None,
        technician_id: "tech-001".to_string(),
        assistant_ids: None,
        scheduled_start: "2026-01-01T08:00:00Z".to_string(),
        estimated_duration: 120,
        gps_coordinates: None,
        address: None,
        notes: None,
        customer_requirements: None,
        special_instructions: None,
    }
}

#[test]
fn test_create_intervention_copies_vehicle_fields_despite_text_year() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = test_db.db();
    let now = chrono::Utc::now().timestamp_millis();
    let task_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    let tech_id = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

    {
        let conn = db.get_connection().expect("seed connection");

        conn.execute(
            "INSERT INTO tasks \
             (id, task_number, title, vehicle_plate, vehicle_model, vehicle_make, vehicle_year, vin, \
              ppf_zones, scheduled_date, status, priority, created_at, updated_at, synced) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            rusqlite::params![
                task_id, "T-VEH", "Vehicle test task", "CV-234-DO",
                "Model 3", "Tesla", "2022", "VIN999",
                r#"["full_front"]"#, "2026-01-01", "draft", "medium", now, now
            ],
        )
        .expect("seed task");

        conn.execute(
            "INSERT INTO users \
             (id, email, username, password_hash, full_name, role, created_at, updated_at, synced) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
            rusqlite::params![
                tech_id,
                "tech@test.com",
                "tech_test",
                "hash",
                "Tech Test",
                "technician",
                now,
                now
            ],
        )
        .expect("seed user");
    }

    let service = InterventionDataService::new(db.clone());
    let mut req = make_start_request(task_id);
    req.technician_id = tech_id.to_string();

    let intervention = service
        .create_intervention(&req, tech_id)
        .expect("create_intervention failed");

    assert_eq!(intervention.vehicle_model.as_deref(), Some("Model 3"));
    assert_eq!(intervention.vehicle_make.as_deref(), Some("Tesla"));
    assert_eq!(intervention.vehicle_year, Some(2022));
    assert_eq!(intervention.vehicle_vin.as_deref(), Some("VIN999"));
}

#[test]
fn update_step_with_data_mirrors_collected_data_to_step_data() {
    let test_db = TestDatabase::new().expect("Failed to create test database");
    let service = InterventionDataService::new(test_db.db());
    let mut step = InterventionStep::new(
        "intervention-1".to_string(),
        1,
        "Inspection".to_string(),
        StepType::Inspection,
    );
    let request = AdvanceStepRequest {
        intervention_id: "intervention-1".to_string(),
        step_id: step.id.clone(),
        collected_data: serde_json::json!({
            "checklist": { "clean_dry": true },
            "notes": "ok"
        }),
        photos: None,
        notes: Some("draft note".to_string()),
        quality_check_passed: true,
        issues: None,
    };

    service
        .update_step_with_data(&mut step, &request)
        .expect("Failed to update step");

    assert_eq!(step.collected_data, step.step_data);
    assert_eq!(step.notes, Some("draft note".to_string()));
}
