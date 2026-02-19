//! Tests for task management command handlers
//!
//! These tests verify that task IPC commands work correctly,
//! including CRUD operations, validation, and business logic enforcement.

#![cfg(feature = "legacy-tests")]

use super::*;
use rpma_ppf_intervention::commands::task::check_task_availability;
use rpma_ppf_intervention::commands::task::get_task_statistics;
use rpma_ppf_intervention::commands::task::task_crud;
use rpma_ppf_intervention::commands::task::validate_task_assignment;
use rpma_ppf_intervention::commands::{ApiResponse, AppError};
use rpma_ppf_intervention::models::{
    CreateTaskRequest, Task, TaskPriority, TaskQuery, TaskStatus, UpdateTaskRequest,
};
use serde_json::json;

#[tokio::test]
async fn test_task_create_valid() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test client first
    let client_req = rpma_ppf_intervention::commands::ClientCrudRequest {
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
    };
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req)
        .await
        .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    // Create test technician
    let technician = create_test_technician(&ctx).await;

    // Create task request
    let task_req = CreateTaskRequest {
        title: "Test Task".to_string(),
        description: "Test Description".to_string(),
        client_id: client_id.to_string(),
        priority: TaskPriority::Normal,
        status: TaskStatus::Pending,
        ppf_zone: "ZONE-001".to_string(),
        estimated_duration_hours: Some(2.0),
        scheduled_date: Some(chrono::Utc::now().date_naive()),
        assigned_technician_id: Some(technician.id),
    };

    // Call task create command
    let result = task_crud(task_req, session_token).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());

    let created_task: Task = serde_json::from_value(response.data.unwrap()).unwrap();
    assert_eq!(created_task.title, "Test Task");
    assert_eq!(created_task.client_id, client_id);
    assert_eq!(created_task.assigned_technician_id, Some(technician.id));
    assert!(!created_task.task_number.is_empty());
}

#[tokio::test]
async fn test_task_create_invalid_status_transition() {
    let ctx = create_test_db().await;
    let session_token = create_test_session(&ctx).await;

    // Create test client
    let client_req = rpma_ppf_intervention::commands::ClientCrudRequest {
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
    };
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req)
        .await
        .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    // Try to create task with completed status (invalid transition)
    let task_req = CreateTaskRequest {
        title: "Invalid Task".to_string(),
        description: "Should fail".to_string(),
        client_id: client_id.to_string(),
        priority: TaskPriority::Normal,
        status: TaskStatus::Completed, // Invalid for new task
        ppf_zone: "ZONE-001".to_string(),
        estimated_duration_hours: None,
        scheduled_date: None,
        assigned_technician_id: None,
    };

    let result = task_crud(task_req, session_token).await;

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
            .contains("invalid")
            || response
                .error
                .unwrap()
                .message
                .to_lowercase()
                .contains("transition")
    );
}

#[tokio::test]
async fn test_task_assignment_validation_valid() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create technician
    let technician = create_test_technician(&ctx).await;

    // Validate assignment
    let validate_req = json!({
        "task_id": None::<String>,
        "technician_id": technician.id,
        "date": chrono::Utc::now().date_naive().to_string()
    });

    let result = validate_task_assignment(validate_req, session_token, state).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
}

#[tokio::test]
async fn test_task_assignment_technician_overload() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create technician
    let technician = create_test_technician(&ctx).await;

    // Try to assign when technician is overloaded (assuming max 5 tasks per day)
    for i in 0..7 {
        let client_req = rpma_ppf_intervention::commands::ClientCrudRequest {
            action: rpma_ppf_intervention::commands::ClientAction::Create {
                data: rpma_ppf_intervention::commands::CreateClientRequest {
                    name: format!("Client {}", i),
                    email: Some(format!("client{}@test.com", i)),
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
        };
        let client_response = rpma_ppf_intervention::commands::client_crud(client_req)
            .await
            .unwrap();
        let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

        let task_req = CreateTaskRequest {
            title: "Task".to_string(),
            description: "Description".to_string(),
            client_id: client_id.to_string(),
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: None,
            scheduled_date: Some(chrono::Utc::now().date_naive()),
            assigned_technician_id: Some(technician.id.clone()),
        };

        task_crud(task_req, session_token.clone()).await.ok();
    }

    // Now try to validate one more assignment
    let validate_req = json!({
        "technician_id": technician.id,
        "date": chrono::Utc::now().date_naive().to_string()
    });

    let result = validate_task_assignment(validate_req, session_token, state).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    // Should fail due to technician overload
    assert!(!response.success);
    assert!(response.error.is_some());
    assert!(
        response
            .error
            .unwrap()
            .message
            .to_lowercase()
            .contains("overload")
            || response
                .error
                .unwrap()
                .message
                .to_lowercase()
                .contains("maximum")
    );
}

#[tokio::test]
async fn test_task_availability_check() {
    let ctx = create_test_db().await;
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test client
    let client_req = rpma_ppf_intervention::commands::ClientCrudRequest {
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
    };
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req)
        .await
        .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    // Create a task
    let task_req = CreateTaskRequest {
        title: "Test Task".to_string(),
        description: "Test Description".to_string(),
        client_id: client_id.to_string(),
        priority: TaskPriority::Normal,
        status: TaskStatus::Pending,
        ppf_zone: "ZONE-001".to_string(),
        estimated_duration_hours: None,
        scheduled_date: Some(chrono::Utc::now().date_naive()),
        assigned_technician_id: None,
    };
    let task_response = task_crud(task_req, session_token.clone()).await.unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();

    // Check availability
    let availability_req = json!({
        "task_id": task.id,
        "start_time": chrono::Utc::now().timestamp(),
        "duration_hours": 2.0
    });

    let result = check_task_availability(availability_req, session_token, state).await;

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
    let client_req = rpma_ppf_intervention::commands::ClientCrudRequest {
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
    };
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req)
        .await
        .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    // Create a task
    let task_req = CreateTaskRequest {
        title: "Test Task".to_string(),
        description: "Test Description".to_string(),
        client_id: client_id.to_string(),
        priority: TaskPriority::Normal,
        status: TaskStatus::Pending,
        ppf_zone: "ZONE-001".to_string(),
        estimated_duration_hours: None,
        scheduled_date: None,
        assigned_technician_id: None,
    };
    let task_response = task_crud(task_req, session_token.clone()).await.unwrap();
    let task: Task = serde_json::from_value(task_response.data.unwrap()).unwrap();

    // Update the task
    let update_req = UpdateTaskRequest {
        title: Some("Updated Task Title".to_string()),
        description: Some("Updated Description".to_string()),
        priority: Some(TaskPriority::High),
        status: Some(TaskStatus::InProgress),
        ppf_zone: None,
        estimated_duration_hours: None,
        scheduled_date: None,
        assigned_technician_id: None,
        notes: None,
        materials_needed: None,
    };

    let result = task_crud(
        rpma_ppf_intervention::commands::TaskAction::Update {
            id: task.id,
            data: update_req,
        },
        session_token,
    )
    .await;

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
    let state = ctx.app_state.clone();
    let session_token = create_test_session(&ctx).await;

    // Create test client
    let client_req = rpma_ppf_intervention::commands::ClientCrudRequest {
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
    };
    let client_response = rpma_ppf_intervention::commands::client_crud(client_req)
        .await
        .unwrap();
    let client_id = client_response.data.unwrap()["id"].as_str().unwrap();

    // Create multiple tasks with different statuses
    for (i, status) in [
        TaskStatus::Pending,
        TaskStatus::InProgress,
        TaskStatus::Completed,
    ]
    .iter()
    .enumerate()
    {
        let task_req = CreateTaskRequest {
            title: format!("Task {}", i),
            description: "Description".to_string(),
            client_id: client_id.to_string(),
            priority: TaskPriority::Normal,
            status: status.clone(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: None,
            scheduled_date: None,
            assigned_technician_id: None,
        };
        task_crud(task_req, session_token.clone()).await.unwrap();
    }

    // Get statistics
    let result = get_task_statistics(json!({}), session_token, state).await;

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
