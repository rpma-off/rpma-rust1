//! Tests for intervention workflow command handlers
//! 
//! These tests verify that intervention IPC commands work correctly,
//! including workflow transitions, step progression, and data collection.

use super::*;
use rpma_ppf_intervention::commands::{intervention_start, intervention_finalize, intervention_get_progress, intervention_advance_step};
use rpma_ppf_intervention::models::{Intervention, CreateInterventionRequest, InterventionStep, ApiResponse};
use serde_json::json;

#[tokio::test]
async fn test_intervention_start_valid() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Create test client
    let client_req = json!({
        "name": "Test Client",
        "address": "123 Test St",
        "phone": "555-0123",
        "email": "client@test.com"
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req, session_token.clone()).await.unwrap();
    let client: Client = serde_json::from_value(client_response.data.unwrap()).unwrap();
    
    // Create test technician
    let technician = create_test_technician(&ctx).await;
    
    // Create intervention start request
    let start_req = json!({
        "client_id": client.id,
        "technician_id": technician.id,
        "intervention_type": "Maintenance",
        "description": "Test intervention",
        "scheduled_date": chrono::Utc::now().date_naive().to_string(),
        "estimated_duration": 120
    });
    
    let result = intervention_start(start_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    let intervention: Intervention = serde_json::from_value(response.data.unwrap()).unwrap();
    assert_eq!(intervention.client_id, client.id);
    assert_eq!(intervention.technician_id, technician.id);
    assert_eq!(intervention.status, "InProgress");
    assert!(intervention.id > 0);
}

#[tokio::test]
async fn test_intervention_start_no_duplicate() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Create test client
    let client_req = json!({
        "name": "Test Client",
        "address": "123 Test St",
        "phone": "555-0123",
        "email": "client@test.com"
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req, session_token.clone()).await.unwrap();
    let client: Client = serde_json::from_value(client_response.data.unwrap()).unwrap();
    
    // Create test technician
    let technician = create_test_technician(&ctx).await;
    
    // Start first intervention
    let start_req = json!({
        "client_id": client.id,
        "technician_id": technician.id,
        "intervention_type": "Maintenance",
        "description": "Test intervention 1",
        "scheduled_date": chrono::Utc::now().date_naive().to_string()
    });
    
    let first_result = intervention_start(start_req, session_token.clone()).await;
    assert!(first_result.unwrap().success);
    
    // Try to start second intervention for same client (should fail if there's already an active one)
    let second_req = json!({
        "client_id": client.id,
        "technician_id": technician.id,
        "intervention_type": "Maintenance",
        "description": "Test intervention 2",
        "scheduled_date": chrono::Utc::now().date_naive().to_string()
    });
    
    let second_result = intervention_start(second_req, session_token).await;
    
    // Should fail due to duplicate active intervention
    assert!(!second_result.unwrap().success);
}

#[tokio::test]
async fn test_intervention_advance_step() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Create test client and technician
    let client_req = json!({
        "name": "Test Client",
        "address": "123 Test St",
        "phone": "555-0123",
        "email": "client@test.com"
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req, session_token.clone()).await.unwrap();
    let client: Client = serde_json::from_value(client_response.data.unwrap()).unwrap();
    
    let technician = create_test_technician(&ctx).await;
    
    // Start intervention
    let start_req = json!({
        "client_id": client.id,
        "technician_id": technician.id,
        "intervention_type": "Maintenance",
        "description": "Test intervention",
        "scheduled_date": chrono::Utc::now().date_naive().to_string()
    });
    
    let intervention_response = intervention_start(start_req, session_token.clone()).await.unwrap();
    let intervention: Intervention = serde_json::from_value(intervention_response.data.unwrap()).unwrap();
    
    // Advance to first step
    let advance_req = json!({
        "intervention_id": intervention.id,
        "step_id": 1,
        "notes": "Step 1 completed successfully",
        "duration_minutes": 30
    });
    
    let result = intervention_advance_step(advance_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
}

#[tokio::test]
async fn test_intervention_advance_step_invalid_transition() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Try to advance step for non-existent intervention
    let advance_req = json!({
        "intervention_id": 99999,
        "step_id": 1,
        "notes": "This should fail",
        "duration_minutes": 30
    });
    
    let result = intervention_advance_step(advance_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.unwrap().contains("not found"));
}

#[tokio::test]
async fn test_intervention_get_progress() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Create test client and technician
    let client_req = json!({
        "name": "Test Client",
        "address": "123 Test St",
        "phone": "555-0123",
        "email": "client@test.com"
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req, session_token.clone()).await.unwrap();
    let client: Client = serde_json::from_value(client_response.data.unwrap()).unwrap();
    
    let technician = create_test_technician(&ctx).await;
    
    // Start intervention
    let start_req = json!({
        "client_id": client.id,
        "technician_id": technician.id,
        "intervention_type": "Maintenance",
        "description": "Test intervention",
        "scheduled_date": chrono::Utc::now().date_naive().to_string()
    });
    
    let intervention_response = intervention_start(start_req, session_token.clone()).await.unwrap();
    let intervention: Intervention = serde_json::from_value(intervention_response.data.unwrap()).unwrap();
    
    // Get progress
    let result = intervention_get_progress(json!({"id": intervention.id}), session_token).await;
    
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
    let session_token = create_test_session(&ctx).await;
    
    // Create test client and technician
    let client_req = json!({
        "name": "Test Client",
        "address": "123 Test St",
        "phone": "555-0123",
        "email": "client@test.com"
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req, session_token.clone()).await.unwrap();
    let client: Client = serde_json::from_value(client_response.data.unwrap()).unwrap();
    
    let technician = create_test_technician(&ctx).await;
    
    // Start intervention
    let start_req = json!({
        "client_id": client.id,
        "technician_id": technician.id,
        "intervention_type": "Maintenance",
        "description": "Test intervention",
        "scheduled_date": chrono::Utc::now().date_naive().to_string()
    });
    
    let intervention_response = intervention_start(start_req, session_token.clone()).await.unwrap();
    let intervention: Intervention = serde_json::from_value(intervention_response.data.unwrap()).unwrap();
    
    // Complete some steps first
    for step_id in 1..=2 {
        let advance_req = json!({
            "intervention_id": intervention.id,
            "step_id": step_id,
            "notes": &format!("Step {} completed", step_id),
            "duration_minutes": 30
        });
        intervention_advance_step(advance_req, session_token.clone()).await.unwrap();
    }
    
    // Finalize with photos and notes
    let finalize_req = json!({
        "intervention_id": intervention.id,
        "final_notes": "Intervention completed successfully",
        "photos": [
            {
                "path": "/test/path/photo1.jpg",
                "caption": "Before work",
                "taken_at": chrono::Utc::now().timestamp()
            },
            {
                "path": "/test/path/photo2.jpg",
                "caption": "After work",
                "taken_at": chrono::Utc::now().timestamp()
            }
        ],
        "materials_used": [
            {
                "material_id": 1,
                "quantity": 5,
                "unit": "units"
            }
        ]
    });
    
    let result = intervention_finalize(finalize_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    let finalized_intervention: Intervention = serde_json::from_value(response.data.unwrap()).unwrap();
    assert_eq!(finalized_intervention.status, "Completed");
    assert!(finalized_intervention.completed_at.is_some());
}

#[tokio::test]
async fn test_intervention_finalize_incomplete() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Create test client and technician
    let client_req = json!({
        "name": "Test Client",
        "address": "123 Test St",
        "phone": "555-0123",
        "email": "client@test.com"
    });
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req, session_token.clone()).await.unwrap();
    let client: Client = serde_json::from_value(client_response.data.unwrap()).unwrap();
    
    let technician = create_test_technician(&ctx).await;
    
    // Start intervention
    let start_req = json!({
        "client_id": client.id,
        "technician_id": technician.id,
        "intervention_type": "Maintenance",
        "description": "Test intervention",
        "scheduled_date": chrono::Utc::now().date_naive().to_string()
    });
    
    let intervention_response = intervention_start(start_req, session_token.clone()).await.unwrap();
    let intervention: Intervention = serde_json::from_value(intervention_response.data.unwrap()).unwrap();
    
    // Try to finalize without completing required steps
    let finalize_req = json!({
        "intervention_id": intervention.id,
        "final_notes": "Finalizing early",
        "photos": []
    });
    
    let result = intervention_finalize(finalize_req, session_token).await;
    
    // Should fail because required steps not completed
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.unwrap().contains("not all required steps"));
}