//! Tests for task management command handlers
//! 
//! These tests verify that task IPC commands work correctly,
//! including CRUD operations, validation, and business logic enforcement.

use super::*;
use rpma_ppf_intervention::commands::{task_crud, validate_task_assignment, check_task_availability, get_task_statistics};
use rpma_ppf_intervention::models::{Task, CreateTaskRequest, UpdateTaskRequest, TaskQuery, ApiResponse};
use serde_json::json;

#[tokio::test]
async fn test_task_create_valid() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Create test client first
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
    
    // Create task request
    let task_req = CreateTaskRequest {
        title: "Test Task".to_string(),
        description: "Test Description".to_string(),
        client_id: client.id,
        priority: TaskPriority::Normal,
        status: TaskStatus::Pending,
        ppf_zone: "ZONE-001".to_string(),
        estimated_duration_hours: Some(2.0),
        scheduled_date: Some(chrono::Utc::now().date_naive()),
        assigned_technician_id: Some(technician.id),
    };
    
    // Call task create command
    let result = task_crud(json!(task_req), session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    let created_task: Task = serde_json::from_value(response.data.unwrap()).unwrap();
    assert_eq!(created_task.title, "Test Task");
    assert_eq!(created_task.client_id, client.id);
    assert_eq!(created_task.assigned_technician_id, Some(technician.id));
    assert!(!created_task.task_number.is_empty());
}

#[tokio::test]
async fn test_task_create_invalid_status_transition() {
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
    
    // Try to create task with completed status (invalid transition)
    let task_req = json!({
        "title": "Invalid Task",
        "description": "Should fail",
        "client_id": client.id,
        "priority": "Normal",
        "status": "Completed", // Invalid for new task
        "ppf_zone": "ZONE-001"
    });
    
    let result = task_crud(task_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.unwrap().contains("Invalid status transition"));
}

#[tokio::test]
async fn test_task_assignment_validation_valid() {
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
    
    // Create technician
    let technician = create_test_technician(&ctx).await;
    
    // Validate assignment
    let validate_req = json!({
        "task_id": null,
        "technician_id": technician.id,
        "date": chrono::Utc::now().date_naive().to_string()
    });
    
    let result = validate_task_assignment(validate_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
}

#[tokio::test]
async fn test_task_assignment_technician_overload() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;
    
    // Create technician
    let technician = create_test_technician(&ctx).await;
    
    // Try to assign when technician is overloaded (assuming max 5 tasks per day)
    for _ in 0..7 {
        let client_req = json!({
            "name": &format!("Client {}", rand::random::<u32>()),
            "address": "123 Test St",
            "phone": "555-0123",
            "email": "client@test.com"
        });
        let client_response = rpma_ppf_intervention::commands::client_crud(client_req, session_token.clone()).await.unwrap();
        let client: Client = serde_json::from_value(client_response.data.unwrap()).unwrap();
        
        let task_req = json!({
            "title": "Task",
            "description": "Description",
            "client_id": client.id,
            "priority": "Normal",
            "status": "Pending",
            "ppf_zone": "ZONE-001",
            "assigned_technician_id": technician.id
        });
        
        task_crud(task_req, session_token.clone()).await.ok();
    }
    
    // Now try to validate one more assignment
    let validate_req = json!({
        "technician_id": technician.id,
        "date": chrono::Utc::now().date_naive().to_string()
    });
    
    let result = validate_task_assignment(validate_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    // Should fail due to technician overload
    assert!(!response.success);
}

#[tokio::test]
async fn test_task_availability_check() {
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
    
    // Create a task
    let task_req = json!({
        "title": "Test Task",
        "description": "Test Description",
        "client_id": client.id,
        "priority": "Normal",
        "status": "Pending",
        "ppf_zone": "ZONE-001"
    });
    let task_response = task_crud(task_req, session_token.clone()).await.unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();
    
    // Check availability
    let availability_req = json!({
        "task_id": task.id,
        "start_time": chrono::Utc::now().timestamp(),
        "duration_hours": 2.0
    });
    
    let result = check_task_availability(availability_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
}

#[tokio::test]
async fn test_task_update_valid() {
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
    
    // Create a task
    let task_req = json!({
        "title": "Test Task",
        "description": "Test Description",
        "client_id": client.id,
        "priority": "Normal",
        "status": "Pending",
        "ppf_zone": "ZONE-001"
    });
    let task_response = task_crud(task_req, session_token.clone()).await.unwrap();
    let mut task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();
    
    // Update the task
    let update_req = json!({
        "id": task.id,
        "title": "Updated Task Title",
        "description": "Updated Description",
        "priority": "High",
        "status": "InProgress"
    });
    
    let result = task_crud(update_req, session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    let updated_task: Task = serde_json::from_value(response.data.unwrap()).unwrap();
    assert_eq!(updated_task.title, "Updated Task Title");
    assert_eq!(updated_task.priority, TaskPriority::High);
    assert_eq!(updated_task.status, TaskStatus::InProgress);
}

#[tokio::test]
async fn test_task_statistics() {
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
    
    // Create multiple tasks with different statuses
    for (i, status) in ["Pending", "InProgress", "Completed"].iter().enumerate() {
        let task_req = json!({
            "title": &format!("Task {}", i),
            "description": "Description",
            "client_id": client.id,
            "priority": "Normal",
            "status": status,
            "ppf_zone": "ZONE-001"
        });
        task_crud(task_req, session_token.clone()).await.unwrap();
    }
    
    // Get statistics
    let result = get_task_statistics(json!({}), session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    // Verify statistics contain expected data
    let stats = response.data.unwrap();
    assert!(stats.get("total").is_some());
    assert!(stats.get("by_status").is_some());
    assert!(stats.get("by_priority").is_some());
}