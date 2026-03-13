use crate::db::Database;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::interventions::infrastructure::intervention_data::InterventionDataService;
use crate::domains::interventions::infrastructure::intervention_types::{
    GpsCoordinates, StartInterventionRequest,
};
use crate::domains::interventions::InterventionsFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn validate_intervention_id_rejects_empty() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    let err = facade.validate_intervention_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_task_id_rejects_empty() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    let err = facade.validate_task_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

/// Regression: `create_intervention_with_tx` must call `Intervention::validate()`
/// before persisting.  Providing an out-of-range GPS latitude (> 90°) must be
/// rejected with a `BusinessRule` error rather than silently stored.
#[test]
fn create_intervention_rejects_invalid_gps_coordinates() {
    use crate::db::InterventionError;

    let db = Arc::new(crate::test_utils::setup_test_db_sync());

    // Insert a minimal task row so `create_intervention_with_tx` can fetch it.
    let task_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    db.execute(
        r#"INSERT INTO tasks (
            id, task_number, title, vehicle_plate, vehicle_model,
            ppf_zones, scheduled_date, status, priority, created_at, updated_at, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)"#,
        rusqlite::params![
            task_id, "T-99999", "Test task", "AA-000-AA", "Model X",
            r#"["front"]"#, "2025-01-01", "draft", "medium", now, now
        ],
    )
    .expect("insert test task");

    let data_service = InterventionDataService::new(db);
    let request = StartInterventionRequest {
        task_id: task_id.clone(),
        intervention_number: None,
        ppf_zones: vec!["front".to_string()],
        custom_zones: None,
        film_type: "matte".to_string(),
        film_brand: None,
        film_model: None,
        weather_condition: "sunny".to_string(),
        lighting_condition: "natural".to_string(),
        work_location: "indoor".to_string(),
        temperature: None,
        humidity: None,
        technician_id: uuid::Uuid::new_v4().to_string(),
        assistant_ids: None,
        scheduled_start: "2025-01-01T09:00:00Z".to_string(),
        estimated_duration: 120,
        // Latitude 200° is outside the valid [-90, 90] range.
        gps_coordinates: Some(GpsCoordinates {
            latitude: 200.0,
            longitude: 0.0,
            accuracy: None,
        }),
        address: None,
        notes: None,
        customer_requirements: None,
        special_instructions: None,
    };

    let result = data_service.create_intervention(&request, "test-user");
    assert!(
        result.is_err(),
        "create_intervention must fail when GPS latitude is out of range"
    );
    let err = result.unwrap_err();
    // create_intervention() wraps BusinessRule via with_transaction → Database variant
    assert!(
        matches!(err, InterventionError::Database(_)),
        "error must propagate as Database (create_intervention wraps BusinessRule via with_transaction)"
    );
}

/// Regression: the `intervention_workflow` IPC command must accept a payload that
/// contains fields beyond those defined in `application::contracts::StartInterventionRequest`
/// (e.g. `address`, `ppf_zones`, `film_type` from the TS-exported infra type).
/// Previously `#[serde(deny_unknown_fields)]` caused a hard rejection for any
/// unknown field, preventing the workflow from starting at all.
#[test]
fn test_start_intervention_request_ignores_unknown_fields() {
    use crate::domains::interventions::application::contracts::StartInterventionRequest as ContractsRequest;

    let json = serde_json::json!({
        "task_id": "task-abc-123",
        "intervention_type": "ppf",
        "priority": "medium",
        "description": null,
        "estimated_duration_minutes": 120,
        // extra fields sent by the frontend (from the infra TS-exported type)
        "address": "123 Main St",
        "ppf_zones": ["hood", "bumper"],
        "film_type": "standard",
        "weather_condition": "sunny",
        "work_location": "outdoor"
    });

    let result: Result<ContractsRequest, _> = serde_json::from_value(json);
    assert!(
        result.is_ok(),
        "StartInterventionRequest must accept extra fields sent by the frontend; error: {:?}",
        result.err()
    );
    let req = result.unwrap();
    assert_eq!(req.task_id, "task-abc-123");
    assert_eq!(req.intervention_type, "ppf");
    assert_eq!(req.priority, "medium");
}
