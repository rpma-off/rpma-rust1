//! Tests for intervention workflow command handlers
//!
//! These tests verify that intervention IPC commands work correctly,
//! including workflow transitions, step progression, and data collection.

use super::*;
use rpma_ppf_intervention::commands::intervention::{
    intervention_advance_step, intervention_finalize, intervention_get_progress,
    intervention_start, FinalizeInterventionRequest, StartInterventionRequest,
};
use rpma_ppf_intervention::commands::task::TaskAction;
use rpma_ppf_intervention::models::{ApiResponse, Intervention, InterventionStep, Task};
use serde_json::json;

#[tokio::test]
async fn test_intervention_start_valid() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test task first
    let client_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "name": "Test Client",
            "address": "123 Test St",
            "phone": "555-0123",
            "email": "client@test.com"
        }
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(
        rpma_ppf_intervention::commands::ClientCrudRequest {
            action: rpma_ppf_intervention::commands::ClientAction::Create {
                data: rpma_ppf_intervention::commands::CreateClientRequest {
                    name: "Test Client".to_string(),
                    email: Some("client@test.com".to_string()),
                    phone: Some("555-0123".to_string()),
                    customer_type: None,
                    address_street: Some("123 Test St".to_string()),
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
            },
            session_token: session_token.clone(),
        },
    )
    .await
    .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    let technician = create_test_technician(&ctx).await;

    // Create task for the client
    let task_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "title": "Test Task",
            "description": "Test Description",
            "client_id": client_id,
            "priority": "Normal",
            "status": "Pending",
            "ppf_zone": "ZONE-001",
            "assigned_technician_id": technician.id
        }
    });
    let task_response =
        rpma_ppf_intervention::commands::task_crud(task_req["data"].clone(), session_token.clone())
            .await
            .unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();

    // Create intervention start request
    let start_req = StartInterventionRequest {
        task_id: task.id,
        intervention_type: "Maintenance".to_string(),
        priority: "Normal".to_string(),
        description: Some("Test intervention".to_string()),
        estimated_duration_minutes: Some(120),
    };

    let result = intervention_start(start_req, session_token, state).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());

    let intervention: Intervention = serde_json::from_value(response.data.unwrap()).unwrap();
    assert_eq!(intervention.task_id, task.id);
    assert_eq!(intervention.status, "InProgress");
    assert!(!intervention.id.is_empty());
}

#[tokio::test]
async fn test_intervention_start_no_duplicate() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test task
    let client_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "name": "Test Client",
            "address": "123 Test St",
            "phone": "555-0123",
            "email": "client@test.com"
        }
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(
        rpma_ppf_intervention::commands::ClientCrudRequest {
            action: rpma_ppf_intervention::commands::ClientAction::Create {
                data: rpma_ppf_intervention::commands::CreateClientRequest {
                    name: "Test Client".to_string(),
                    email: Some("client@test.com".to_string()),
                    phone: Some("555-0123".to_string()),
                    customer_type: None,
                    address_street: Some("123 Test St".to_string()),
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
            },
            session_token: session_token.clone(),
        },
    )
    .await
    .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    let technician = create_test_technician(&ctx).await;

    // Create task for the client
    let task_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "title": "Test Task",
            "description": "Test Description",
            "client_id": client_id,
            "priority": "Normal",
            "status": "Pending",
            "ppf_zone": "ZONE-001",
            "assigned_technician_id": technician.id
        }
    });
    let task_response =
        rpma_ppf_intervention::commands::task_crud(task_req["data"].clone(), session_token.clone())
            .await
            .unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();

    // Start first intervention
    let start_req = StartInterventionRequest {
        task_id: task.id.clone(),
        intervention_type: "Maintenance".to_string(),
        priority: "Normal".to_string(),
        description: Some("Test intervention 1".to_string()),
        estimated_duration_minutes: Some(120),
    };

    let first_result = intervention_start(start_req, session_token.clone(), state.clone()).await;
    assert!(first_result.unwrap().success);

    // Try to start second intervention for same task (should fail if there's already an active one)
    let second_req = StartInterventionRequest {
        task_id: task.id,
        intervention_type: "Maintenance".to_string(),
        priority: "Normal".to_string(),
        description: Some("Test intervention 2".to_string()),
        estimated_duration_minutes: Some(120),
    };

    let second_result = intervention_start(second_req, session_token, state).await;

    // Should fail due to duplicate active intervention
    assert!(second_result.is_err());
    let error = second_result.unwrap_err();
    assert!(matches!(
        error,
        rpma_ppf_intervention::commands::AppError::Validation(_)
    ));
    assert!(error
        .to_string()
        .contains("active intervention already exists"));
}

#[tokio::test]
async fn test_intervention_advance_step() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test task
    let client_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "name": "Test Client",
            "address": "123 Test St",
            "phone": "555-0123",
            "email": "client@test.com"
        }
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(
        rpma_ppf_intervention::commands::ClientCrudRequest {
            action: rpma_ppf_intervention::commands::ClientAction::Create {
                data: rpma_ppf_intervention::commands::CreateClientRequest {
                    name: "Test Client".to_string(),
                    email: Some("client@test.com".to_string()),
                    phone: Some("555-0123".to_string()),
                    customer_type: None,
                    address_street: Some("123 Test St".to_string()),
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
            },
            session_token: session_token.clone(),
        },
    )
    .await
    .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    let technician = create_test_technician(&ctx).await;

    // Create task for the client
    let task_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "title": "Test Task",
            "description": "Test Description",
            "client_id": client_id,
            "priority": "Normal",
            "status": "Pending",
            "ppf_zone": "ZONE-001",
            "assigned_technician_id": technician.id
        }
    });
    let task_response =
        rpma_ppf_intervention::commands::task_crud(task_req["data"].clone(), session_token.clone())
            .await
            .unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();

    // Start intervention
    let start_req = StartInterventionRequest {
        task_id: task.id,
        intervention_type: "Maintenance".to_string(),
        priority: "Normal".to_string(),
        description: Some("Test intervention".to_string()),
        estimated_duration_minutes: Some(120),
    };

    let intervention_response = intervention_start(start_req, session_token.clone(), state.clone())
        .await
        .unwrap();
    let intervention: Intervention =
        serde_json::from_value(intervention_response.data.unwrap()).unwrap();

    // Advance to first step
    let advance_req = json!({
        "intervention_id": intervention.id,
        "step_id": 1,
        "notes": "Step 1 completed successfully",
        "duration_minutes": 30
    });

    let result = intervention_advance_step(advance_req, session_token, state).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
}

#[tokio::test]
async fn test_intervention_advance_step_invalid_transition() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Try to advance step for non-existent intervention
    let advance_req = json!({
        "intervention_id": "non-existent-id",
        "step_id": 1,
        "notes": "This should fail",
        "duration_minutes": 30
    });

    let result = intervention_advance_step(advance_req, session_token, state).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.is_some());
    assert!(
        response
            .error
            .unwrap()
            .message
            .to_lowercase()
            .contains("not found")
            || response
                .error
                .unwrap()
                .message
                .to_lowercase()
                .contains("invalid")
    );
}

#[tokio::test]
async fn test_intervention_get_progress() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test task
    let client_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "name": "Test Client",
            "address": "123 Test St",
            "phone": "555-0123",
            "email": "client@test.com"
        }
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(
        rpma_ppf_intervention::commands::ClientCrudRequest {
            action: rpma_ppf_intervention::commands::ClientAction::Create {
                data: rpma_ppf_intervention::commands::CreateClientRequest {
                    name: "Test Client".to_string(),
                    email: Some("client@test.com".to_string()),
                    phone: Some("555-0123".to_string()),
                    customer_type: None,
                    address_street: Some("123 Test St".to_string()),
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
            },
            session_token: session_token.clone(),
        },
    )
    .await
    .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    let technician = create_test_technician(&ctx).await;

    // Create task for the client
    let task_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "title": "Test Task",
            "description": "Test Description",
            "client_id": client_id,
            "priority": "Normal",
            "status": "Pending",
            "ppf_zone": "ZONE-001",
            "assigned_technician_id": technician.id
        }
    });
    let task_response =
        rpma_ppf_intervention::commands::task_crud(task_req["data"].clone(), session_token.clone())
            .await
            .unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();

    // Start intervention
    let start_req = StartInterventionRequest {
        task_id: task.id,
        intervention_type: "Maintenance".to_string(),
        priority: "Normal".to_string(),
        description: Some("Test intervention".to_string()),
        estimated_duration_minutes: Some(120),
    };

    let intervention_response = intervention_start(start_req, session_token.clone(), state.clone())
        .await
        .unwrap();
    let intervention: Intervention =
        serde_json::from_value(intervention_response.data.unwrap()).unwrap();

    // Get progress
    let result =
        intervention_get_progress(json!({"id": intervention.id}), session_token, state).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());

    // Verify progress structure
    let progress = response.data.unwrap();
    assert!(progress.get("intervention").is_some());
    assert!(progress.get("completed_steps").is_some());
    assert!(progress.get("current_step").is_some());
    assert!(progress.get("total_steps").is_some());
}

#[tokio::test]
async fn test_intervention_finalize_with_photos() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test task
    let client_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "name": "Test Client",
            "address": "123 Test St",
            "phone": "555-0123",
            "email": "client@test.com"
        }
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(
        rpma_ppf_intervention::commands::ClientCrudRequest {
            action: rpma_ppf_intervention::commands::ClientAction::Create {
                data: rpma_ppf_intervention::commands::CreateClientRequest {
                    name: "Test Client".to_string(),
                    email: Some("client@test.com".to_string()),
                    phone: Some("555-0123".to_string()),
                    customer_type: None,
                    address_street: Some("123 Test St".to_string()),
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
            },
            session_token: session_token.clone(),
        },
    )
    .await
    .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    let technician = create_test_technician(&ctx).await;

    // Create task for the client
    let task_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "title": "Test Task",
            "description": "Test Description",
            "client_id": client_id,
            "priority": "Normal",
            "status": "Pending",
            "ppf_zone": "ZONE-001",
            "assigned_technician_id": technician.id
        }
    });
    let task_response =
        rpma_ppf_intervention::commands::task_crud(task_req["data"].clone(), session_token.clone())
            .await
            .unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();

    // Start intervention
    let start_req = StartInterventionRequest {
        task_id: task.id,
        intervention_type: "Maintenance".to_string(),
        priority: "Normal".to_string(),
        description: Some("Test intervention".to_string()),
        estimated_duration_minutes: Some(120),
    };

    let intervention_response = intervention_start(start_req, session_token.clone(), state.clone())
        .await
        .unwrap();
    let intervention: Intervention =
        serde_json::from_value(intervention_response.data.unwrap()).unwrap();

    // Complete some steps first
    for step_id in 1..=2 {
        let advance_req = json!({
            "intervention_id": intervention.id,
            "step_id": step_id,
            "notes": &format!("Step {} completed", step_id),
            "duration_minutes": 30
        });
        intervention_advance_step(advance_req, session_token.clone(), state.clone())
            .await
            .unwrap();
    }

    // Finalize with photos and notes
    let finalize_req = FinalizeInterventionRequest {
        intervention_id: intervention.id,
        collected_data: Some(json!({"temperature": 25.5, "pressure": 101.3})),
        photos: Some(vec![
            "/test/path/photo1.jpg".to_string(),
            "/test/path/photo2.jpg".to_string(),
        ]),
        customer_satisfaction: Some(5),
        quality_score: Some(5),
        final_observations: Some(vec!["All systems operational".to_string()]),
        customer_signature: None,
        customer_comments: Some("Great service".to_string()),
    };

    let result = intervention_finalize(finalize_req, session_token, state).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());

    let finalized_intervention: Intervention =
        serde_json::from_value(response.data.unwrap()).unwrap();
    assert_eq!(finalized_intervention.status, "Completed");
    assert!(finalized_intervention.completed_at.is_some());
}

#[tokio::test]
async fn test_intervention_finalize_incomplete() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test task
    let client_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "name": "Test Client",
            "address": "123 Test St",
            "phone": "555-0123",
            "email": "client@test.com"
        }
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(
        rpma_ppf_intervention::commands::ClientCrudRequest {
            action: rpma_ppf_intervention::commands::ClientAction::Create {
                data: rpma_ppf_intervention::commands::CreateClientRequest {
                    name: "Test Client".to_string(),
                    email: Some("client@test.com".to_string()),
                    phone: Some("555-0123".to_string()),
                    customer_type: None,
                    address_street: Some("123 Test St".to_string()),
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
            },
            session_token: session_token.clone(),
        },
    )
    .await
    .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    let technician = create_test_technician(&ctx).await;

    // Create task for the client
    let task_req = json!({
        "action": "Create",
        "session_token": session_token.clone(),
        "data": {
            "title": "Test Task",
            "description": "Test Description",
            "client_id": client_id,
            "priority": "Normal",
            "status": "Pending",
            "ppf_zone": "ZONE-001",
            "assigned_technician_id": technician.id
        }
    });
    let task_response =
        rpma_ppf_intervention::commands::task_crud(task_req["data"].clone(), session_token.clone())
            .await
            .unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();

    // Start intervention
    let start_req = StartInterventionRequest {
        task_id: task.id,
        intervention_type: "Maintenance".to_string(),
        priority: "Normal".to_string(),
        description: Some("Test intervention".to_string()),
        estimated_duration_minutes: Some(120),
    };

    let intervention_response = intervention_start(start_req, session_token.clone(), state.clone())
        .await
        .unwrap();
    let intervention: Intervention =
        serde_json::from_value(intervention_response.data.unwrap()).unwrap();

    // Try to finalize without completing required steps
    let finalize_req = FinalizeInterventionRequest {
        intervention_id: intervention.id,
        collected_data: None,
        photos: Some(vec![]),
        customer_satisfaction: None,
        quality_score: None,
        final_observations: None,
        customer_signature: None,
        customer_comments: None,
    };

    let result = intervention_finalize(finalize_req, session_token, state).await;

    // Should fail because required steps not completed
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.is_some());
    assert!(
        response
            .error
            .unwrap()
            .message
            .to_lowercase()
            .contains("not all required steps")
            || response
                .error
                .unwrap()
                .message
                .to_lowercase()
                .contains("incomplete")
    );
}
